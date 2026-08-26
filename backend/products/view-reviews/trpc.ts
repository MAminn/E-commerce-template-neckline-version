import {
  runBackendEffect,
  serializeBackendEffectResult,
} from "#root/shared/backend/effect";
import { adminProcedure, provideDatabase, publicProcedure } from "#root/shared/trpc/server";
import {
  viewReviews,
  viewReviewsSchema,
  viewAllReviews,
  viewAllReviewsSchema,
  viewApprovedReviews,
  viewApprovedReviewsSchema,
} from "./service";

export const viewReviewsProcedure = publicProcedure
  .input(viewReviewsSchema)
  .query(async ({ ctx, input }) => {
    return await runBackendEffect(
      viewReviews(input).pipe(provideDatabase(ctx))
    ).then(serializeBackendEffectResult);
  });

export const viewAllReviewsProcedure = adminProcedure
  .input(viewAllReviewsSchema)
  .query(async ({ ctx, input }) => {
    return await runBackendEffect(
      viewAllReviews(input).pipe(provideDatabase(ctx))
    ).then(serializeBackendEffectResult);
  });

/** Public cross-product feed for storefront review sections. */
export const viewApprovedReviewsProcedure = publicProcedure
  .input(viewApprovedReviewsSchema)
  .query(async ({ ctx, input }) => {
    return await runBackendEffect(
      viewApprovedReviews(input).pipe(provideDatabase(ctx)),
    ).then(serializeBackendEffectResult);
  });
