import type { HomepageHeroContent } from "#root/shared/types/homepage-content";
import type { HomepageFeaturedProductsContent } from "#root/shared/types/homepage-content";
import type { FeaturedProduct } from "../home/HomeFeaturedProducts";
import { cn } from "#root/lib/utils";
import { NoirNavbar } from "./NoirNavbar";
import { NoirHero, getNoirHeroImage } from "./NoirHero";
import { NoirBestSellers } from "./NoirBestSellers";
import {
  NOIR_FRAME_SHADOW_CLASSES,
  NOIR_FRAME_SURFACE_CLASSES,
} from "./noir-tokens";

interface NoirTopExperienceProps {
  /** Hero content (CMS) — forwarded to the embedded NoirHero. */
  hero: HomepageHeroContent;
  /** CTA click handler — forwarded to hero. */
  onCtaClick?: (link: string) => void;
  /** Featured-products section content (CMS) for the tucked-in best sellers. */
  bestSellersContent: HomepageFeaturedProductsContent;
  /** Featured products data (fetched dynamically). */
  featuredProducts?: FeaturedProduct[];
}

/**
 * NoirTopExperience — Noir landing "one framed composition".
 *
 * Wraps the embedded navbar, hero, and best-sellers row inside a single
 * premium glass frame so navbar → hero → cards read as one atmosphere.
 * The announcement bar stays OUTSIDE (rendered by NoirChrome); the global
 * navbar is suppressed via NoirChrome's `hideNavbar` on the landing.
 *
 * Everything is CMS/props-driven — this component adds only chrome. Its
 * atmosphere is the SAME CMS hero image already flowing into the landing:
 * a heavily blurred, dimmed copy spanning the whole frame supplies the
 * warmth/tint that fuses navbar → hero → cards into one composition. When
 * no CMS hero image exists it gracefully falls back to the gradient surface.
 */
export function NoirTopExperience({
  hero,
  onCtaClick,
  bestSellersContent,
  featuredProducts,
}: NoirTopExperienceProps) {
  // Same resolution NoirHero performs — shared, not duplicated.
  const atmosphereImage = getNoirHeroImage(hero);
  const hasAtmosphere = Boolean(atmosphereImage);

  return (
    <div className='px-3 md:px-4 pt-1'>
      <div
        className={cn(
          "relative mx-auto max-w-350",
          "rounded-2xl md:rounded-3xl border border-white/10 overflow-hidden",
          NOIR_FRAME_SHADOW_CLASSES,
          // L0 base floor: solid #0d0d0d under the atmosphere image. Sits one
          // step above the page's pure black so the frame's rounded top edge
          // stays legible against the canvas (the reference frame reads as a
          // slightly lifted surface, not as page background). Below the navbar
          // the atmosphere + scrim dominate, so this is only visible up top.
          // When no hero image exists, keep the original gradient fallback.
          hasAtmosphere ? "bg-[#0d0d0d]" : NOIR_FRAME_SURFACE_CLASSES,
        )}>
        {/* L1 — CONTINUOUS ATMOSPHERE. One blurred image layer owned by the
            frame, spanning the ENTIRE framed box: navbar band, hero, and the
            Best Sellers section beneath it. Source is the same CMS hero image
            the sharp hero artwork uses (getNoirHeroImage), so the continuation
            below the hero panel is literally the same picture — that shared
            source is what connects the top and bottom of the frame while the
            hero keeps its own bordered panel, exactly as the reference does.
            Lazy + decorative so it never competes with the hero's sharp LCP
            image. */}
        {hasAtmosphere && (
          <div
            className='absolute inset-0 z-0 overflow-hidden pointer-events-none'
            aria-hidden='true'>
            <img
              src={atmosphereImage}
              alt=''
              aria-hidden='true'
              loading='lazy'
              className='absolute inset-0 w-full h-full object-cover blur-[44px] scale-110 opacity-65 saturate-[1.2]'
            />
          </div>
        )}

        {/* L2 — vertical scrim shaping how much atmosphere reads at each band.
            Dark at 0% so the navbar sits flat and legible, opening up through
            the hero, staying open across the lower section so the blurred
            continuation is visible behind Best Sellers, then closing down at
            the frame's bottom edge toward the reference's near-black. */}
        <div
          className='absolute inset-0 z-0 pointer-events-none'
          style={{
            background:
              "linear-gradient(to bottom, rgba(10,10,10,0.90) 0%, rgba(10,10,10,0.72) 8%, rgba(10,10,10,0.40) 52%, rgba(10,10,10,0.80) 100%)",
          }}
          aria-hidden='true'
        />

        {/* Composition — navbar row, hero, best sellers tucked beneath. */}
        <div className='relative z-10'>
          <NoirNavbar variant='embedded' />

          {/* Hero sits in its OWN rounded panel, inset inside the frame
              (reference: ~13px each side) — the frame and the panel are two
              nested containers, not one. Horizontal inset only: adding bottom
              padding here would push the Best Sellers section down, so the gap
              below the panel stays owned by NoirProductSection as before. */}
          <div className='px-3 md:px-3.5'>
            <NoirHero hero={hero} onCtaClick={onCtaClick} embedded />
          </div>

          {/* GLASS SHELF — the lower section sits on a translucent, blurred
              surface so the shared atmosphere behind it reads THROUGH glass:
              backdrop-blur softens the already-blurred atmosphere further, the
              faint white fill lifts the surface off the frame, and the top
              hairline is the sheen where the glass edge catches light.

              The shelf itself contributes no box metrics — no padding, no
              margin, no border-width — so the row's own reference geometry
              (gutter, gap, bottom flush) is owned entirely by
              NoirBestSellers. */}
          <div className='relative backdrop-blur-xl bg-white/2'>
            <div
              className='absolute inset-x-0 top-0 h-px z-10 pointer-events-none bg-linear-to-r from-transparent via-white/10 to-transparent'
              aria-hidden='true'
            />
            <NoirBestSellers
              content={bestSellersContent}
              products={featuredProducts}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

NoirTopExperience.displayName = "NoirTopExperience";
