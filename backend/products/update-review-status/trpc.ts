import {
  runBackendEffect,
  serializeBackendEffectResult,
} from "#root/shared/backend/effect";
import { adminProcedure, provideDatabase } from "#root/shared/trpc/server";
import { updateReviewStatus, updateReviewStatusSchema } from "./service";

export const updateReviewStatusProcedure = adminProcedure
  .input(updateReviewStatusSchema)
  .mutation(async ({ ctx, input }) => {
    return await runBackendEffect(
      updateReviewStatus(input).pipe(provideDatabase(ctx)),
    ).then(serializeBackendEffectResult);
  });
