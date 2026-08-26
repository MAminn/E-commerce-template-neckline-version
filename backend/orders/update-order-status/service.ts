import { query } from "#root/shared/database/drizzle/db";
import { order, orderLog, user } from "#root/shared/database/drizzle/schema";
import { Effect } from "effect";
import { z } from "zod";
import type { ClientSession } from "#root/backend/auth/shared/entities";
import { ServerError } from "#root/shared/error/server";
import { eq } from "drizzle-orm";

export const updateOrderStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum([
    "pending",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ]),
});

export const updateOrderStatus = (
  input: z.infer<typeof updateOrderStatusSchema>,
  session?: ClientSession,
) =>
  Effect.gen(function* ($) {
    if (!session) {
      return yield* $(
        Effect.fail(
          new ServerError({
            tag: "Unauthorized",
            message: "You must be logged in to update order status",
            statusCode: 401,
            clientMessage: "You must be logged in to update order status",
          }),
        ),
      );
    }

    const { orderId, status } = input;
    const isAdmin = session.role === "admin";
    // Vendor role no longer supported
    const isVendor = false;

    // Only admins can update orders
    if (!isAdmin) {
      return yield* $(
        Effect.fail(
          new ServerError({
            tag: "Forbidden",
            message: "Admin access required",
            statusCode: 403,
            clientMessage: "Admin access required",
          }),
        ),
      );
    }

    return yield* $(
      query(async (db) => {
        return await db.transaction(async (tx) => {
          // Get current order data including old status
          const currentOrder = await tx
            .select({ id: order.id, status: order.status })
            .from(order)
            .where(eq(order.id, orderId))
            .execute();

          if (!currentOrder || currentOrder.length === 0) {
            throw new ServerError({
              tag: "OrderNotFound",
              message: `Order with ID ${orderId} not found`,
              statusCode: 404,
              clientMessage: "Order not found",
            });
          }

          const oldStatus = currentOrder[0]?.status || "pending";

          const updateResult = await tx
            .update(order)
            .set({ status })
            .where(eq(order.id, orderId))
            .returning();

          if (!updateResult || updateResult.length === 0) {
            throw new ServerError({
              tag: "UpdateFailed",
              message: "Failed to update order status",
              statusCode: 500,
              clientMessage: "Failed to update order status. Please try again.",
            });
          }

          // Get user ID for logging
          const userData = await tx
            .select({ id: user.id })
            .from(user)
            .where(eq(user.email, session.email))
            .execute();

          // Log the order status change
          await tx.insert(orderLog).values({
            orderId,
            userId: userData[0]?.id,
            action: "status_changed",
            oldStatus,
            newStatus: status,
            note: `Status changed from ${oldStatus} to ${status} by ${session.role}`,
          });

          return updateResult[0];
        });
      }),
    );
  });
