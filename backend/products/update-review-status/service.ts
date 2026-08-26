import { query } from "#root/shared/database/drizzle/db";
import {
  PRODUCT_REVIEW_STATUSES,
  productReview,
} from "#root/shared/database/drizzle/schema";
import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { z } from "zod";

export const updateReviewStatusSchema = z.object({
  reviewId: z.string().uuid(),
  status: z.enum(PRODUCT_REVIEW_STATUSES),
});

/**
 * Moderate one review.
 *
 * "rejected" is a soft state, not a delete: the row stays so an admin can
 * reverse the call, and the public queries filter on `status = "approved"`
 * rather than on the row's existence. Hard removal remains `deleteReview`.
 */
export const updateReviewStatus = (
  input: z.infer<typeof updateReviewStatusSchema>,
) =>
  Effect.gen(function* ($) {
    return yield* $(
      query(async (db) => {
        const updated = await db
          .update(productReview)
          .set({ status: input.status, updatedAt: new Date() })
          .where(eq(productReview.id, input.reviewId))
          .returning({
            id: productReview.id,
            status: productReview.status,
          })
          .execute();

        if (updated.length === 0) {
          return { success: false as const, error: "Review not found" };
        }

        return { success: true as const, review: updated[0] };
      }),
    );
  });
