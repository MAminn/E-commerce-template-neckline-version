/**
 * Paymob Webhook Handler
 *
 * Handles Paymob transaction callbacks and HMAC-verified webhooks.
 * Registered as a Fastify plugin at /api/webhooks/paymob
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { isPaymobConfigured } from "#root/shared/config/payment";
import { getPublicOrigin } from "#root/shared/config/site-url";
import { verifyPaymobHmac } from "./paymob-service";
import {
  applyOnlinePaymentUpdate,
  extractPaymobOrderId,
} from "./confirm-online-payment";
import { Effect } from "effect";
import { query, DatabaseClientService } from "#root/shared/database/drizzle/db";

export async function paymobWebhookPlugin(fastify: FastifyInstance) {
  // Only register if Paymob is configured
  if (!isPaymobConfigured()) {
    fastify.post("/", async (_req, reply) => {
      return reply.code(404).send({ error: "Paymob is not configured" });
    });
    return;
  }

  fastify.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as Record<string, unknown>;
      const transactionData = (body.obj || body) as Record<string, unknown>;

      // Verify HMAC if present
      const hmac = (request.query as Record<string, string | undefined>)?.hmac || (body.hmac as string | undefined);
      if (hmac) {
        const isValid = verifyPaymobHmac(transactionData, hmac);
        if (!isValid) {
          fastify.log.warn("[Paymob] Invalid HMAC signature");
          return reply.code(401).send({ error: "Invalid HMAC signature" });
        }
      }

      const orderId = extractPaymobOrderId(transactionData);

      if (!orderId) {
        fastify.log.warn(
          `[Paymob] No orderId in webhook data: ${JSON.stringify({
            merchant_order_id: (transactionData.order as Record<string, unknown> | undefined)?.merchant_order_id,
            special_reference: transactionData.special_reference,
          })}`,
        );
        return reply.code(400).send({ error: "Missing orderId" });
      }

      const isSuccess =
        transactionData.success === true || transactionData.success === "true";
      const isPending =
        transactionData.pending === true || transactionData.pending === "true";
      const transactionId = transactionData.id?.toString() ?? null;

      let paymentStatus: "paid" | "failed" | "processing";
      if (isSuccess) {
        paymentStatus = "paid";
      } else if (isPending) {
        paymentStatus = "processing";
      } else {
        paymentStatus = "failed";
      }

      const provideDb = Effect.provideService(DatabaseClientService, request.db);

      await Effect.runPromise(
        query(async (db) => {
          await applyOnlinePaymentUpdate(db, orderId, {
            paymentStatus,
            transactionId,
            gatewayData: transactionData,
          });
        }).pipe(provideDb),
      );

      fastify.log.info(
        `[Paymob] Payment ${paymentStatus} for order ${orderId} (txn: ${transactionId})`,
      );

      return reply.code(200).send({ received: true });
    } catch (error: unknown) {
      fastify.log.error(
        `[Paymob] Webhook error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return reply.code(500).send({
        error: error instanceof Error ? error.message : "Webhook processing failed",
      });
    }
  });

  // Paymob also sends GET callbacks on redirect — handle the redirect URL
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const queryParams = request.query as Record<string, string>;
    const success = queryParams.success === "true";
    const orderId =
      queryParams.merchant_order_id ||
      queryParams.special_reference ||
      queryParams.orderId;

    if (orderId) {
      const baseUrl = getPublicOrigin();
      return reply.redirect(
        `${baseUrl}/order-confirmation?id=${orderId}&payment=${success ? "success" : "failed"}`,
      );
    }

    return reply.redirect("/");
  });
}
