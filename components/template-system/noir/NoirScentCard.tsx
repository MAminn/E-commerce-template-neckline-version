import { useMemo, useState, type CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "#root/components/utils/Link";
import { useMinimalI18n } from "#root/lib/i18n/MinimalI18nContext";
import { getProductUrl } from "#root/lib/utils/route-helpers";
import { cn } from "#root/lib/utils";
import { NoirImagePlaceholder, type NoirProduct } from "./ProductCardNoir";
import {
  NOIR_DISPLAY_FONT_CLASSES,
  NOIR_TEXT_MUTED_CLASSES,
  NOIR_TEXT_SECONDARY_CLASSES,
} from "./noir-tokens";

export interface NoirScentCardProps {
  product: NoirProduct;
  className?: string;
}

/**
 * PRODUCT ZOOM.
 *
 * Store product shots are 1:1 squares (800x800 / 1000x1000) with the tin
 * centred inside a wide dark margin, while the card's image panel is 8/5
 * landscape. `object-cover` therefore matches the source's WIDTH and crops
 * top and bottom, so the tin lands at only ~61% of the card's width against
 * the reference's ~83%.
 *
 * `object-contain` would make this worse, not better: it fits the whole
 * square inside the shorter panel axis and shrinks the tin further. The only
 * way to close the gap is to crop into the asset's own dead margin, which is
 * what this zoom does — 0.83 / 0.61 = 1.36.
 *
 * It is a named constant rather than an inline value because it is tuned to
 * how much padding these particular shots carry: a store that uploads
 * tightly-cropped art wants it nearer 1.0, and this is the one place to
 * change it.
 */
const NOIR_SCENT_IMAGE_ZOOM = "1.45";
const NOIR_SCENT_IMAGE_ZOOM_HOVER = "1.52";

/**
 * Dissolves the artwork's own rectangle into the card.
 *
 * Vertical only, and deliberately asymmetric: the solid band runs from 9% to
 * 74%, which is where the tin sits once `objectPosition` lifts it, so the
 * product itself is never touched. Above and below that, the shot's empty
 * mid-grey margin fades to nothing and the card's background shows through —
 * which is what removes the "thumbnail in a container" edge. A radial mask
 * was the obvious first choice but eats the tin's own left and right edges,
 * since the product spans ~85% of the card's width.
 */
const NOIR_SCENT_STAGE_MASK =
  "linear-gradient(to bottom, transparent 0%, #000 9%, #000 74%, transparent 100%)";

/** The reference draws five intensity dots per card. */
const SCENT_DOT_COUNT = 5;

/**
 * Fallback fill when a product carries no rating. The reference shows three
 * of five filled, and a constant is the honest choice here — deriving a
 * number from the id would invent product data that does not exist.
 */
const SCENT_DOT_FALLBACK = 3;

/**
 * Notes line. The reference separates notes with bullets
 * ("warm amber • crisp woods • musk"); merchants type them into the product
 * description as a comma list, so the separator is a PRESENTATION detail
 * applied here rather than something they have to type. Copy without commas
 * is passed through untouched.
 */
function formatScentNotes(notes: string): string {
  const parts = notes
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts.join(" • ") : notes;
}

/**
 * NoirScentDots — the five-dot intensity row.
 *
 * Filled count comes from the product's own `rating` when it has one, so the
 * row is real data wherever the store provides it, and only falls back to the
 * reference's three-of-five otherwise.
 */
function NoirScentDots({ rating }: { rating?: number }) {
  const filled =
    typeof rating === "number" && rating > 0
      ? Math.min(SCENT_DOT_COUNT, Math.round(rating))
      : SCENT_DOT_FALLBACK;

  return (
    <div
      className='flex items-center justify-center gap-1.5'
      role='img'
      aria-label={`Intensity ${filled} of ${SCENT_DOT_COUNT}`}>
      {Array.from({ length: SCENT_DOT_COUNT }, (_, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length scale
          key={i}
          className={cn(
            "size-2 rounded-full",
            i < filled
              ? "bg-white/75"
              : "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]",
          )}
        />
      ))}
    </div>
  );
}

/** Resolve a stored image reference to a servable URL (mirrors ProductCardNoir). */
function resolveImageUrl(url?: string | null): string {
  if (!url) return "/assets/placeholder-product.png";
  if (url.startsWith("http") || url.startsWith("/")) return url;
  return `/uploads/${url}`;
}

/**
 * NoirScentCard — section-specific card for the Noir "Explore Scents"
 * category-products grid. Deliberately NOT the shared ProductCardNoir:
 * this is an explore/discovery card, not an add-to-cart commerce card.
 *
 * Reference-matched treatment:
 *  - sharp rectangular dark frame (hairline border, minimal radius)
 *  - large image panel on top
 *  - centered uppercase name
 *  - notes line (product.description → notes) when present
 *  - five intensity dots (product.rating, else the reference's 3-of-5)
 *  - scent-family label (categoryName / first category)
 *  - outline "EXPLORE SCENT" CTA with red arrow → product page
 *  - NO price and NO add-to-cart: this card sends people to the product page
 *
 * Fully product/CMS-driven — nothing is hardcoded except the localized
 * "EXPLORE SCENT" CTA label (UI chrome).
 */
export function NoirScentCard({ product, className }: NoirScentCardProps) {
  const { locale } = useMinimalI18n();
  const isAr = locale === "ar";
  const trackWide = isAr ? "" : "tracking-[0.18em]";
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

  // Mood / category label — real data only (primary categoryName, else first category).
  const moodLabel =
    product.categoryName || product.categories?.[0]?.name || null;

  const productUrl = getProductUrl(product.id);
  const ctaLabel = isAr ? "اكتشف العطر" : "Explore Scent";

  return (
    <div
      className={cn(
        // Sharp rectangular luxury panel. The reference has no rounding to
        // speak of and a single hairline — not the soft, heavily rounded card
        // the rest of the Noir shop uses.
        "group relative flex flex-col overflow-hidden rounded-none",
        "border border-white/12 bg-[#0b0b0b]",
        // Barely-there vertical lift so the panel reads as glass over black
        // rather than a flat swatch.
        "bg-linear-to-b from-white/[0.035] to-transparent",
        "transition-all duration-300 hover:border-white/25",
        "hover:shadow-[0_18px_50px_-24px_rgba(232,17,45,0.45)]",
        className,
      )}>
      {/* ── PRODUCT STAGE ──────────────────────────────────────────────
          Not an image box. The shot is 8/5 of the card's height, but its
          rectangle must not be visible: the store's product art carries its
          own mid-grey backdrop, which is lighter than the card's #0b0b0b, so
          left un-blended it read as a pasted-in thumbnail with a hard
          horizontal seam where it met the body — and the old `from-black/40`
          scrim only sharpened that seam.

          The fix is the treatment the Noir hero and brand statement already
          use: mask the artwork's own edges away so it dissolves into the card
          instead of ending on them. The vertical mask keeps the band where
          the tin actually sits fully opaque and fades the empty margins above
          and below to nothing, so what remains is the product floating on the
          card's own background — a stage, not a frame. */}
      <Link
        href={productUrl}
        className='group/img relative block aspect-8/5 overflow-hidden'>
        {/* Stage light: a soft pool behind the product, so the upper area
            reads as lit rather than as a lighter rectangle. */}
        <div
          className='pointer-events-none absolute inset-0'
          style={{
            background:
              "radial-gradient(ellipse 68% 62% at 50% 44%, rgba(255,244,236,0.055) 0%, transparent 72%)",
          }}
          aria-hidden='true'
        />
        {!hasImageData || imageError ? (
          <NoirImagePlaceholder />
        ) : (
          <img
            src={displayImageUrl}
            alt={product.name}
            className={cn(
              "relative w-full h-full object-cover transition-transform duration-700",
              // PRODUCT ZOOM — see NOIR_SCENT_IMAGE_ZOOM.
              "scale-(--noir-scent-zoom) group-hover:scale-(--noir-scent-zoom-hover)",
              !imageLoaded && "opacity-0",
            )}
            style={
              {
                "--noir-scent-zoom": NOIR_SCENT_IMAGE_ZOOM,
                "--noir-scent-zoom-hover": NOIR_SCENT_IMAGE_ZOOM_HOVER,
                // Nudges the crop window down the square source, which lifts
                // the centred tin into the upper part of the stage the way the
                // reference does, and leaves the fade zone below it empty.
                objectPosition: "50% 58%",
                maskImage: NOIR_SCENT_STAGE_MASK,
                WebkitMaskImage: NOIR_SCENT_STAGE_MASK,
              } as CSSProperties
            }
            loading='lazy'
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        )}
      </Link>

      {/* Body — centered explore composition */}
      <div className='flex flex-1 flex-col items-center text-center gap-3 px-5 pt-6 pb-6'>
        {/* Name */}
        <Link href={productUrl}>
          <h3
            className={cn(
              "text-sm md:text-base uppercase text-white line-clamp-2",
              trackWide,
              NOIR_DISPLAY_FONT_CLASSES,
            )}>
            {product.name}
          </h3>
        </Link>

        {/* Notes line — from the product description, bullet-separated. */}
        {product.notes && (
          <p
            className={cn(
              "w-full text-xs leading-relaxed line-clamp-2",
              NOIR_TEXT_SECONDARY_CLASSES,
            )}>
            {formatScentNotes(product.notes)}
          </p>
        )}

        {/* Intensity dots */}
        <NoirScentDots rating={product.rating} />

        {/* Scent family — the product's own category. */}
        {moodLabel && (
          <span
            className={cn(
              "text-[10px] uppercase",
              isAr ? "" : "tracking-[0.22em]",
              NOIR_TEXT_MUTED_CLASSES,
              NOIR_DISPLAY_FONT_CLASSES,
            )}>
            {moodLabel}
          </span>
        )}

        {/* CTA — outline "EXPLORE SCENT" with red arrow → product page */}
        <Link
          href={productUrl}
          className={cn(
            "group/cta mt-auto pt-1 flex w-full items-center justify-center gap-2",
            "border border-white/20 bg-transparent px-4 py-3 rounded-sm",
            "text-[11px] uppercase text-white/80",
            trackWide,
            NOIR_DISPLAY_FONT_CLASSES,
            "transition-all duration-300 hover:bg-[#E8112D] hover:border-[#E8112D] hover:text-white",
          )}>
          <span>{ctaLabel}</span>
          <ArrowRight
            className='w-3.5 h-3.5 text-[#E8112D] rtl:rotate-180 transition-all duration-300 group-hover/cta:text-white group-hover/cta:translate-x-1 rtl:group-hover/cta:-translate-x-1'
            strokeWidth={1.5}
          />
        </Link>
      </div>
    </div>
  );
}
