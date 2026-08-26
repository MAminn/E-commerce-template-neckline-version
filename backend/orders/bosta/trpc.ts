/**
 * Admin tRPC procedures for Bosta delivery management.
 *
 * All procedures are feature-flagged — they return a clear error if Bosta
 * is not configured, so nothing breaks for stores without the env key.
 */
import {
  adminProcedure,
  publicProcedure,
  provideDatabase,
  t,
} from "#root/shared/trpc/server";
import { runBackendEffect, serializeBackendEffectResult } from "#root/shared/backend/effect";
import { Effect } from "effect";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { query } from "#root/shared/database/drizzle/db";
import { order } from "#root/shared/database/drizzle/schema";
import { ServerError } from "#root/shared/error/server";
import {
  createBostaDelivery,
  cancelBostaDelivery,
  isBostaEnabled,
} from "./service";
import { persistBostaSyncStatus } from "./sync-status";
import { getBostaCheckoutLocations } from "./districts";

function requireBosta() {
  if (!isBostaEnabled()) {
    throw new ServerError({
      tag: "NotConfigured",
      message: "Bosta is not configured (SYN_BOSTA_KEY missing)",
      statusCode: 503,
      clientMessage: "Bosta integration is not enabled for this store",
    });
  }
}

export const bostaRouter = t.router({
  /** Checkout: whether Bosta shipping location pickers should be shown */
  checkoutIsEnabled: publicProcedure.query(() => ({
    enabled: isBostaEnabled(),
  })),

  /** Checkout: city / zone / district tree from Bosta API */
  listShippingLocations: publicProcedure.query(async () => {
    if (!isBostaEnabled()) {
      return { cities: [] };
    }
    const cities = await getBostaCheckoutLocations();
    return { cities };
  }),

  /** Admin: whether Bosta integration is active (for dashboard UI) */
  isEnabled: adminProcedure.query(() => ({
    enabled: isBostaEnabled(),
  })),

  /**
   * Admin: manually push an existing order to Bosta (e.g. if auto-send failed,
   * or for orders placed before the integration was enabled).
   */
  sendOrder: adminProcedure
    .input(z.object({ orderId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return await runBackendEffect(
        Effect.gen(function* ($) {
          requireBosta();

          const orderRow = yield* $(
            query(async (db) => {
              const rows = await db
                .select()
                .from(order)
                .where(eq(order.id, input.orderId))
                .execute();
              return rows[0] ?? null;
            }),
          );

          if (!orderRow) {
            return yield* $(
              Effect.fail(
                new ServerError({
                  tag: "NotFound",
                  statusCode: 404,
                  clientMessage: "Order not found",
                }),
              ),
            );
          }

          if (orderRow.bostaDeliveryId || orderRow.bostaSyncStatus === "sent") {
            return yield* $(
              Effect.fail(
                new ServerError({
                  tag: "AlreadyExists",
                  statusCode: 409,
                  clientMessage: "This order already has a Bosta delivery",
                }),
              ),
            );
          }

          yield* $(Effect.promise(() => persistBostaSyncStatus(input.orderId, "pending")));

          const nameParts = orderRow.customerName.trim().split(/\s+/);
          const firstName = nameParts[0] ?? orderRow.customerName;
          const lastName = nameParts.slice(1).join(" ") || "";

          const isCod = orderRow.paymentMethod === "cod";
          const codAmount = isCod ? Number(orderRow.total) : 0;

          const outcome = yield* $(
            Effect.promise(() =>
              createBostaDelivery({
                orderId: orderRow.id,
                receiver: {
                  firstName,
                  lastName,
                  phone: orderRow.customerPhone,
                },
                dropOffAddress: {
                  firstLine: orderRow.shippingAddress,
                  city: orderRow.shippingCity,
                  zone: orderRow.shippingState ?? undefined,
                },
                cod: codAmount,
                notes: orderRow.notes,
              }),
            ),
          );

          if (!outcome) {
            return yield* $(
              Effect.fail(
                new ServerError({
                  tag: "NotConfigured",
                  statusCode: 503,
                  clientMessage: "Bosta is not configured",
                }),
              ),
            );
          }

          if (!outcome.success) {
            yield* $(
              Effect.promise(() =>
                persistBostaSyncStatus(input.orderId, "failed", {
                  error: outcome.error,
                }),
              ),
            );
            return yield* $(
              Effect.fail(
                new ServerError({
                  tag: "ExternalServiceError",
                  statusCode: 502,
                  clientMessage: outcome.error,
                }),
              ),
            );
          }

          yield* $(
            Effect.promise(() =>
              persistBostaSyncStatus(input.orderId, "sent", {
                delivery: outcome.result,
              }),
            ),
          );

          return {
            deliveryId: outcome.result.deliveryId,
            trackingNumber: outcome.result.trackingNumber,
          };
        }).pipe(provideDatabase(ctx)),
      ).then(serializeBackendEffectResult);
    }),

  /**
   * Admin: cancel a Bosta delivery for an order.
   */
  cancelDelivery: adminProcedure
    .input(z.object({ orderId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return await runBackendEffect(
        Effect.gen(function* ($) {
          requireBosta();

          const orderRow = yield* $(
            query(async (db) => {
              const rows = await db
                .select({ id: order.id, bostaDeliveryId: order.bostaDeliveryId })
                .from(order)
                .where(eq(order.id, input.orderId))
                .execute();
              return rows[0] ?? null;
            }),
          );

          if (!orderRow?.bostaDeliveryId) {
            return yield* $(
              Effect.fail(
                new ServerError({
                  tag: "NotFound",
                  statusCode: 404,
                  clientMessage: "No Bosta delivery found for this order",
                }),
              ),
            );
          }

          const success = yield* $(
            Effect.promise(() => cancelBostaDelivery(orderRow.bostaDeliveryId!)),
          );

          if (!success) {
            yield* $(
              Effect.promise(() =>
                persistBostaSyncStatus(input.orderId, "failed", {
                  error: "Bosta cancel API call failed",
                }),
              ),
            );
            return yield* $(
              Effect.fail(
                new ServerError({
                  tag: "ExternalServiceError",
                  statusCode: 502,
                  clientMessage: "Failed to cancel Bosta delivery — check server logs",
                }),
              ),
            );
          }

          yield* $(
            Effect.promise(() => persistBostaSyncStatus(input.orderId, "cancelled")),
          );

          return { success: true };
        }).pipe(provideDatabase(ctx)),
      ).then(serializeBackendEffectResult);
    }),
});

