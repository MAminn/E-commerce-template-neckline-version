import { useMemo, useState, type CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { useMinimalI18n } from "#root/lib/i18n/MinimalI18nContext";
import { getProductUrl } from "#root/lib/utils/route-helpers";
import { cn } from "#root/lib/utils";
import { formatNoirPrice } from "./format-price";
import { NoirImagePlaceholder, type NoirProduct } from "./ProductCardNoir";
import { NOIR_DISPLAY_FONT_CLASSES } from "./noir-tokens";
import { NOIR_REF, nu, nuMin } from "./noir-reference-metrics";

export interface NoirReferenceProductCardProps {
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
 * NoirReferenceProductCard — the card used by the Noir reference top frame.
 *
 * Dedicated to the frame and used nowhere else. ProductCardNoir is a square-
 * image, taller card consumed by the Noir shop grid, New Arrivals and the
 * product page's related row; the reference card is a LANDSCAPE-image card
 * with a fixed-height body, so the two cannot share geometry without the
 * change leaking into three other surfaces.
 *
 * Reference geometry (1344px viewport, 1312px frame):
 *   card        275 x 278, radius 10, inset-ring hairline on glass
 *   image       275 x 148 -> 1.858:1, full-bleed, no inset
 *   body        130 tall  -> pt 4.5 / px 39.5 / pb 16
 *   name        15px, 0.12em, 17px box    notes 13px, 17px box, white/50
 *   price       16px semibold, 19px box   CTA 195 x 34, radius 6
 *
 * Every line box is explicit. Inheriting leading-normal on the price alone
 * made the body 8px too tall, which compounded across the row.
 *   badge       top 11 / start 12, 9px on #E8112D
 *
 * Data is entirely CMS/product-driven — image, name, notes, price, discount
 * and badge. Only the layout is bespoke.
 *
 * MISSING DATA RESERVES ITS SPACE. The body carries a min-height and the
 * notes line a min-height of its own, so a product without notes or without
 * a badge renders a card of exactly the same height as one that has them.
 * Filling the CMS in later changes the content, never the layout.
 */
export function NoirReferenceProductCard({
  product,
  onAddToCart,
  className,
}: NoirReferenceProductCardProps) {
  const { t, locale } = useMinimalI18n();
  const isAr = locale === "ar";
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const m = NOIR_REF.card;

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
    "group/cta flex w-full items-center justify-center gap-2",
    // 44px tap target below md; the reference 34 from md up.
    "h-11 md:h-(--noir-card-cta-h)",
    "border border-white/20 bg-transparent uppercase leading-none text-white/85",
    isAr ? "" : "tracking-[0.14em]",
    NOIR_DISPLAY_FONT_CLASSES,
    "transition-all duration-300 hover:border-[#E8112D] hover:bg-[#E8112D] hover:text-white",
  );
  const ctaStyle = {
    marginTop: nuMin(m.ctaGap, 12),
    "--noir-card-cta-h": nu(m.ctaHeight),
    borderRadius: nuMin(m.ctaRadius, 6),
    fontSize: `max(10px, ${nu(m.ctaSize)})`,
  } as CSSProperties;

  const ctaContent = (
    <>
      <span>{t("add_to_cart")}</span>
      <ArrowRight
        className='h-3 w-3 text-[#E8112D] transition-all duration-300 rtl:rotate-180 group-hover/cta:translate-x-0.5 group-hover/cta:text-white rtl:group-hover/cta:-translate-x-0.5'
        strokeWidth={1.75}
      />
    </>
  );

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden",
        // Glass card reading through the frame's blurred atmosphere.
        "backdrop-blur-md",
        "bg-linear-to-b from-white/[0.075] to-white/[0.03]",
        // Inset ring, not a border. A border pushed the image area onto a
        // 273px content box (147.6 tall) and the card to 279.6; with the ring
        // the 275/148 ratio applies to the full border-box, so image 148 +
        // body 130 = 278 exactly. Hover brightens the same ring and adds the
        // glow in ONE value, since a second shadow utility would replace it.
        //
        // The ring is carried here AND in the RIM SHEEN overlay below. This
        // copy covers the body, where nothing paints over it; the overlay
        // covers the image area, where the product shot would otherwise hide
        // it. Keeping both means the rim is unbroken top to bottom.
        //
        // Outer halo is warm-neutral and sits OUTSIDE the card, so the glass
        // edge separates from the shelf instead of relying on fill contrast.
        "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.13),0_0_0_1px_rgba(255,255,255,0.03),0_0_22px_-10px_rgba(255,240,230,0.14),0_20px_46px_-28px_rgba(0,0,0,0.8)]",
        "transition-all duration-300",
        "hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28),0_0_0_1px_rgba(255,255,255,0.06),0_0_30px_-8px_rgba(255,240,230,0.22),0_18px_50px_-24px_rgba(232,17,45,0.45)]",
        className,
      )}
      style={{ borderRadius: nuMin(m.radius, 10) }}>
      {badgeText && (
        <span
          className={cn(
            "absolute z-10 rounded-xs bg-[#E8112D] font-semibold uppercase leading-none text-white",
            isAr ? "" : "tracking-[0.16em]",
            NOIR_DISPLAY_FONT_CLASSES,
          )}
          style={{
            top: nuMin(m.badgeTop, 8),
            insetInlineStart: nuMin(m.badgeStart, 8),
            padding: `${nuMin(4, 3)} ${nuMin(6, 5)}`,
            fontSize: `max(8px, ${nu(m.badgeSize)})`,
          }}>
          {badgeText}
        </span>
      )}

      {/* Image — full-bleed LANDSCAPE panel (reference 1.858:1), not square. */}
      {/* Plain anchors: the shared Link helper takes no style prop and its
          only extra behaviour (an .is-active class) is scoped to #sidebar. */}
      <a
        href={productUrl}
        className='relative block overflow-hidden'
        style={{ aspectRatio: m.imageAspect }}>
        {!hasImageData || imageError ? (
          <NoirImagePlaceholder />
        ) : (
          <img
            src={displayImageUrl}
            alt={product.name}
            className={cn(
              "h-full w-full object-cover transition-transform duration-700",
              // PRODUCT SCALE. The container, the aspect ratio and every card
              // metric are untouched — this only enlarges the render inside the
              // existing image area.
              //
              // Measured on the source shots (666x375, pure-black ground, so
              // the bounding box is exact): the tin occupies just 55.0% x 49.1%
              // of the frame and sits 11px right and 15.5px BELOW centre. At
              // object-cover's 0.413 scale that put the tin at ~55% of the
              // card's width against the reference's ~80%.
              //
              // 1.46 closes that: 150.7px -> 220px of the 275px area. The
              // translate cancels the source's own off-centre bias (-4.3px,
              // -6.2px rendered, expressed as percentages of the element so it
              // holds at every viewport), which matters because without it the
              // enlarged tin would sit 6px off the bottom edge. Recentred it
              // clears every edge by 27.5px horizontally and 18.8px vertically.
              //
              // Nothing is cropped: at 1.46 the visible source window is
              // 456x246 centred on the tin, and the tin's 366x184 box sits
              // inside it with 45.6px / 31.25px of source margin all round.
              "scale-[1.46] translate-x-[-2.3%] translate-y-[-6.1%]",
              "group-hover:scale-[1.52]",
              !imageLoaded && "opacity-0",
            )}
            loading='lazy'
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        )}
      </a>

      {/* Body — fixed reference rhythm: name, notes, price, CTA. */}
      <div
        className='flex flex-col items-center text-center'
        style={{
          minHeight: nuMin(m.bodyMinHeight, 118),
          paddingTop: nuMin(m.bodyPadTop, 4.5),
          paddingBottom: nuMin(m.bodyPadBottom, 14),
          paddingInline: `max(0.75rem, ${nu(m.bodyPadX)})`,
        }}>
        <a href={productUrl} className='block w-full'>
          <h3
            className={cn(
              "line-clamp-1 font-semibold uppercase text-white",
              isAr ? "" : "tracking-[0.12em]",
              NOIR_DISPLAY_FONT_CLASSES,
            )}
            style={{
              fontSize: `max(12px, ${nu(m.nameSize)})`,
              lineHeight: nuMin(m.nameLineHeight, 16),
            }}>
            {product.name}
          </h3>
        </a>

        {/* Notes line — ALWAYS rendered. When the CMS has no notes it holds a
            non-breaking space so the reserved height is identical, keeping
            every card the same height before and after the data lands. */}
        <p
          className='w-full truncate text-white/50'
          style={{
            marginTop: nuMin(m.notesGap, 4),
            fontSize: `max(11px, ${nu(m.notesSize)})`,
            // The line box IS the reserved height — one value, so a card with
            // notes and a card without are guaranteed identical.
            lineHeight: nuMin(m.notesLineHeight, 15),
            minHeight: nuMin(m.notesLineHeight, 15),
          }}>
          {product.notes || " "}
        </p>

        {/* EXPLICIT height at md+, not just a line box. `items-baseline`
            across two different font sizes can align the price and the struck
            price so the flex line exceeds its line-height — which made cards
            WITH a discount 1px taller, and the grid then stretched every card
            in the row to match. Pinning the height keeps all four at 278.

            Below md that pin has to go: a 147px card leaves ~123px of body,
            which a price and a struck price cannot share on one line, so they
            wrapped and the fixed 18px box clipped the second line straight
            through the first. On mobile the row wraps and grows instead. */}
        <div
          className='flex flex-wrap items-baseline justify-center gap-x-2 md:h-(--noir-price-h) md:flex-nowrap'
          style={
            {
              marginTop: nuMin(m.priceGap, 4),
              "--noir-price-h": nu(m.priceLineHeight),
              minHeight: nuMin(m.priceLineHeight, 18),
              lineHeight: nuMin(m.priceLineHeight, 18),
            } as CSSProperties
          }>
          <span
            className='font-semibold text-white'
            style={{
              fontSize: `max(13px, ${nu(m.priceSize)})`,
              lineHeight: nuMin(m.priceLineHeight, 18),
            }}>
            {formatNoirPrice(displayPrice)}
          </span>
          {struckPrice !== null && (
            <span
              className='text-white/35 line-through'
              style={{ fontSize: `max(11px, ${nu(12)})` }}>
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
            className={ctaClasses}
            style={ctaStyle}>
            {ctaContent}
          </button>
        ) : (
          <a href={productUrl} className={ctaClasses} style={ctaStyle}>
            {ctaContent}
          </a>
        )}
      </div>

      {/* ── RIM SHEEN ──────────────────────────────────────────────────────
          Last child, so it paints above the product shot. The ring on the
          article itself is covered across the image area — the shot is an
          in-flow child and paints after the card's background — which left the
          rim visible only along the body. Measured: a 51.6 spike at the body
          edge, nothing comparable over the image. This restores it.

          Lateral blooms use a large blur with a large NEGATIVE spread so the
          glow hugs the edge and dies before it reaches the product, keeping
          the card centre clean and dark. Weaker than the hero panel's, in
          proportion to the card being a quarter of its width. */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-20",
          "shadow-[inset_0_0_0_1px_rgba(255,251,247,0.07),inset_0_1px_0_0_rgba(255,255,255,0.09),inset_11px_0_13px_-12px_rgba(255,246,238,0.34),inset_-11px_0_13px_-12px_rgba(255,246,238,0.34)]",
        )}
        style={{ borderRadius: nuMin(m.radius, 10) }}
        aria-hidden='true'
      />
    </article>
  );
}

NoirReferenceProductCard.displayName = "NoirReferenceProductCard";
