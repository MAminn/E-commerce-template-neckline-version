import type { CSSProperties } from "react";
import type {
  HomepageFeaturedProductsContent,
  HomepageHeroContent,
} from "#root/shared/types/homepage-content";
import { cn } from "#root/lib/utils";
import { NoirReferenceNavbar } from "./NoirReferenceNavbar";
import {
  NoirReferenceHero,
  getNoirReferenceHeroImage,
} from "./NoirReferenceHero";
import { NoirReferenceBestSellers } from "./NoirReferenceBestSellers";
import type { NoirProduct } from "./ProductCardNoir";
import {
  NOIR_REF,
  NOIR_REF_PAGE_GUTTER,
  NOIR_REF_SHARED_IMAGE_BOX,
  NOIR_REF_UNIT_DECL,
  nu,
  nuMin,
} from "./noir-reference-metrics";

interface NoirReferenceTopFrameProps {
  /** Hero content (CMS) — forwarded to the hero panel. */
  hero: HomepageHeroContent;
  /** CTA click handler — forwarded to the hero. */
  onCtaClick?: (link: string) => void;
  /** Featured-products section content (CMS) for the best-sellers row. */
  bestSellersContent: HomepageFeaturedProductsContent;
  /** Featured products data (fetched dynamically). */
  featuredProducts?: NoirProduct[];
  /** Loading state for the featured products. */
  featuredProductsLoading?: boolean;
}

/**
 * NoirReferenceTopFrame — the Noir landing's top composition, rebuilt as a
 * dedicated pixel-matched clone of the design reference.
 *
 * This replaces NoirTopExperience wholesale. It shares no geometry with the
 * generic Noir section/card system: the navbar row, hero panel, best-sellers
 * row and product card are all NoirReference* components that exist only for
 * this frame, so matching the reference cannot regress the Noir shop, product
 * or sorting pages — let alone the other four demos.
 *
 * ── How the geometry is encoded ──────────────────────────────────────────
 *
 * Every measurement was read off the reference screenshot at a 1344px
 * viewport, where the frame is 1312px wide (16px page gutter each side).
 * Hardcoding those pixels would only be right at 1344px, so the frame instead
 * publishes a CSS length `--nu` equal to ONE reference pixel:
 *
 *     --nu: calc(100cqw / 1312)
 *
 * `100cqw` resolves against the measuring wrapper — whose width IS the frame
 * width — so `--nu` is exactly 1px at the reference viewport and scales
 * linearly elsewhere. Descendants call `nu(54)` and land on the reference
 * pixel at 1344px while holding the reference ratio at every other width.
 * Heights are always `min-height`, so longer CMS copy grows a box instead of
 * being clipped.
 *
 * ── Frame stack (bottom to top) ──────────────────────────────────────────
 *
 *   L0  base floor          #0a0a0a
 *   L1  atmosphere          the CMS hero artwork, LIGHTLY softened, spanning
 *                           the whole frame — the warm continuation visible
 *                           behind the cards in the reference is literally
 *                           the same picture as the sharp hero artwork
 *   L2  scrim               shapes how much atmosphere reads at each band:
 *                           dark under the navbar, open across the hero,
 *                           part-open behind the cards, closed at the base
 *   L3  content             navbar -> hero panel -> glass shelf + cards
 *
 * The heavy blur belongs to the SHELF's backdrop-filter, not to L1. Blurring
 * the source layer produces a haze that merely sits in front of the frame;
 * blurring the backdrop produces glass, because the softening is derived from
 * the live picture at the moment it is composited. That distinction is the
 * whole difference between the reference's lower band and a fog overlay.
 *
 * All content is CMS/props-driven; this component contributes only chrome.
 */
export function NoirReferenceTopFrame({
  hero,
  onCtaClick,
  bestSellersContent,
  featuredProducts,
  featuredProductsLoading = false,
}: NoirReferenceTopFrameProps) {
  // Same resolution the hero panel performs — shared, not duplicated.
  const atmosphereImage = getNoirReferenceHeroImage(hero);
  const hasAtmosphere = Boolean(atmosphereImage);

  const frameStyle = {
    "--nu": NOIR_REF_UNIT_DECL,
    // Published so the hero panel's sharp copy maps onto the identical box.
    "--noir-img-w": NOIR_REF_SHARED_IMAGE_BOX.width,
    "--noir-img-h": NOIR_REF_SHARED_IMAGE_BOX.height,
    borderRadius: nuMin(NOIR_REF.frame.radius, 16),
    paddingBottom: nuMin(NOIR_REF.frame.bottomPad, 16),
  } as CSSProperties;

  return (
    <div
      style={{
        paddingInline: NOIR_REF_PAGE_GUTTER,
        paddingTop: NOIR_REF.frame.topGap,
      }}>
      {/* Measuring container. `--nu` inside the frame resolves `100cqw`
          against THIS element, so it must be the frame's parent — container
          query units never resolve against the container's own styles. */}
      <div
        className='mx-auto [container-type:inline-size]'
        style={{ maxWidth: NOIR_REF.frame.maxWidth }}>
        <div
          className={cn(
            "relative overflow-hidden bg-[#0a0a0a]",
            // Hairline as an INSET RING, not a border, so it costs no layout.
            // With a border the frame measured 718.1 against the reference's
            // 713 — 54 + 314 + 345 only sums to 713 if the hairline is free.
            // Composed with the outer drop shadow in one arbitrary value
            // because a second shadow utility would replace the first.
            "shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9),inset_0_0_0_1px_rgba(255,255,255,0.10)]",
          )}
          style={frameStyle}>
          {/* L1 — THE PICTURE. One copy of the CMS hero artwork mapped onto
              the shared box (frame width x frame height), blurred, spanning the
              navbar band, the hero panel and the best-sellers shelf. The hero
              panel paints a SHARP copy on exactly the same mapping, so this is
              not a separate atmosphere — it is the same photograph, and the
              hero is a clipped window onto it.

              Below md the frame is a stacked mobile layout whose height bears
              no relation to the nominal 713, so there the image simply covers
              the frame box. */}
          {hasAtmosphere && (
            <img
              src={atmosphereImage}
              alt=''
              aria-hidden='true'
              loading='lazy'
              className={cn(
                "pointer-events-none absolute inset-0 z-0 h-full w-full object-cover",
                // The atmosphere is only LIGHTLY softened — 14px, not 44px.
                // The heavy blur used to live here, which made this a fake
                // haze: 44px here + 24px shelf backdrop + 12px card backdrop
                // combined to ~51px, and at 51px across a 1312px frame the
                // picture has no structure left, so the shelf read as flat
                // fog. The glass does the blurring now (see the shelf below);
                // this layer's job is only to keep the navbar band and the
                // 14px strips beside the hero panel from competing with the
                // sharp hero copy. Contrast holds the darks down so the band
                // reads as an image rather than a wash.
                "opacity-[0.92] blur-[14px] saturate-[1.18] contrast-[1.12]",
                "md:inset-auto md:left-0 md:top-0",
                "md:w-(--noir-img-w) md:h-(--noir-img-h)",
              )}
              style={{
                objectPosition: NOIR_REF_SHARED_IMAGE_BOX.objectPosition,
                // See NoirReferenceHero: an unlayered global `img` rule in
                // pages/+Head.tsx outranks utility classes, so this must be
                // inline to keep both layers on one mapping.
                maxWidth: "none",
              }}
            />
          )}

          {/* L2 — vertical scrim. */}
          <div
            className='pointer-events-none absolute inset-0 z-0'
            style={{
              background:
                // Scrim budget across the shelf band, as PICTURE TRANSMISSION
                // rather than opacity: what survives is
                //   atmosphere opacity x (1 - scrim) x (1 - shelf fill).
                // At 0.42/0.52/0.66 under a 0.45 fill that was
                //   0.75 x 0.48 x 0.55 = 0.198 — the picture reading at 20% of
                // its value, which is why the band went dead grey-burgundy.
                // 0.20/0.28/0.44 under a 0.22 fill gives
                //   0.92 x 0.72 x 0.78 = 0.517, i.e. ~52%: the continuation is
                // clearly present, and the glass (not the scrim) is what
                // softens it. The 0% / 8% stops are unchanged so the navbar
                // band stays as dark as it was.
                "linear-gradient(to bottom, rgba(10,10,10,0.88) 0%, rgba(10,10,10,0.66) 8%, rgba(10,10,10,0.20) 48%, rgba(10,10,10,0.28) 72%, rgba(10,10,10,0.44) 100%)",
            }}
            aria-hidden='true'
          />

          {/* L3 — content. */}
          <div className='relative z-10'>
            <NoirReferenceNavbar />

            <NoirReferenceHero hero={hero} onCtaClick={onCtaClick} />

            {/* GLASS SHELF — the lower band sits on a translucent blurred
                surface so the shared atmosphere reads THROUGH glass: the
                backdrop blur softens the already-blurred artwork further, the
                near-black fill cools the band without flattening it, and the
                top hairline is the sheen where the glass edge catches light.

                blur + saturate on the BACKDROP is the frosted-glass recipe:
                the blur samples the live picture behind the shelf, and the
                saturate puts back the chroma that averaging pixels together
                takes out. Without that saturate a backdrop blur always drifts
                toward grey, which is half of why the band looked muddy — the
                warm brown/red was being averaged into neutral.

                The fill is only 22% now, not 45%. It exists to seat the glass,
                not to tint the band; at 45% it was doing the job the scrim
                should do and killing the picture with it. Ordering matters:
                the fill sits ON the blurred backdrop, so every point of alpha
                here costs picture transmission directly.

                The shelf contributes NO box metrics — no padding, margin or
                border-width — so the row's reference geometry (gutter, gap,
                bottom flush) stays owned entirely by the row itself. */}
            <div className='relative bg-[#0b0b0c]/22 backdrop-blur-[18px] backdrop-saturate-[1.15]'>
              <div
                className='pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-linear-to-r from-transparent via-white/10 to-transparent'
                aria-hidden='true'
              />
              <NoirReferenceBestSellers
                content={bestSellersContent}
                products={featuredProducts}
                isLoading={featuredProductsLoading}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

NoirReferenceTopFrame.displayName = "NoirReferenceTopFrame";
