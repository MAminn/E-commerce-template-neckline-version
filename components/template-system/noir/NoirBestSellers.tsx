import type { HomepageFeaturedProductsContent } from "#root/shared/types/homepage-content";
import { ArrowRight } from "lucide-react";
import { Link } from "#root/components/utils/Link";
import { useMinimalI18n } from "#root/lib/i18n/MinimalI18nContext";
import { cn } from "#root/lib/utils";
import { NoirTopProductCard } from "./NoirTopProductCard";
import type { NoirProduct } from "./ProductCardNoir";
import { NOIR_DISPLAY_FONT_CLASSES } from "./noir-tokens";

/** Number of cards the framed row shows (reference: 4-up). */
const TOP_ROW_MAX = 4;

interface NoirBestSellersProps {
  content: HomepageFeaturedProductsContent;
  products?: NoirProduct[];
  isLoading?: boolean;
}

/** Skeleton mirroring NoirTopProductCard's geometry exactly. */
function NoirTopSkeletonCard() {
  return (
    <div className='overflow-hidden rounded-lg border border-white/10 bg-white/4'>
      <div className='aspect-[1.86/1] animate-pulse bg-white/5' />
      <div className='space-y-2.5 px-5 pt-3 pb-4 lg:px-9'>
        <div className='mx-auto h-3 w-2/3 animate-pulse rounded bg-white/5' />
        <div className='mx-auto h-2.5 w-4/5 animate-pulse rounded bg-white/5' />
        <div className='mx-auto h-3.5 w-1/3 animate-pulse rounded bg-white/5' />
        <div className='h-8.5 w-full animate-pulse rounded-md bg-white/5' />
      </div>
    </div>
  );
}

/**
 * NoirBestSellers — the framed top experience's product row.
 *
 * Rebuilt as a dedicated reference layout rather than a wrapper around the
 * generic NoirProductSection: the reference's gutter (~68px), heading scale,
 * underline, card gap and near-flush bottom edge all differ from the shared
 * section's rhythm, and the shared section is also used by New Arrivals and
 * the product page's related row.
 *
 * Reference geometry at a 1344px viewport, expressed as ratios:
 *   container inset  68px each side  (~5.2% of frame width)
 *   heading          ~15px, 0.22em tracking, centred
 *   underline        48 x 2px red, 10px under the heading
 *   grid             4-up, 24px gap
 *   bottom           cards finish ~4px above the frame edge
 *
 * All copy and product data stay CMS/product-driven.
 */
export function NoirBestSellers({
  content,
  products = [],
  isLoading = false,
}: NoirBestSellersProps) {
  const { locale } = useMinimalI18n();
  const isAr = locale === "ar";

  if (!content.enabled) return null;

  const title =
    (isAr && content.titleAr ? content.titleAr : content.title) ||
    (isAr ? "الأكثر مبيعاً" : "Best Sellers");
  const viewAllText =
    isAr && content.viewAllTextAr ? content.viewAllTextAr : content.viewAllText;
  const viewAllLink = content.viewAllLink || "/shop";

  if (!isLoading && products.length === 0) return null;

  const shown = products.slice(0, TOP_ROW_MAX);

  return (
    <section className='px-4 pt-5 pb-2 md:px-17'>
      {/* ── Heading + red rule ── */}
      <div className='mb-1.5 flex flex-col items-center text-center'>
        <h2
          className={cn(
            "text-[13px] font-semibold uppercase leading-none text-white md:text-[15px]",
            isAr ? "" : "tracking-[0.22em]",
            NOIR_DISPLAY_FONT_CLASSES,
          )}>
          {title}
        </h2>
        <span
          className='mt-2.5 h-0.5 w-12 bg-[#E8112D]'
          aria-hidden='true'
        />
      </div>

      {/* ── 4-up row ── */}
      <div className='grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6'>
        {isLoading
          ? Array.from({ length: TOP_ROW_MAX }, (_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeletons
              <NoirTopSkeletonCard key={i} />
            ))
          : shown.map((product) => (
              <NoirTopProductCard key={product.id} product={product} />
            ))}
      </div>

      {/* ── Optional view-all (absent in the reference; renders only if the
             merchant sets it in the CMS) ── */}
      {viewAllText && (
        <div className='mt-6 flex justify-center'>
          <Link
            href={viewAllLink}
            className={cn(
              "group/va inline-flex items-center gap-1.5 text-[11px] uppercase text-white/70",
              "transition-colors duration-300 hover:text-[#E8112D]",
              isAr ? "" : "tracking-[0.2em]",
              NOIR_DISPLAY_FONT_CLASSES,
            )}>
            {viewAllText}
            <ArrowRight
              className='h-3 w-3 transition-transform duration-300 rtl:rotate-180 group-hover/va:translate-x-1 rtl:group-hover/va:-translate-x-1'
              strokeWidth={1.5}
            />
          </Link>
        </div>
      )}
    </section>
  );
}

NoirBestSellers.displayName = "NoirBestSellers";
