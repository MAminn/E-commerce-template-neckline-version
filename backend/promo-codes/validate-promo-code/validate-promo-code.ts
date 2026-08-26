import type { ClientSession } from "#root/backend/auth/shared/entities";
import { query } from "#root/shared/database/drizzle/db";
import {
  promoCode,
  promoCodeProducts,
  promoCodeCategories,
  product,
} from "#root/shared/database/drizzle/schema";
import { ServerError } from "#root/shared/error/server";
import { Effect } from "effect";
import { z } from "zod";
import { and, eq, gte, lte, inArray, or, isNull, lt } from "drizzle-orm";

const CartItemSchema = z.object({
  id: z.string().uuid(),
  quantity: z.number().min(1),
  price: z.number().min(0),
});

export const validatePromoCodeSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(50)
    .transform((val) => val.toUpperCase()),
  cartItems: z.array(CartItemSchema).optional(),
  subtotal: z.number().min(0).optional(),
});

export type ValidatePromoCodeInput = z.infer<typeof validatePromoCodeSchema>;

export const validatePromoCode = (
  input: ValidatePromoCodeInput,
  session?: ClientSession
) =>
  Effect.gen(function* ($) {
    const now = new Date();

    // Find the promo code by code
    const foundPromoCode = yield* $(
      query(async (db) =>
        db
          .select()
          .from(promoCode)
          .where(eq(promoCode.code, input.code))
          .limit(1)
          .then((res) => res[0])
      )
    );

    if (!foundPromoCode) {
      return yield* $(
        Effect.fail(
          new ServerError({
            tag: "NotFound",
            statusCode: 404,
            clientMessage: "Invalid promo code",
          })
        )
      );
    }

    // Check if the promo code is active
    if (
      foundPromoCode.status !== "active" &&
      foundPromoCode.status !== "scheduled"
    ) {
      return yield* $(
        Effect.fail(
          new ServerError({
            tag: "BadRequest",
            statusCode: 400,
            clientMessage:
              foundPromoCode.status === "expired"
                ? "This promo code has expired"
                : foundPromoCode.status === "exhausted"
                  ? "This promo code has reached its usage limit"
                  : "This promo code is not active",
          })
        )
      );
    }

    // Check if the promo code is within its valid date range
    if (foundPromoCode.startDate && foundPromoCode.startDate > now) {
      return yield* $(
        Effect.fail(
          new ServerError({
            tag: "BadRequest",
            statusCode: 400,
            clientMessage: "This promo code is not yet active",
          })
        )
      );
    }

    if (foundPromoCode.endDate && foundPromoCode.endDate < now) {
      // Auto-update status to expired so admin dashboard reflects reality
      yield* $(
        query((db) =>
          db
            .update(promoCode)
            .set({ status: "expired" })
            .where(eq(promoCode.id, foundPromoCode.id))
        )
      );

      return yield* $(
        Effect.fail(
          new ServerError({
            tag: "BadRequest",
            statusCode: 400,
            clientMessage: "This promo code has expired",
          })
        )
      );
    }

    // Check usage limits
    if (
      foundPromoCode.usageLimit !== null &&
      foundPromoCode.usedCount >= foundPromoCode.usageLimit
    ) {
      return yield* $(
        Effect.fail(
          new ServerError({
            tag: "BadRequest",
            statusCode: 400,
            clientMessage: "This promo code has reached its usage limit",
          })
        )
      );
    }

    // Check if the user has already used this code (if applicable and user is logged in)
    if (session && foundPromoCode.usageLimitPerUser !== null) {
      // Implementation for tracking per-user usage would go here
      // This would require a separate table to track user-promo code usage
    }

    // Check minimum purchase amount if specified
    if (
      foundPromoCode.minPurchaseAmount &&
      input.subtotal &&
      Number(foundPromoCode.minPurchaseAmount) > input.subtotal
    ) {
      return yield* $(
        Effect.fail(
          new ServerError({
            tag: "BadRequest",
            statusCode: 400,
            clientMessage: `This promo code requires a minimum purchase of ${foundPromoCode.minPurchaseAmount} EGP`,
          })
        )
      );
    }

    // Check product applicability if not applicable to all products
    let isApplicable = true;
    if (!foundPromoCode.appliesToAllProducts && input.cartItems) {
      // Get product IDs from cart
      const cartProductIds = input.cartItems.map((item) => item.id);

      // Check if any products are directly applicable
      const applicableProducts = yield* $(
        query((db) =>
          db
            .select()
            .from(promoCodeProducts)
            .where(
              and(
                eq(promoCodeProducts.promoCodeId, foundPromoCode.id),
                inArray(promoCodeProducts.productId, cartProductIds)
              )
            )
        )
      );

      // Get category IDs for the cart products
      const productCategories = yield* $(
        query((db) =>
          db
            .select({ productId: product.id, categoryId: product.categoryId })
            .from(product)
            .where(inArray(product.id, cartProductIds))
        )
      );

      const categoryIds = productCategories
        .map((pc) => pc.categoryId)
        .filter((id): id is string => id !== null);

      // Check if any categories are applicable
      const applicableCategories = yield* $(
        query((db) =>
          db
            .select()
            .from(promoCodeCategories)
            .where(
              and(
                eq(promoCodeCategories.promoCodeId, foundPromoCode.id),
                inArray(promoCodeCategories.categoryId, categoryIds)
              )
            )
        )
      );

      // If no products or categories match, the code is not applicable
      if (
        applicableProducts.length === 0 &&
        applicableCategories.length === 0
      ) {
        isApplicable = false;
      }
    }

    if (!isApplicable) {
      return yield* $(
        Effect.fail(
          new ServerError({
            tag: "BadRequest",
            statusCode: 400,
            clientMessage:
              "This promo code is not applicable to your cart items",
          })
        )
      );
    }

    // Return promo code details if valid
    return {
      id: foundPromoCode.id,
      code: foundPromoCode.code,
      discountType: foundPromoCode.discountType,
      discountValue: Number(foundPromoCode.discountValue),
      appliesToAllProducts: foundPromoCode.appliesToAllProducts,
    };
  });
