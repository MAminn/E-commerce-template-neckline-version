import { ArrowRight } from "lucide-react";
import { Link } from "#root/components/utils/Link";
import { useMinimalI18n } from "#root/lib/i18n/MinimalI18nContext";
import { cn } from "#root/lib/utils";
import { ProductCardNoir, type NoirProduct } from "./ProductCardNoir";
import { NoirSectionHeading } from "./NoirSectionHeading";
import {
  NOIR_ACCENT_LINE,
  NOIR_CONTAINER,
  NOIR_DISPLAY_FONT_CLASSES,
  NOIR_SECTION_Y,
} from "./noir-tokens";

interface NoirProductSectionProps {
  title: string;
  eyebrow?: string;
  viewAllText?: string;
  viewAllLink?: string;
  products: NoirProduct[];
  isLoading?: boolean;
  maxProducts?: number;
  /** Elevated band background instead of pure black. */
  band?: boolean;
  /**
   * "start" (default): NoirSectionHeading with inline view-all link.
   * "centered": small centered uppercase title + short red underline,
   * tight top padding (tucks under the hero), view-all link centered
   * under the grid.
   */
  headingVariant?: "start" | "centered";
  /**
   * When true this row is rendered INSIDE the landing's framed top
   * experience (NoirTopExperience). It drops the section-level vertical
   * padding tiers (uses a tight pt-2 pb-8 md:pb-10), goes fully
   * transparent so the frame surface shows through, uses the frame's own
   * horizontal gutter (px-4 md:px-8, no max-width reset since the frame
   * constrains width), forces the centered heading variant, and renders
   * its cards with the translucent glass surface. Default false = unchanged.
   */
  embedded?: boolean;
}

/** Dark skeleton card — matches ProductCardNoir geometry exactly. */
export function NoirSkeletonCard() {
  return (
    <div className='bg-[#141414] border border-white/10 rounded-lg overflow-hidden'>
      <div className='aspect-4/5 bg-white/5 animate-pulse' />
      <div className='p-4 space-y-3'>
        <div className='h-3 w-3/4 bg-white/5 rounded animate-pulse' />
        <div className='h-3 w-1/3 bg-white/5 rounded animate-pulse' />
        <div className='h-10 w-full bg-white/5 rounded animate-pulse' />
      </div>
    </div>
  );
}

/**
 * NoirProductSection — shared layout for Noir product rows
 * (Best Sellers, Explore grid, Related): unified NoirSectionHeading
 * + a 4-up desktop grid.
 *
 * Mobile: horizontal snap scroll for LTR. For Arabic (RTL) we use a
 * 2-column grid on mobile instead — RTL horizontal snap scrolling is
 * inconsistent across mobile browsers (the known RTL carousel quirk),
 * so we deliberately avoid fighting it. Documented per Phase 2 / 3c.
 */
export function NoirProductSection({
  title,
  eyebrow,
  viewAllText,
  viewAllLink,
  products,
  isLoading = false,
  maxProducts = 4,
  band = false,
  headingVariant = "start",
  embedded = false,
}: NoirProductSectionProps) {
  const { locale } = useMinimalI18n();
  const isAr = locale === "ar";
  const centered = headingVariant === "centered" || embedded;
  const cardSurface = embedded ? "glass" : undefined;

  if (!isLoading && products.length === 0) return null;

  const shown = products.slice(0, maxProducts);

  return (
    <section
      className={cn(
        embedded
          ? "pt-2 pb-8 md:pb-10"
          : centered
            ? "pt-10 md:pt-14 pb-16 md:pb-24"
            : NOIR_SECTION_Y,
        band && !embedded && "bg-[#0c0c0c]",
      )}>
      <div className={embedded ? "px-4 md:px-8" : NOIR_CONTAINER}>
        {centered ? (
          <div className='mb-8 md:mb-10 flex flex-col items-center text-center'>
            {eyebrow && (
              <p
                className={cn(
                  "text-[11px] uppercase text-[#E8112D] font-medium mb-2",
                  isAr ? "" : "tracking-[0.28em]",
                  NOIR_DISPLAY_FONT_CLASSES,
                )}>
                {eyebrow}
              </p>
            )}
            <h2
              className={cn(
                "text-base md:text-lg uppercase font-semibold text-white",
                isAr ? "" : "tracking-[0.22em]",
                NOIR_DISPLAY_FONT_CLASSES,
              )}>
              {title}
            </h2>
            <span
              className={cn(NOIR_ACCENT_LINE, "mt-2.5")}
              aria-hidden='true'
            />
          </div>
        ) : (
          <NoirSectionHeading
            title={title}
            eyebrow={eyebrow}
            viewAllText={viewAllText}
            viewAllLink={viewAllLink}
          />
        )}

        {/* ── Products ── */}
        {isLoading ? (
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6'>
            {Array.from({ length: maxProducts }, (_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeletons
              <NoirSkeletonCard key={i} />
            ))}
          </div>
        ) : isAr ? (
          /* RTL: 2-col grid on mobile, 4-up desktop (no snap carousel) */
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6'>
            {shown.map((product) => (
              <ProductCardNoir
                key={product.id}
                product={product}
                surface={cardSurface}
              />
            ))}
          </div>
        ) : (
          <>
            {/* LTR mobile: horizontal snap scroll */}
            <div className='flex md:hidden gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4 px-4 pb-2'>
              {shown.map((product) => (
                <ProductCardNoir
                  key={product.id}
                  product={product}
                  surface={cardSurface}
                  className='w-64 shrink-0 snap-start'
                />
              ))}
            </div>
            {/* Desktop: 4-up grid */}
            <div className='hidden md:grid md:grid-cols-4 gap-6'>
              {shown.map((product) => (
                <ProductCardNoir
                  key={product.id}
                  product={product}
                  surface={cardSurface}
                />
              ))}
            </div>
          </>
        )}

        {/* Centered variant: view-all as small centered link under grid */}
        {centered && viewAllText && viewAllLink && (
          <div className='mt-8 md:mt-10 flex justify-center'>
            <Link
              href={viewAllLink}
              className={cn(
                "group/va inline-flex items-center gap-1.5 text-[11px] uppercase text-white/70",
                "hover:text-[#E8112D] transition-colors duration-300",
                isAr ? "" : "tracking-[0.2em]",
                NOIR_DISPLAY_FONT_CLASSES,
              )}>
              {viewAllText}
              <ArrowRight
                className='w-3 h-3 rtl:rotate-180 transition-transform duration-300 group-hover/va:translate-x-1 rtl:group-hover/va:-translate-x-1'
                strokeWidth={1.5}
              />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
