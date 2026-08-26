import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "#root/components/utils/Link";
import { useMinimalI18n } from "#root/lib/i18n/MinimalI18nContext";
import { getProductUrl } from "#root/lib/utils/route-helpers";
import { cn } from "#root/lib/utils";
import { formatNoirPrice } from "./format-price";
import { NoirImagePlaceholder, type NoirProduct } from "./ProductCardNoir";
import { NOIR_DISPLAY_FONT_CLASSES } from "./noir-tokens";

/* ------------------------------------------------------------------ */
/*  Reference geometry                                                */
/*                                                                    */
/*  Measured from the Neckline reference at a 1344px viewport, then    */
/*  expressed as ratios so the card scales with the frame:            */
/*    card          275 x 278                                         */
/*    image area    275 x 148   -> aspect 1.86 : 1, full-bleed        */
/*    body          130px       -> name / notes / price / CTA         */
/*    CTA           195 x 34    -> ~71% of card width                 */
/*    badge         top-start, ~12px inset                            */
/* ------------------------------------------------------------------ */

export interface NoirTopProductCardProps {
  product: NoirProduct;
  onAddToCart?: (product: NoirProduct) => void;
  className?: string;
}

function resolveImageUrl(url?: string | null): string {
  if (!url) return "/assets/placeholder-product.png";
  if (url.startsWith("http") || url.startsWith("/")) return url;
  return `/uploads/${url}`;
}

/**
 * NoirTopProductCard — dedicated product card for the Noir landing's framed
 * top experience.
 *
 * Deliberately NOT ProductCardNoir. The shared card is square-image, taller,
 * and is consumed by the Noir shop grid, the product page's related row and
 * New Arrivals; reshaping it to the reference would drag all of those with
 * it. This card exists only inside NoirTopExperience, so its proportions can
 * track the reference exactly without any blast radius.
 *
 * Everything rendered is CMS/product data — image, name, notes, price,
 * discount, badge. Only the layout is bespoke.
 */
export function NoirTopProductCard({
  product,
  onAddToCart,
  className,
}: NoirTopProductCardProps) {
  const { t, locale } = useMinimalI18n();
  const isAr = locale === "ar";
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const hasImageData = Boolean(
    (product.images && product.images.length > 0) || product.imageUrl,
  );

  const displayImageUrl = useMemo(() => {
    if (product.images && product.images.length > 0) {
      const primary = product.images.find((img) => img.isPrimary);
      return resolveImageUrl((primary || product.images[0])?.url);
    }
    return resolveImageUrl(product.imageUrl);
  }, [product.images, product.imageUrl]);

  // Same discount semantics as every other Noir card.
  const hasDiscount =
    product.discountPrice !== undefined &&
    product.discountPrice !== null &&
    product.discountPrice !== "" &&
    Number(product.discountPrice) < product.price;
  const displayPrice = hasDiscount
    ? Number(product.discountPrice)
    : product.price;
  const struckPrice = hasDiscount
    ? product.price
    : product.originalPrice != null && product.originalPrice > product.price
      ? product.originalPrice
      : null;

  const badgeText =
    product.badge === "new"
      ? t("new")
      : product.badge === "bestseller"
        ? t("best_seller")
        : product.badge || null;

  const productUrl = getProductUrl(product.id);

  const ctaClasses = cn(
    "group/cta mt-2.5 flex w-full items-center justify-center gap-2",
    "h-8.5 rounded-md border border-white/20 bg-transparent",
    "text-[10.5px] uppercase leading-none text-white/85",
    isAr ? "" : "tracking-[0.14em]",
    NOIR_DISPLAY_FONT_CLASSES,
    "transition-all duration-300 hover:bg-[#E8112D] hover:border-[#E8112D] hover:text-white",
  );

  const ctaContent = (
    <>
      <span>{t("add_to_cart")}</span>
      <ArrowRight
        className='w-3 h-3 text-[#E8112D] rtl:rotate-180 transition-all duration-300 group-hover/cta:text-white group-hover/cta:translate-x-0.5 rtl:group-hover/cta:-translate-x-0.5'
        strokeWidth={1.75}
      />
    </>
  );

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg",
        // Glass card sitting on the frame's blurred atmosphere.
        "border border-white/10 bg-white/4 backdrop-blur-md",
        "transition-all duration-300 hover:border-white/25",
        "hover:shadow-[0_18px_50px_-24px_rgba(232,17,45,0.45)]",
        className,
      )}>
      {badgeText && (
        <span
          className={cn(
            "absolute top-3 start-3 z-10 rounded-xs bg-[#E8112D] px-2 py-1",
            "text-[9px] font-semibold uppercase leading-none text-white",
            isAr ? "" : "tracking-[0.16em]",
            NOIR_DISPLAY_FONT_CLASSES,
          )}>
          {badgeText}
        </span>
      )}

      {/* Image — full-bleed LANDSCAPE panel (reference 1.86:1), not square. */}
      <Link
        href={productUrl}
        className='relative block aspect-[1.86/1] overflow-hidden'>
        {!hasImageData || imageError ? (
          <NoirImagePlaceholder />
        ) : (
          <img
            src={displayImageUrl}
            alt={product.name}
            className={cn(
              "h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]",
              !imageLoaded && "opacity-0",
            )}
            loading='lazy'
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        )}
      </Link>

      {/* Body — reference rhythm: name, notes, price, CTA. */}
      <div className='flex flex-1 flex-col items-center gap-1 px-5 pt-3 pb-4 text-center lg:px-9'>
        <Link href={productUrl}>
          <h3
            className={cn(
              "text-[13px] font-semibold uppercase leading-tight text-white line-clamp-1",
              isAr ? "" : "tracking-[0.12em]",
              NOIR_DISPLAY_FONT_CLASSES,
            )}>
            {product.name}
          </h3>
        </Link>

        {product.notes && (
          <p className='w-full truncate text-[11px] leading-snug text-white/50'>
            {product.notes}
          </p>
        )}

        <div className='mt-auto flex items-baseline justify-center gap-2 pt-1'>
          <span className='text-[15px] font-semibold text-white'>
            {formatNoirPrice(displayPrice)}
          </span>
          {struckPrice !== null && (
            <span className='text-[12px] text-white/35 line-through'>
              {formatNoirPrice(struckPrice)}
            </span>
          )}
        </div>

        {onAddToCart ? (
          <button
            type='button'
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddToCart(product);
            }}
            className={ctaClasses}>
            {ctaContent}
          </button>
        ) : (
          <Link href={productUrl} className={ctaClasses}>
            {ctaContent}
          </Link>
        )}
      </div>
    </article>
  );
}

NoirTopProductCard.displayName = "NoirTopProductCard";
