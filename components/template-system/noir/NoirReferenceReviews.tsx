import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, ChevronLeft, ChevronRight, Star } from "lucide-react";
import type { HomepageContent } from "#root/shared/types/homepage-content";
import { trpc } from "#root/shared/trpc/client";
import { useMinimalI18n } from "#root/lib/i18n/MinimalI18nContext";
import { Link } from "#root/components/utils/Link";
import { cn } from "#root/lib/utils";
import {
  NoirReferenceReviewCard,
  type NoirReviewItem,
} from "./NoirReferenceReviewCard";
import {
  NOIR_DISPLAY_FONT_CLASSES,
  NOIR_TEXT_SECONDARY_CLASSES,
} from "./noir-tokens";

/**
 * Noir-only fallback copy. Kept out of DEFAULT_HOMEPAGE_CONTENT because that
 * object is shared with the other four templates.
 */
const NOIR_REVIEWS_TITLE = {
  en: "Real people. Real results.",
  ar: "أشخاص حقيقيون. نتائج حقيقية.",
};
const NOIR_REVIEWS_SUBTITLE = {
  en: "See why thousands choose us for compliments that last.",
  ar: "اكتشف لماذا يختارنا الآلاف للحصول على إطراءات تدوم.",
};
const NOIR_REVIEWS_CTA = { en: "Read All Reviews", ar: "اقرأ كل التقييمات" };
const NOIR_REVIEWS_VERIFIED = { en: "Verified", ar: "موثّق" };

/**
 * How many cards the wall aims to show — and therefore how many approved
 * reviews it pulls. Approved reviews fill these slots first; CMS
 * testimonials pad whatever is left over.
 */
const REVIEW_DISPLAY_COUNT = 12;

interface NoirReferenceReviewsProps {
  testimonials: HomepageContent["testimonials"];
}

/** Summary stars — supports a half star, which the reference's 4.62 needs. */
function NoirSummaryStars({ rating }: { rating: number }) {
  return (
    <div className='flex items-center gap-1' aria-hidden='true'>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, rating - (i - 1)));
        return (
          <span key={i} className='relative inline-flex'>
            <Star
              className='size-4.5 fill-transparent text-white/30'
              strokeWidth={1.5}
            />
            {fill > 0 && (
              // A clipped overlay rather than a separate half-star glyph, so
              // any fraction renders correctly — 4.62 puts 62% of the fifth
              // star's width in white.
              <span
                className='absolute inset-0 overflow-hidden'
                style={{ width: `${fill * 100}%` }}>
                <Star
                  className='size-4.5 fill-white text-white'
                  strokeWidth={1.5}
                />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

/**
 * NoirReferenceReviews — the Noir review wall.
 *
 * ── Data ────────────────────────────────────────────────────────────────
 * Approved product reviews FIRST, CMS testimonials PADDING the remainder.
 * The public endpoint (`product.getApprovedReviews`) filters on
 * `status = "approved"` server-side, so a pending or rejected review can
 * never reach this component regardless of what it asks for.
 *
 * This is deliberately not an all-or-nothing swap. Under the previous rule
 * the first approved review replaced the merchant's entire curated row, so
 * a designed twelve-card wall collapsed to a single card the moment one
 * review was approved. Now real reviews lead and CMS items fill the row out
 * to REVIEW_DISPLAY_COUNT, so the section keeps its density while genuine
 * reviews accumulate — and once there are enough real ones, the CMS padding
 * drops away on its own.
 *
 * The fallback still matters at zero: a new store has no approved reviews,
 * and the section must not collapse to an empty band on its landing page.
 *
 * ── Summary row ─────────────────────────────────────────────────────────
 * Average and count are the REAL aggregate over every approved review, not
 * over the dozen cards displayed. `ratingOverride` / `reviewCountOverride`
 * let a store that aggregates ratings off-site show that figure instead.
 */
export function NoirReferenceReviews({
  testimonials,
}: NoirReferenceReviewsProps) {
  const { locale } = useMinimalI18n();
  const isAr = locale === "ar";

  const [reviews, setReviews] = useState<NoirReviewItem[]>([]);
  const [aggregate, setAggregate] = useState<{
    average: number;
    total: number;
  } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [canScrollStart, setCanScrollStart] = useState(false);
  const [canScrollEnd, setCanScrollEnd] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await trpc.product.getApprovedReviews.query({
          limit: REVIEW_DISPLAY_COUNT,
        });
        if (cancelled || !result.success || !result.result) return;
        const { reviews: rows, averageRating, totalReviews } = result.result;
        setReviews(
          rows.map(
            (r: {
              id: string;
              comment: string;
              rating: number;
              userName: string;
              productName: string | null;
              mediaUrl: string | null;
            }): NoirReviewItem => ({
              id: r.id,
              quote: r.comment,
              rating: r.rating,
              name: r.userName,
              productLabel: r.productName,
              mediaUrl: r.mediaUrl,
              // A row only reaches this component after an admin approved
              // it, so every real review carries the verified tick. CMS
              // testimonials set it per item in the Homepage editor.
              verified: true,
            }),
          ),
        );
        setAggregate({ average: averageRating, total: totalReviews });
      } catch (err) {
        // A failed fetch must not blank the section — the CMS fallback below
        // still renders.
        console.error("Error loading Noir reviews:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // CMS testimonials, normalised to the same card shape as a real review —
  // media and product label included, so a merchant can reproduce the full
  // reference layout from the Homepage editor before a single product review
  // has been approved.
  const cmsItems = useMemo<NoirReviewItem[]>(() => {
    const items = testimonials?.items ?? [];
    return items.map((item, i) => ({
      id: `cms-${i}`,
      quote: (isAr && item.reviewAr ? item.reviewAr : item.review) || "",
      rating: Number(item.rating) || 5,
      name: (isAr && item.nameAr ? item.nameAr : item.name) || "",
      productLabel:
        (isAr && item.productLabelAr
          ? item.productLabelAr
          : item.productLabel) || null,
      mediaUrl: item.mediaUrl || null,
      mediaType: item.mediaType,
      verified: item.verified ?? false,
    }));
  }, [testimonials, isAr]);

  const usingRealReviews = reviews.length > 0;

  /**
   * Approved reviews first, CMS testimonials padding the rest of the row.
   * Slicing rather than concatenating everything keeps the row at its
   * designed length instead of growing to reviews + all CMS items.
   */
  const items = useMemo<NoirReviewItem[]>(() => {
    if (reviews.length >= REVIEW_DISPLAY_COUNT) return reviews;
    return [
      ...reviews,
      ...cmsItems.slice(0, REVIEW_DISPLAY_COUNT - reviews.length),
    ];
  }, [reviews, cmsItems]);

  const syncArrows = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    // `Math.abs` because scrollLeft runs negative in RTL.
    const left = Math.abs(el.scrollLeft);
    setCanScrollStart(left > 4);
    setCanScrollEnd(left + el.clientWidth < el.scrollWidth - 4);
  }, []);

  // `items.length` below is a deliberate re-run trigger, not a value this
  // effect reads. The arrow state depends on the scroller's scrollWidth,
  // which only changes when the number of cards does; without it the arrows
  // stay disabled after the fetched reviews replace the CMS fallback.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run trigger, see above
  useEffect(() => {
    syncArrows();
    const el = scroller.current;
    if (!el) return;
    el.addEventListener("scroll", syncArrows, { passive: true });
    window.addEventListener("resize", syncArrows);
    return () => {
      el.removeEventListener("scroll", syncArrows);
      window.removeEventListener("resize", syncArrows);
    };
  }, [syncArrows, items.length]);

  const scrollByCard = (direction: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 16 : el.clientWidth * 0.8;
    el.scrollBy({
      left: direction * step * (isAr ? -1 : 1),
      behavior: "smooth",
    });
  };

  if (!testimonials?.enabled) return null;
  if (items.length === 0) return null;

  const title =
    (isAr && testimonials.titleAr ? testimonials.titleAr : testimonials.title) ||
    (isAr ? NOIR_REVIEWS_TITLE.ar : NOIR_REVIEWS_TITLE.en);
  const subtitle =
    (isAr && testimonials.subtitleAr
      ? testimonials.subtitleAr
      : testimonials.subtitle) ||
    (isAr ? NOIR_REVIEWS_SUBTITLE.ar : NOIR_REVIEWS_SUBTITLE.en);
  const ctaText =
    testimonials.ctaText || (isAr ? NOIR_REVIEWS_CTA.ar : NOIR_REVIEWS_CTA.en);
  const ctaLink = testimonials.ctaLink || "/shop";

  // Summary figures describe the REAL reviews whenever any exist — the
  // count is a trust signal, and padding it with CMS testimonials would
  // inflate it into a claim the store cannot back. With one approved review
  // the row therefore reads "1 Review" above a padded row of cards; a
  // merchant who aggregates ratings off-site can override both figures.
  //
  // The aggregate is used ONLY when real reviews exist. Reading it
  // unconditionally reported "0.00 / 0 Reviews" above a row of CMS
  // testimonials, because a store with no approved reviews yet gets a
  // perfectly successful response whose average and count are zero — and zero
  // is not nullish, so it won a `??` chain against the CMS figures.
  const average =
    testimonials.ratingOverride ??
    (usingRealReviews && aggregate
      ? aggregate.average
      : items.reduce((sum, i) => sum + i.rating, 0) / items.length);
  const total =
    testimonials.reviewCountOverride ??
    (usingRealReviews && aggregate ? aggregate.total : items.length);

  return (
    <section
      id='reviews'
      data-noir-section='reviews'
      className='relative overflow-hidden py-20 md:py-28'>
      {/* Centre spotlight — the only relief on an otherwise black ground. */}
      <div
        className='pointer-events-none absolute start-1/2 top-1/3 aspect-square w-[70vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl'
        style={{
          background:
            "radial-gradient(circle, rgba(255,246,238,0.05) 0%, rgba(232,17,45,0.03) 45%, transparent 70%)",
        }}
        aria-hidden='true'
      />

      <div className='relative mx-auto max-w-6xl px-4 md:px-8'>
        {/* ── Header ── */}
        <div className='flex flex-col items-center text-center'>
          <h2
            className={cn(
              "max-w-3xl text-3xl uppercase font-bold leading-[1.06] text-white md:text-5xl",
              isAr ? "" : "tracking-[0.01em]",
              NOIR_DISPLAY_FONT_CLASSES,
            )}>
            {title}
          </h2>

          {subtitle && (
            <p
              className={cn(
                "mt-4 max-w-xl text-sm leading-relaxed md:text-base",
                NOIR_TEXT_SECONDARY_CLASSES,
              )}>
              {subtitle}
            </p>
          )}

          {/* ── Rating summary row ── */}
          <div className='mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm'>
            <div className='flex items-center gap-3'>
              <NoirSummaryStars rating={average} />
              <span className='font-semibold text-white'>
                {average.toFixed(2)}
              </span>
              <span aria-hidden='true' className='text-white/30'>
                •
              </span>
              <span className='text-white/75'>
                {total.toLocaleString(isAr ? "ar" : "en-US")}{" "}
                {isAr ? "تقييم" : total === 1 ? "Review" : "Reviews"}
              </span>
            </div>

            <span
              aria-hidden='true'
              className='hidden h-5 w-px bg-white/15 sm:block'
            />

            <div className='flex items-center gap-2'>
              <BadgeCheck
                className='size-5 fill-[#E8112D] text-black'
                strokeWidth={1.75}
                aria-hidden='true'
              />
              <span className='text-white/80'>
                {isAr ? NOIR_REVIEWS_VERIFIED.ar : NOIR_REVIEWS_VERIFIED.en}
              </span>
            </div>
          </div>
        </div>

        {/* ── Card row ── */}
        <div className='relative mt-10 md:mt-12'>
          {/* Arrows sit OUTSIDE the row, as in the reference. They are hidden
              below xl, where there is no room beside the cards and the row is
              swipeable anyway. */}
          <button
            type='button'
            onClick={() => scrollByCard(-1)}
            disabled={!canScrollStart}
            aria-label={isAr ? "السابق" : "Previous reviews"}
            className={cn(
              "absolute -start-12 top-1/2 hidden -translate-y-1/2 xl:flex",
              "size-10 items-center justify-center rounded-full text-white",
              "transition-opacity duration-300 hover:text-[#E8112D]",
              canScrollStart ? "opacity-100" : "pointer-events-none opacity-25",
            )}>
            <ChevronLeft className='size-7 rtl:rotate-180' strokeWidth={1.5} />
          </button>

          <div
            ref={scroller}
            className={cn(
              "flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2",
              "scrollbar-hide -mx-4 px-4 md:-mx-8 md:px-8",
              // The row stays a scroller at every width so the arrows keep
              // working when there are more than four approved reviews; the
              // card width is what makes exactly four fill the row on lg.
              "lg:mx-0 lg:px-0",
            )}>
            {items.map((item) => (
              <NoirReferenceReviewCard
                key={item.id}
                item={item}
                className={cn(
                  "w-[76vw] shrink-0 snap-center",
                  "sm:w-[46vw] lg:w-[calc((100%-3rem)/4)]",
                )}
              />
            ))}
          </div>

          <button
            type='button'
            onClick={() => scrollByCard(1)}
            disabled={!canScrollEnd}
            aria-label={isAr ? "التالي" : "Next reviews"}
            className={cn(
              "absolute -end-12 top-1/2 hidden -translate-y-1/2 xl:flex",
              "size-10 items-center justify-center rounded-full text-white",
              "transition-opacity duration-300 hover:text-[#E8112D]",
              canScrollEnd ? "opacity-100" : "pointer-events-none opacity-25",
            )}>
            <ChevronRight className='size-7 rtl:rotate-180' strokeWidth={1.5} />
          </button>
        </div>

        {/* ── Bottom CTA ── */}
        <div className='mt-10 flex justify-center md:mt-12'>
          <Link
            href={ctaLink}
            className={cn(
              "inline-flex items-center justify-center px-10 py-4",
              "border border-white/20 bg-transparent rounded-none",
              "text-xs uppercase text-[#E8112D]",
              "transition-all duration-300 hover:border-[#E8112D] hover:bg-[#E8112D] hover:text-white",
              isAr ? "" : "tracking-[0.2em]",
              NOIR_DISPLAY_FONT_CLASSES,
            )}>
            {ctaText}
          </Link>
        </div>
      </div>
    </section>
  );
}

NoirReferenceReviews.displayName = "NoirReferenceReviews";
