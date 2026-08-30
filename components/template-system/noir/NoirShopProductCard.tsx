import { useMemo, useState, type CSSProperties } from "react";
import { ArrowRight, Star } from "lucide-react";
import { useMinimalI18n } from "#root/lib/i18n/MinimalI18nContext";
import { getProductUrl } from "#root/lib/utils/route-helpers";
import { cn } from "#root/lib/utils";
import { formatNoirPrice } from "./format-price";
import { NoirImagePlaceholder, type NoirProduct } from "./ProductCardNoir";
import {
  NOIR_ACCENT_TEXT_CLASSES,
  NOIR_DISPLAY_FONT_CLASSES,
  NOIR_MONO_FONT_CLASSES,
} from "./noir-tokens";

export interface NoirShopProductCardProps {
  product: NoirProduct;
  onAddToCart?: (product: NoirProduct) => void;
  /**
   * 1-based position in the displayed grid. Used only for the "Scent No."
   * overline when the product carries no explicit display order.
   */
  index?: number;
  className?: string;
}

function resolveImageUrl(url?: string | null): string {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("/")) return url;
  return `/uploads/${url}`;
}

/**
 * Notes line. Merchants type scent notes into the product description; the
 * reference renders them bullet-separated. A comma list is converted here so
 * the separator stays a presentation detail — copy that already uses bullets
 * (which the Neckline catalogue does) passes through untouched.
 */
function formatNotes(notes: string): string {
  const parts = notes
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts.join(" • ") : notes;
}

/* ------------------------------------------------------------------ */
/*  Product stage — the image treatment shared with the Noir hero cards */
/* ------------------------------------------------------------------ */

/**
 * PRODUCT ZOOM.
 *
 * The store's shots are 666 x 375 on a near-black ground with the tin sitting
 * small inside a wide dead margin: measured on the source, the tin occupies
 * 55.0% x 49.1% of the frame and sits 11px right and 15.5px BELOW centre.
 *
 * The image panel is 250/145, and the source is wider than that, so
 * `object-cover` matches the panel's HEIGHT and the tin lands at only
 *
 *     0.550 x (666/375) / (250/145) = 56.7% of the card's width
 *
 * against the reference card's ~80%. That is the entire reason the shot read
 * as a small picture floating in a box rather than as the product. 1.44
 * closes it — 56.7% -> 81.6% of the card's width, 70.7% of the panel's height
 * — which is the same scale the Noir best-seller card (1.46) and the scent
 * card (1.45) already use, because they crop the same assets.
 *
 * Nothing is cropped off the tin: at 1.44 it clears the panel's top and
 * bottom edges by 14.6% and its sides by 9.2%.
 */
const NOIR_SHOP_IMAGE_ZOOM = "1.44";
const NOIR_SHOP_IMAGE_ZOOM_HOVER = "1.5";

/**
 * Cancels the source's own off-centre bias, so the enlarged tin sits on the
 * panel's centre instead of drifting down and right as it grows. Percentages
 * of the element's border box, derived from the offsets above and multiplied
 * by the zoom (the `translate` property is applied after `scale`, so it is
 * not itself scaled):
 *
 *     x = -(11/666) x (666/375)/(250/145) x 1.44 = -2.45%
 *     y = -(15.5/375) x 1.44                     = -5.95%
 */
const NOIR_SHOP_IMAGE_OFFSET = "-2.45% -5.95%";

/**
 * Dissolves the artwork's own rectangle into the card.
 *
 * Vertical only. The solid band runs 7% -> 88%, which comfortably contains the
 * tin (14.6% -> 85.4% once zoomed), so the product is never touched; above and
 * below it the shot's own ground fades out and the card's #0d0d0d shows
 * through. That is what removes the hard seam where the panel met the body and
 * stops the image reading as a thumbnail in a container. Same technique, and
 * same reasoning, as NoirScentCard's stage mask.
 */
const NOIR_SHOP_STAGE_MASK =
  "linear-gradient(to bottom, transparent 0%, #000 7%, #000 88%, transparent 100%)";

/**
 * Stage light — a soft pool behind the product so the panel reads as LIT
 * rather than as a lighter rectangle pasted onto the card. Sits under the
 * shot, above the card's background.
 */
const NOIR_SHOP_STAGE_LIGHT =
  "radial-gradient(ellipse 72% 66% at 50% 46%, rgba(255,244,236,0.065) 0%, transparent 72%)";

/**
 * NoirShopProductCard — the collection-grid card for Demo 5 "Noir".
 *
 * ── Geometry is taken from the reference, not invented ────────────────────
 *
 * Measured off the reference at a 1344px viewport, where a card is 250 x 290:
 *
 *   image      250 x 145  → EXACTLY half the card, full-bleed, no padding
 *   body       250 x 145  → 14px padding
 *   overline   10px, tracked, #8A8A8A
 *   name       17px bold uppercase white
 *   notes      11px #8A8A8A
 *   rating     5 stars + count, 10px
 *   price      14px white
 *   button     full width, ~34px tall, hairline border + red arrow
 *
 * The image box is therefore expressed as `aspect-[250/145]` and the body as
 * a fixed rhythm, so the card holds the reference proportion at every width
 * instead of collapsing to a thumbnail.
 *
 * ── Absent data costs nothing — not even a blank line ────────────────────
 *
 * Notes render only when the product carries them, and the rating row only
 * when the caller supplied review data at all. Both previously held an empty
 * line box unconditionally so cards stayed aligned, which on a catalogue with
 * neither left two dead rows in every card — what made the grid read as
 * sparse against the reference.
 *
 * Alignment is handled where it belongs instead: `auto-rows-fr` on the grid
 * makes every card the same height, and `mt-auto` on the CTA pins it to the
 * card's bottom edge. Cards therefore line up whether or not the CMS is
 * filled in, and the body is as dense as its real content.
 *
 * Nothing is invented — no placeholder stars, no filler notes. A zero-review
 * product shows a real empty scale and a real "(0)", which is a fact about
 * the product, not a stand-in for missing data.
 *
 * `badge` is supplied by the caller from CMS data (homepage
 * `featuredProducts.productIds`); this component never decides it.
 */
export function NoirShopProductCard({
  product,
  onAddToCart,
  index,
  className,
}: NoirShopProductCardProps) {
  const { t, locale } = useMinimalI18n();
  const isAr = locale === "ar";
  const track = isAr ? "" : "tracking-[0.18em]";
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

  const soldOut = product.available === false || (product.stock ?? 0) <= 0;

  const scentNumber =
    product.sortOrder && product.sortOrder > 0
      ? product.sortOrder
      : typeof index === "number"
        ? index
        : null;

  const notes = product.notes ? formatNotes(product.notes) : "";

  /*
    RATING ROW PRESENCE vs RATING VALUE — two different questions.

    `product.search` returns an approved-review aggregate for every product,
    0/0 included, so a numeric `reviewCount` means "review data was loaded"
    and NOT "this product has reviews". The row therefore renders whenever the
    caller supplied that data, which keeps the card's vertical rhythm the same
    across a grid where only some products have been reviewed — the reference
    shows a rating line on every card.

    A caller that supplies no review data at all (`reviewCount` undefined)
    still gets no row, so the card stays honest and compact rather than
    printing an empty five-star scale it has no basis for.
  */
  const hasReviewData = typeof product.reviewCount === "number";
  const reviewCount = product.reviewCount ?? 0;
  const rating = typeof product.rating === "number" ? product.rating : 0;
  const filledStars = Math.round(rating);

  const badgeText = product.badge
    ? product.badge === "bestseller"
      ? isAr
        ? "الأكثر مبيعاً"
        : "Best Seller"
      : product.badge === "new"
        ? t("new")
        : product.badge
    : null;

  return (
    <div
      className={cn(
        "group/card relative flex flex-col overflow-hidden rounded-[3px]",
        "border border-white/10 bg-[#0d0d0d]",
        "transition-colors duration-300 hover:border-white/25",
        className,
      )}>
      {/* ── Badge ── */}
      {badgeText && (
        <span
          className={cn(
            "absolute start-0 top-0 z-10 bg-[#E8112D] px-2.5 py-1.5",
            "text-[10px] font-semibold uppercase leading-none text-white",
            track,
            NOIR_DISPLAY_FONT_CLASSES,
          )}>
          {badgeText}
        </span>
      )}

      {/* ── PRODUCT STAGE — exactly half the card, full-bleed like the
          reference. NOT an image box: no panel fill of its own (a lighter
          #111 rectangle is precisely what made the shot look pasted in), a
          stage light behind the product and a mask that fades the artwork's
          own ground into the card. See the constants above. ── */}
      <a
        href={getProductUrl(product.id)}
        className='relative block aspect-250/145 w-full overflow-hidden'
        aria-label={product.name}>
        <div
          className='pointer-events-none absolute inset-0'
          style={{ background: NOIR_SHOP_STAGE_LIGHT }}
          aria-hidden='true'
        />
        {hasImageData && !imageError ? (
          <>
            {!imageLoaded && (
              <div className='absolute inset-0 animate-pulse bg-white/4' />
            )}
            <img
              src={displayImageUrl}
              alt={product.name}
              loading='lazy'
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              className={cn(
                "relative h-full w-full object-cover",
                "transition-[scale,opacity] duration-700",
                // PRODUCT ZOOM — see NOIR_SHOP_IMAGE_ZOOM.
                "scale-(--noir-shop-zoom) group-hover/card:scale-(--noir-shop-zoom-hover)",
                imageLoaded ? "opacity-100" : "opacity-0",
              )}
              style={
                {
                  "--noir-shop-zoom": NOIR_SHOP_IMAGE_ZOOM,
                  "--noir-shop-zoom-hover": NOIR_SHOP_IMAGE_ZOOM_HOVER,
                  translate: NOIR_SHOP_IMAGE_OFFSET,
                  maskImage: NOIR_SHOP_STAGE_MASK,
                  WebkitMaskImage: NOIR_SHOP_STAGE_MASK,
                } as CSSProperties
              }
            />
          </>
        ) : (
          <NoirImagePlaceholder />
        )}

        {soldOut && (
          <div className='absolute inset-0 flex items-center justify-center bg-black/60'>
            <span
              className={cn(
                "text-[10px] uppercase text-white",
                track,
                NOIR_DISPLAY_FONT_CLASSES,
              )}>
              {t("out_of_stock")}
            </span>
          </div>
        )}
      </a>

      {/* ── Body ── */}
      <div className='flex flex-1 flex-col px-3.5 pb-3.5 pt-4'>
        {/* Overline — line box held even without a number. */}
        <p
          className={cn(
            "min-h-3 text-[10px] uppercase leading-none text-[#8A8A8A]",
            track,
            NOIR_MONO_FONT_CLASSES,
          )}>
          {scentNumber !== null
            ? `${isAr ? "عطر" : "Scent"} No. ${String(scentNumber).padStart(2, "0")}`
            : " "}
        </p>

        <h3
          className={cn(
            "mt-2.5 text-[17px] font-bold uppercase leading-none text-white",
            isAr ? "" : "tracking-[0.06em]",
            NOIR_DISPLAY_FONT_CLASSES,
          )}>
          <a
            href={getProductUrl(product.id)}
            className='transition-colors duration-300 hover:text-[#E8112D]'>
            {product.name}
          </a>
        </h3>

        {/* Notes — the merchant's description, nothing invented. */}
        {notes && (
          <p className='mt-2 line-clamp-1 text-[11px] leading-4 text-[#8A8A8A]'>
            {notes}
          </p>
        )}

        {/* Rating — approved reviews only, straight from the aggregate.
            Zero-review products keep the row and show five empty stars with
            "(0)", so a partly-reviewed grid stays on one rhythm. */}
        {hasReviewData && (
          <div className='mt-2 flex items-center gap-1.5'>
            <span
              className='flex items-center gap-px'
              role='img'
              aria-label={
                reviewCount > 0
                  ? `${rating} ${isAr ? "من" : "out of"} 5`
                  : isAr
                    ? "لا توجد تقييمات بعد"
                    : "No reviews yet"
              }>
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length scale
                  key={i}
                  className={cn(
                    "h-2.5 w-2.5",
                    i < filledStars
                      ? cn("fill-current", NOIR_ACCENT_TEXT_CLASSES)
                      : "text-white/20",
                  )}
                  strokeWidth={1.5}
                />
              ))}
            </span>
            <span
              className={cn(
                "text-[10px] text-[#8A8A8A]",
                NOIR_MONO_FONT_CLASSES,
              )}>
              ({reviewCount})
            </span>
          </div>
        )}

        <div className='mt-2 flex items-baseline gap-2'>
          <span className='text-[14px] font-medium text-white'>
            {formatNoirPrice(displayPrice)}
          </span>
          {hasDiscount && (
            <span className='text-[11px] text-[#6B6B6B] line-through'>
              {formatNoirPrice(product.price)}
            </span>
          )}
        </div>

        {/* CTA — `mt-auto` pins it to the card's bottom edge, so every button
            in a row lines up whatever content each card carried above it.
            `pt-3.5` is the minimum breathing room from the price. */}
        <div className='mt-auto pt-3.5' />
        <button
          type='button'
          disabled={soldOut}
          onClick={() => onAddToCart?.(product)}
          className={cn(
            "inline-flex w-full items-center justify-center gap-2 rounded-[3px] border px-4 py-2.5",
            "text-[11px] uppercase transition-colors duration-300",
            track,
            NOIR_DISPLAY_FONT_CLASSES,
            soldOut
              ? "cursor-not-allowed border-white/10 text-white/30"
              : "border-white/15 text-white hover:border-[#E8112D]",
          )}>
          {t("add_to_cart")}
          <ArrowRight
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-300 rtl:rotate-180",
              !soldOut &&
                "text-[#E8112D] group-hover/card:translate-x-1 rtl:group-hover/card:-translate-x-1",
            )}
            strokeWidth={2}
          />
        </button>
      </div>
    </div>
  );
}

NoirShopProductCard.displayName = "NoirShopProductCard";
