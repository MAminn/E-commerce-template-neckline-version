import {
  runBackendEffect,
  serializeBackendEffectResult,
} from "#root/shared/backend/effect";
import { provideDatabase, protectedProcedure } from "#root/shared/trpc/server";
import { Effect } from "effect";
import {
  validatePromoCode,
  validatePromoCodeSchema,
} from "./validate-promo-code";

export const validatePromoCodeProcedure = protectedProcedure
  .input(validatePromoCodeSchema)
  .query(async ({ ctx, input }) => {
    return await runBackendEffect(
      validatePromoCode(input, ctx.clientSession).pipe(provideDatabase(ctx))
    ).then(serializeBackendEffectResult);
  });
