import { query } from "#root/shared/database/drizzle/db";
import {
  order,
  orderItem,
  product,
  user,
  type orderStatus,
  promoCode,
  cartOffer,
} from "#root/shared/database/drizzle/schema";
import { and, asc, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { Effect } from "effect";
import { z } from "zod";
import type { ClientSession } from "#root/backend/auth/shared/entities";
import { ServerError } from "#root/shared/error/server";
import { EmailService, renderEmailTemplate } from "#root/shared/email/service";
import { STORE_NAME } from "#root/shared/config/branding";
import { NewOrderEmailTemplate } from "./email-template";
import { MinimalOrderEmailTemplate } from "#root/backend/emails/minimal/order-confirmation";
import { getEmailBranding } from "#root/backend/emails/branding";
import axios from "axios";
import { validatePromoCode } from "#root/backend/promo-codes/validate-promo-code/validate-promo-code";
import { applyOffersToCart } from "#root/backend/offers/service";
import { getStoreOwnerId } from "#root/shared/config/store";
import { getShippingFeeRaw } from "#root/backend/settings/get-shipping-fee";
import { createBostaDelivery, isBostaEnabled } from "#root/backend/orders/bosta/service";
import { persistBostaSyncStatus } from "#root/backend/orders/bosta/sync-status";
import { isFincartEnabled } from "#root/backend/orders/fincart/config";

const OrderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().min(1),
  selectedOptions: z.string().optional(),
});

export const createOrderSchema = z.object({
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(1),
  shippingAddress: z.string().min(1),
  shippingCity: z.string().min(1),
  shippingState: z.string().optional().nullable(),
  shippingPostalCode: z.string().optional().nullable(),
  shippingCountry: z.string().optional().nullable(),
  items: z.array(OrderItemSchema).min(1),
  notes: z.string().optional(),
  promoCodeId: z.string().uuid().optional(),
  paymentMethod: z.enum(["cod", "stripe", "paymob"]).optional().default("cod"),
  /** Bosta district ID from checkout location picker (when Bosta is enabled) */
  bostaDistrictId: z.string().min(1).optional(),
  /** Required when Bosta district is selected — sent as dropOffAddress.buildingNumber */
  buildingNumber: z.string().trim().min(1).optional(),
  /** Required when Bosta district is selected — sent as dropOffAddress.apartment */
  apartment: z.string().trim().min(1).optional(),
}).superRefine((data, ctx) => {
  if (!data.bostaDistrictId) return;
  if (!data.buildingNumber?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Building number is required",
      path: ["buildingNumber"],
    });
  }
  if (!data.apartment?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Apartment number is required",
      path: ["apartment"],
    });
  }
});

// Manually define the insert type matching the schema's nullability
type OrderInsertData = {
  userId: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingState: string | null;
  shippingPostalCode: string | null;
  shippingCountry: string | null;
  subtotal: string;
  shipping: string;
  tax: string;
  total: string;
  status: (typeof orderStatus.enumValues)[number]; // Use enum values type
  notes: string | null;
  promoCodeId: string | null;
  discount: string | null;
  fincartStatus: string | null;
  fincartSubStatus: string | null;
  fincartTrackingNumber: string | null;
  fincartRejectionReason: string | null;
  fincartSupportNote: string | null;
  fincartReturnTrackingNumber: string | null;
  fincartStatusUpdatedDate: Date | null; // Use Date | null for timestamp
  fincartWebhookData: Record<string, unknown> | null; // More specific type for jsonb
  // createdAt is handled by DB default
  updatedAt: Date | null; // Use Date | null for timestamp
};

// Function to send order data to Fincart
interface FincartOrderData {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  shippingCountry: string;
  shippingPostalCode: string;
  subtotal: string | number;
  shipping: string | number;
  total: string | number;
  notes: string | null | undefined;
  items: Array<{
    name?: string;
    quantity: number;
    price: string | number;
  }>;
}

interface FincartResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: unknown;
}

const sendOrderToFincart = async (
  orderData: FincartOrderData,
): Promise<FincartResponse> => {
  if (!isFincartEnabled()) {
    return { success: false, error: "Fincart integration is disabled" };
  }

  try {
    const FINCART_API_URL = process.env.FINCART_API_URL;
    const FINCART_API_KEY = process.env.FINCART_API_KEY;
    const FINCART_MERCHANT_LOCATION = process.env.FINCART_MERCHANT_LOCATION;
    const FINCART_PICKUP_ID = process.env.FINCART_PICKUP_ID;

    console.log(
      `Sending order to Fincart at: ${FINCART_API_URL}/merchant/app/s2s`,
    );
    console.log(`Using merchant location ID: "${FINCART_MERCHANT_LOCATION}"`);
    console.log(`Using pickup ID: "${FINCART_PICKUP_ID}"`);

    if (!FINCART_API_KEY) {
      console.error("FINCART_API_KEY is not set in the environment variables");
      return { success: false, error: "API Key not configured" };
    }

    if (!FINCART_MERCHANT_LOCATION) {
      console.warn("FINCART_MERCHANT_LOCATION is not set, using default value");
    }

    // Construct the API URL for creating orders
    const fincartOrdersEndpoint = `${FINCART_API_URL}/merchant/app/s2s`;

    // Format the data according to Fincart's API requirements
    const payload = {
      merchant_location:
        FINCART_MERCHANT_LOCATION || "67115a8c16713e3eaec19384", // Use merchant_location field name
      _id: FINCART_MERCHANT_LOCATION || "67115a8c16713e3eaec19384",
      city: orderData.shippingCity,
      location: FINCART_MERCHANT_LOCATION || "67115a8c16713e3eaec19384",
      zone: `${orderData.shippingState} - ${orderData.shippingCity}`,
      customer_name: orderData.customerName,
      customer_address: orderData.shippingAddress,
      customer_phone: orderData.customerPhone,
      customer_email: orderData.customerEmail,
      customer_backup_phone: orderData.customerPhone,
      customer_landmark: `Near ${orderData.shippingCity} Center`,
      ref_id: orderData.id.substring(0, 24), // Limit length to match their format
      pickup_id: FINCART_PICKUP_ID || "67115a8c16713e3eaec19384",
      id_default: true,
      desc: `Order #${orderData.id.substring(0, 8)} from ${orderData.customerName}`,
      no_items: orderData.items.reduce(
        (total, item) => total + item.quantity,
        0,
      ),
      weight: orderData.items.length > 0 ? orderData.items.length * 0.5 : 1,
      note:
        orderData.notes ||
        `Order for ${orderData.customerName} in ${orderData.shippingCity}`,
      open_shipment_allowed: false,
      cod: Number.parseFloat(orderData.total.toString()),
      country: "EG",
      merchant_id: FINCART_MERCHANT_LOCATION || "67115a8c16713e3eaec19384", // Add merchant_id field
      coordinates: "30.049683060160454, 31.333328930893973",
      merchant_address: "43 Al Gahez, St, Nasr City, Cairo Governorate 4441452",
      items: orderData.items.map((item) => ({
        name: item.name || "Product",
        quantity: item.quantity,
        price: Number.parseFloat(item.price.toString()),
      })),
    };

    // For debugging, log the exact payload that will be sent
    console.log(
      "Payload being sent to Fincart:",
      JSON.stringify(payload, null, 2),
    );

    // Send the data to Fincart
    const response = await axios.post(fincartOrdersEndpoint, payload, {
      headers: {
        Authorization: FINCART_API_KEY, // Use the API key directly without any formatting
        "Content-Type": "application/json",
      },
      // Set a timeout to prevent long-running requests
      timeout: 10000,
    });

    // Check if the response is HTML (which would indicate we're hitting a website not an API)
    const contentType =
      response?.headers && "content-type" in response.headers
        ? response.headers["content-type"]
        : null;
    if (
      contentType &&
      typeof contentType === "string" &&
      contentType.includes("text/html")
    ) {
      console.error(
        "Received HTML response from Fincart API. This indicates the URL is incorrect and points to a webpage, not an API endpoint.",
      );
      return {
        success: false,
        error: "Received HTML instead of JSON. API URL is likely incorrect.",
      };
    }

    // Log the full response for debugging
    console.log("Full Fincart API response:", {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data,
    });

    // Check if the response indicates success
    if (response.data && response.data.status === "success") {
      console.log("Order sent to Fincart successfully:", response.data);
      return { success: true, data: response.data };
    }

    console.error("Fincart API returned an error:", response.data);
    return {
      success: false,
      error: response.data?.msg || "Unknown error from Fincart API",
    };
  } catch (error) {
    console.error("Failed to send order to Fincart:", error);

    // Provide more detailed error information
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status;
      const responseData = error.response?.data;
      const errorMessage = error.message;

      console.error(`Fincart API error (${statusCode}): ${errorMessage}`);
      if (responseData) {
        console.error("Response data:", responseData);
      }

      return {
        success: false,
        error: {
          statusCode,
          message: errorMessage,
          data: responseData,
        },
      };
    }

    return { success: false, error };
  }
};

// ─── Bosta auto-send helper ───────────────────────────────────────────────────

interface CreatedOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingState?: string | null;
  bostaDistrictId?: string | null;
  buildingNumber?: string | null;
  apartment?: string | null;
  itemsCount?: number;
  total: string | number;
  notes?: string | null;
}

function formatStoredShippingAddress(input: {
  shippingAddress: string;
  buildingNumber?: string | null;
  apartment?: string | null;
}): string {
  const street = input.shippingAddress.trim();
  const parts: string[] = [];
  if (input.buildingNumber?.trim()) {
    parts.push(`Bldg ${input.buildingNumber.trim()}`);
  }
  if (input.apartment?.trim()) {
    parts.push(`Apt ${input.apartment.trim()}`);
  }
  if (parts.length === 0) return street;
  return `${street} (${parts.join(", ")})`;
}

async function autoSendOrderToBosta(orderData: CreatedOrder): Promise<void> {
  if (!isBostaEnabled()) return;

  await persistBostaSyncStatus(orderData.id, "pending");

  const nameParts = orderData.customerName.trim().split(/\s+/);
  const firstName = nameParts[0] ?? orderData.customerName;
  const lastName = nameParts.slice(1).join(" ") || "";

  const outcome = await createBostaDelivery({
    orderId: orderData.id,
    receiver: { firstName, lastName, phone: orderData.customerPhone },
    dropOffAddress: {
      firstLine: orderData.shippingAddress,
      city: orderData.shippingCity,
      zone: orderData.shippingState ?? undefined,
      districtId: orderData.bostaDistrictId ?? undefined,
      buildingNumber: orderData.buildingNumber ?? undefined,
      apartment: orderData.apartment ?? undefined,
    },
    cod: Number(orderData.total),
    notes: orderData.notes,
    itemsCount: orderData.itemsCount,
  });

  if (!outcome) return;

  if (outcome.success) {
    await persistBostaSyncStatus(orderData.id, "sent", {
      delivery: outcome.result,
    });
    console.log(
      `[Order ${orderData.id}] Bosta delivery created — tracking: ${outcome.result.trackingNumber}`,
    );
    return;
  }

  await persistBostaSyncStatus(orderData.id, "failed", {
    error: outcome.error,
  });
}

// ─── Main create-order service ────────────────────────────────────────────────

export const createOrder = (
  input: z.infer<typeof createOrderSchema>,
  session?: ClientSession,
) =>
  Effect.gen(function* ($) {
    // We no longer require a session for ordering
    const result = yield* $(
      query(async (db) => {
        return await db.transaction(async (tx) => {
          // Get user ID if the user is logged in, otherwise set to null
          let userId = null;
          if (session) {
            const userData = await tx
              .select({ id: user.id })
              .from(user)
              .where(eq(user.email, session.email))
              .execute();

            if (userData && userData.length > 0 && userData[0]?.id) {
              userId = userData[0].id;
            }
          }

          const productIds = input.items.map((item) => item.productId);

          // Fetch products (single-shop mode: no vendor data needed)
          const products = await tx
            .select({
              id: product.id,
              price: product.price,
              discountPrice: product.discountPrice,
              name: product.name,
              stock: product.stock,
              hidden: product.hidden,
            })
            .from(product)
            .where(inArray(product.id, productIds))
            .execute();

          if (!products || products.length === 0) {
            throw new ServerError({
              tag: "ProductNotFound",
              message: "No products found for this order",
              statusCode: 404,
              clientMessage: "Products not found",
            });
          }

          for (const item of input.items) {
            const productData = products.find((p) => p.id === item.productId);
            if (!productData) {
              throw new ServerError({
                tag: "ProductNotFound",
                message: `Product with ID ${item.productId} not found`,
                statusCode: 404,
                clientMessage: "Some products in your order could not be found",
              });
            }

            if (productData.hidden) {
              throw new ServerError({
                tag: "ProductNotAvailable",
                message: `Product ${productData.name} is not available`,
                statusCode: 400,
                clientMessage: `${productData.name} is no longer available for purchase`,
              });
            }

            if (productData.stock < item.quantity) {
              throw new ServerError({
                tag: "InsufficientStock",
                message: `Insufficient stock for product ${productData.name}`,
                statusCode: 400,
                clientMessage: `Sorry, there's not enough stock available for ${productData.name}`,
              });
            }
          }

          const subtotal = input.items.reduce((acc, item) => {
            const productData = products.find((p) => p.id === item.productId);
            if (!productData) return acc;

            // Use discount price if available
            const priceToUse = productData.discountPrice
              ? Number.parseFloat(productData.discountPrice.toString())
              : Number.parseFloat(productData.price.toString());

            return acc + priceToUse * item.quantity;
          }, 0);

          const shipping = await getShippingFeeRaw(tx);

          // Check if a promo code is applied
          let discount = 0;
          let promoCodeData = null;

          if (input.promoCodeId) {
            // Get the promo code first to get its code
            promoCodeData = await tx
              .select()
              .from(promoCode)
              .where(eq(promoCode.id, input.promoCodeId))
              .then((res) => res[0]);

            if (promoCodeData) {
              // Convert cart items to the format expected by validatePromoCode
              const cartItems = input.items
                .map((item) => {
                  const productData = products.find(
                    (p) => p.id === item.productId,
                  );
                  if (!productData) return null;
                  return {
                    id: item.productId,
                    quantity: item.quantity,
                    price: Number.parseFloat(productData.price.toString()),
                  };
                })
                .filter(
                  (
                    item,
                  ): item is { id: string; quantity: number; price: number } =>
                    item !== null,
                );

              try {
                // Validate the promo code synchronously from the database directly
                // Instead of trying to use Effect.runPromise inside a transaction
                if (
                  // Current date is between start and end dates (or they're null)
                  (!promoCodeData.startDate ||
                    promoCodeData.startDate <= new Date()) &&
                  (!promoCodeData.endDate ||
                    promoCodeData.endDate >= new Date()) &&
                  // Code is active
                  (promoCodeData.status === "active" ||
                    promoCodeData.status === "scheduled") &&
                  // Usage limits are not exceeded
                  (promoCodeData.usageLimit === null ||
                    promoCodeData.usedCount < promoCodeData.usageLimit) &&
                  // Minimum purchase amount is met
                  (promoCodeData.minPurchaseAmount === null ||
                    Number(promoCodeData.minPurchaseAmount) <= subtotal)
                ) {
                  // Calculate discount based on validated promo code
                  if (promoCodeData.discountType === "percentage") {
                    discount =
                      subtotal * (Number(promoCodeData.discountValue) / 100);
                  } else if (promoCodeData.discountType === "fixed_amount") {
                    discount = Number(promoCodeData.discountValue);
                    // Make sure discount doesn't exceed subtotal
                    if (discount > subtotal) {
                      discount = subtotal;
                    }
                  }

                  // Increment used count for the promo code
                  await tx
                    .update(promoCode)
                    .set({
                      usedCount: promoCodeData.usedCount + 1,
                      // If this was the last use, set status to exhausted
                      status:
                        promoCodeData.usageLimit !== null &&
                        promoCodeData.usedCount + 1 >= promoCodeData.usageLimit
                          ? "exhausted"
                          : promoCodeData.status,
                    })
                    .where(eq(promoCode.id, promoCodeData.id));
                } else {
                  throw new ServerError({
                    tag: "PromoCodeValidationFailed",
                    statusCode: 400,
                    clientMessage:
                      "This promo code is not valid or has expired",
                  });
                }
              } catch (error) {
                console.error("Promo code validation failed:", error);
                throw new ServerError({
                  tag: "PromoCodeValidationFailed",
                  statusCode: 400,
                  clientMessage:
                    error instanceof ServerError
                      ? error.clientMessage
                      : "Invalid promo code",
                });
              }
            }
          }

          // ─── Evaluate automatic cart offers server-side ───────────────────────
          const now = new Date();
          const activeOffers = await tx
            .select()
            .from(cartOffer)
            .where(
              and(
                eq(cartOffer.isActive, true),
                or(isNull(cartOffer.startsAt), lte(cartOffer.startsAt, now)),
                or(isNull(cartOffer.endsAt), gte(cartOffer.endsAt, now)),
              ),
            )
            .orderBy(asc(cartOffer.priority))
            .execute();

          const cartItemsForOffers = input.items
            .map((item) => {
              const p = products.find((prod) => prod.id === item.productId);
              if (!p) return null;
              const price = p.discountPrice
                ? Number.parseFloat(p.discountPrice.toString())
                : Number.parseFloat(p.price.toString());
              return { id: item.productId, name: p.name, quantity: item.quantity, price };
            })
            .filter(
              (i): i is { id: string; name: string; quantity: number; price: number } =>
                i !== null,
            );

          const appliedOffers = applyOffersToCart(activeOffers, cartItemsForOffers, subtotal);
          const offerDiscount = appliedOffers.reduce((s, o) => s + o.discountAmount, 0);
          const hasFreeShippingFromOffer = appliedOffers.some((o) => o.freeShipping);
          const effectiveShipping = hasFreeShippingFromOffer ? 0 : shipping;

          const combinedDiscount = discount + offerDiscount;
          const discountedSubtotal = subtotal - combinedDiscount;
          // Ensure shipping is included in the total (no tax)
          const total = Math.max(0, discountedSubtotal) + effectiveShipping;

          // Only include fields directly provided or calculated
          const isOnlinePayment =
            input.paymentMethod === "stripe" ||
            input.paymentMethod === "paymob";
          const insertData = {
            userId: userId,
            customerName: input.customerName,
            customerEmail: input.customerEmail,
            customerPhone: input.customerPhone,
            shippingAddress: formatStoredShippingAddress({
              shippingAddress: input.shippingAddress,
              buildingNumber: input.buildingNumber,
              apartment: input.apartment,
            }),
            shippingCity: input.shippingCity,
            shippingState: input.shippingState,
            shippingPostalCode: input.shippingPostalCode,
            shippingCountry: input.shippingCountry,
            subtotal: subtotal.toString(),
            discount: combinedDiscount > 0 ? combinedDiscount.toString() : null,
            promoCodeId: input.promoCodeId || null,
            shipping: effectiveShipping.toString(),
            tax: "0",
            total: total.toString(),
            notes: input.notes,
            paymentMethod: input.paymentMethod ?? "cod",
            paymentStatus: isOnlinePayment ? "pending" : "not_required",
          };

          const definedInsertData = Object.fromEntries(
            Object.entries(insertData).filter(([_, v]) => v !== undefined),
          );

          const newOrdersInsert = await tx
            .insert(order)
            // @ts-ignore - Drizzle's insert type inference seems incorrect for nullable fields here
            .values(definedInsertData)
            .returning();

          if (!newOrdersInsert || newOrdersInsert.length === 0) {
            throw new ServerError({
              tag: "OrderCreationFailed",
              message: "Failed to create order",
              statusCode: 500,
              clientMessage: "Failed to create order. Please try again.",
            });
          }

          const newOrder = newOrdersInsert[0];
          if (!newOrder || !newOrder.id) {
            throw new ServerError({
              tag: "OrderCreationFailed",
              message: "Failed to create order - missing ID",
              statusCode: 500,
              clientMessage: "Failed to create order. Please try again.",
            });
          }

          const orderItems = await Promise.all(
            input.items.map(async (item) => {
              const productData = products.find((p) => p.id === item.productId);
              if (!productData) {
                throw new ServerError({
                  tag: "ProductNotFound",
                  message: `Product with ID ${item.productId} not found`,
                  statusCode: 404,
                  clientMessage:
                    "Some products in your order could not be found",
                });
              }

              await tx
                .update(product)
                .set({
                  stock: productData.stock - item.quantity,
                })
                .where(eq(product.id, item.productId));

              const itemName = item.selectedOptions
                ? `${productData.name} (${item.selectedOptions})`
                : productData.name;

              const orderItemInsert = await tx
                .insert(orderItem)
                .values({
                  orderId: newOrder.id,
                  productId: item.productId,
                  vendorId: getStoreOwnerId(), // Single-shop: use default store owner ID
                  quantity: item.quantity,
                  price: productData.price.toString(),
                  discountPrice: productData.discountPrice?.toString() || null,
                  name: itemName,
                  vendorName: null, // Single-shop: no vendor names
                })
                .returning();

              if (!orderItemInsert[0]) {
                throw new ServerError({
                  tag: "OrderItemCreationFailed",
                  message: "Failed to create order item",
                  statusCode: 500,
                  clientMessage:
                    "Failed to create order item. Please try again.",
                });
              }

              return orderItemInsert[0];
            }),
          );

          return {
            ...newOrder,
            items: orderItems,
          };
        });
      }),
    );

    const emailService = yield* $(EmailService);

    const branding = yield* $(Effect.promise(() => getEmailBranding()));

    const orderItems = result.items.map((i) => ({
      name: i.name ?? "-",
      quantity: i.quantity ?? 0,
      price: i.price ? Number.parseFloat(i.price) : 0,
      discountPrice: i.discountPrice
        ? Number.parseFloat(i.discountPrice)
        : undefined,
      vendorName: i.vendorName ?? undefined,
    }));

    const emailTemplate = yield* $(
      renderEmailTemplate(
        branding.isMinimal
          ? MinimalOrderEmailTemplate({
              storeName: branding.storeName,
              logoUrl: branding.logoUrl,
              contactEmail: branding.contactEmail,
              currency: branding.currency,
              items: orderItems,
              shippingFees: Number.parseFloat(result.shipping),
              subTotal: Number.parseFloat(result.subtotal),
              total: Number.parseFloat(result.total),
              address: result.shippingAddress,
              city: result.shippingCity,
              state: result.shippingState,
              country: result.shippingCountry,
              postalCode: result.shippingPostalCode,
              customerName: result.customerName,
              customerEmail: result.customerEmail,
              customerPhone: result.customerPhone,
            })
          : NewOrderEmailTemplate({
              items: orderItems,
              shippingFees: Number.parseFloat(result.shipping),
              subTotal: Number.parseFloat(result.subtotal),
              total: Number.parseFloat(result.total),
              address: result.shippingAddress,
              city: result.shippingCity,
              state: result.shippingState,
              country: result.shippingCountry,
              postalCode: result.shippingPostalCode,
              customerName: result.customerName,
              customerEmail: result.customerEmail,
              customerPhone: result.customerPhone,
            }),
      ),
    );

    const admins = yield* $(
      query(
        async (db) =>
          await db.select().from(user).where(eq(user.role, "admin")),
      ),
    );

    // Send emails, but don't let failures block the order creation
    // Single-shop mode: Only send customer notification, no vendor emails
    try {
      yield* $(
        emailService.sendEmail(
          input.customerEmail,
          `${branding.storeName} Order Confirmation`,
          emailTemplate,
        ),
      );
    } catch (error) {
      console.error(
        `Failed to send confirmation email to customer ${input.customerEmail}:`,
        error,
      );
      // Continue with order creation even if email fails
    }

    // Send admin notifications
    for (const admin of admins) {
      try {
        yield* $(
          emailService.sendEmail(
            admin.email,
            "New Order Received",
            emailTemplate,
          ),
        );
      } catch (error) {
        console.error(
          `Failed to send notification email to admin ${admin.email}:`,
          error,
        );
        // Continue with order creation even if email fails
      }
    }

    // Single-shop mode: No vendor notifications needed

    // Send order to Fincart (opt-in via FINCART_ENABLED=true)
    const isOnlinePaymentOrder =
      input.paymentMethod === "stripe" || input.paymentMethod === "paymob";
    if (isFincartEnabled() && !isOnlinePaymentOrder) {
      try {
        // Use Effect to handle the async operation correctly
        yield* $(Effect.promise(() => sendOrderToFincart(result))).pipe(
          Effect.tap((fincartResult) => {
            if (!fincartResult.success) {
              console.error(
                "Failed to send order to Fincart:",
                fincartResult.error,
              );
            }
          }),
          Effect.catchAll((error) => {
            console.error("Exception when sending order to Fincart:", error);
            return Effect.succeed(undefined);
          }),
        );
      } catch (error) {
        console.error("Exception when sending order to Fincart:", error);
      }
    } else if (isFincartEnabled() && isOnlinePaymentOrder) {
      console.log(
        `[Order ${result.id}] Online payment (${input.paymentMethod}) — Fincart shipment deferred until payment confirmed`,
      );
    }

    // ── Bosta integration (feature-flagged) ──────────────────────────────────
    // Runs only when SYN_BOSTA_KEY is present. Never throws — a failure here
    // does NOT abort order creation.
    if (!isOnlinePaymentOrder) {
      yield* $(
        Effect.promise(async () => {
          try {
            await autoSendOrderToBosta({
              ...result,
              shippingAddress: input.shippingAddress,
              bostaDistrictId: input.bostaDistrictId,
              buildingNumber: input.buildingNumber,
              apartment: input.apartment,
              itemsCount: input.items.reduce((sum, item) => sum + item.quantity, 0),
            });
          } catch (err) {
            console.error("[Bosta] Auto-send failed (order still created):", err);
            if (isBostaEnabled()) {
              await persistBostaSyncStatus(result.id, "failed", {
                error: err instanceof Error ? err.message : String(err),
              });
            }
          }
        }),
      );
    } else if (isBostaEnabled()) {
      yield* $(
        Effect.promise(() =>
          persistBostaSyncStatus(result.id, "skipped", {
            error: "Deferred until online payment is confirmed",
          }),
        ),
      );
    }

    return result;
  });
