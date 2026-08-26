import { query } from "#root/shared/database/drizzle/db";
import {
  PRODUCT_REVIEW_STATUSES,
  product,
  productReview,
} from "#root/shared/database/drizzle/schema";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { Effect } from "effect";
import { z } from "zod";

export const viewReviewsSchema = z.object({
  productId: z.string().uuid(),
});

/**
 * PUBLIC per-product reviews — APPROVED ONLY.
 *
 * The status filter lives here rather than in the caller so no public surface
 * can accidentally leak a pending or rejected review by forgetting it. The
 * average and count are computed from the same filtered set, so a product's
 * published rating never includes unmoderated reviews.
 */
export const viewReviews = (input: z.infer<typeof viewReviewsSchema>) =>
  Effect.gen(function* ($) {
    return yield* $(
      query(async (db) => {
        const reviews = await db
          .select({
            id: productReview.id,
            productId: productReview.productId,
            userId: productReview.userId,
            userName: productReview.userName,
            rating: productReview.rating,
            comment: productReview.comment,
            mediaUrl: productReview.mediaUrl,
            createdAt: productReview.createdAt,
          })
          .from(productReview)
          .where(
            and(
              eq(productReview.productId, input.productId),
              eq(productReview.status, "approved"),
            ),
          )
          .orderBy(desc(productReview.createdAt))
          .execute();

        const avgRating =
          reviews.length > 0
            ? reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviews.length
            : 0;

        return {
          reviews,
          averageRating: Number.parseFloat(avgRating.toFixed(1)),
          totalReviews: reviews.length,
        };
      }),
    );
  });

/** List all reviews across all products (for admin dashboard) */
export const viewAllReviewsSchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
  /** Omit for every status. */
  status: z.enum(PRODUCT_REVIEW_STATUSES).optional(),
});

/** ADMIN list — every status, so moderation can see what is waiting. */
export const viewAllReviews = (input: z.infer<typeof viewAllReviewsSchema>) =>
  Effect.gen(function* ($) {
    return yield* $(
      query(async (db) => {
        const rows = db
          .select({
            id: productReview.id,
            productId: productReview.productId,
            productName: product.name,
            userId: productReview.userId,
            userName: productReview.userName,
            rating: productReview.rating,
            comment: productReview.comment,
            status: productReview.status,
            mediaUrl: productReview.mediaUrl,
            createdAt: productReview.createdAt,
          })
          .from(productReview)
          .innerJoin(product, eq(productReview.productId, product.id))
          .$dynamic();

        const reviews = await (
          input.status
            ? rows.where(eq(productReview.status, input.status))
            : rows
        )
          .orderBy(desc(productReview.createdAt))
          .limit(input.limit ?? 50)
          .offset(input.offset ?? 0)
          .execute();

        return { reviews };
      }),
    );
  });

/* ------------------------------------------------------------------ */
/*  Storefront review wall                                             */
/* ------------------------------------------------------------------ */

export const viewApprovedReviewsSchema = z.object({
  limit: z.number().int().min(1).max(48).optional(),
  /** Only reviews that carry a photo/video — for media-led layouts. */
  withMediaOnly: z.boolean().optional(),
});

/**
 * PUBLIC cross-product feed of approved reviews, for storefront review
 * sections (the Noir testimonials wall).
 *
 * Distinct from `viewReviews`, which is scoped to one product page. It joins
 * the product so each card can show which scent the review is about, and
 * returns the aggregate over ALL approved reviews — not just the page of
 * items returned — so the summary row reads "890 Reviews" rather than the
 * number of cards that happen to be displayed.
 */
export const viewApprovedReviews = (
  input: z.infer<typeof viewApprovedReviewsSchema>,
) =>
  Effect.gen(function* ($) {
    return yield* $(
      query(async (db) => {
        const base = db
          .select({
            id: productReview.id,
            productId: productReview.productId,
            productName: product.name,
            userName: productReview.userName,
            rating: productReview.rating,
            comment: productReview.comment,
            mediaUrl: productReview.mediaUrl,
            createdAt: productReview.createdAt,
          })
          .from(productReview)
          .innerJoin(product, eq(productReview.productId, product.id))
          .$dynamic();

        const reviews = await base
          .where(
            input.withMediaOnly
              ? and(
                  eq(productReview.status, "approved"),
                  isNotNull(productReview.mediaUrl),
                )
              : eq(productReview.status, "approved"),
          )
          .orderBy(desc(productReview.createdAt))
          .limit(input.limit ?? 12)
          .execute();

        // Aggregate over every approved review, independent of `limit`.
        const all = await db
          .select({ rating: productReview.rating })
          .from(productReview)
          .where(eq(productReview.status, "approved"))
          .execute();

        const averageRating =
          all.length > 0
            ? Number.parseFloat(
                (
                  all.reduce((acc, r) => acc + r.rating, 0) / all.length
                ).toFixed(2),
              )
            : 0;

        return { reviews, averageRating, totalReviews: all.length };
      }),
    );
  });
