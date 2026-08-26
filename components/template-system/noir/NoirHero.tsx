import type { MouseEvent } from "react";
import type { HomepageHeroContent } from "#root/shared/types/homepage-content";
import { useMinimalI18n } from "#root/lib/i18n/MinimalI18nContext";
import { cn } from "#root/lib/utils";
import {
  NOIR_ACCENT_BG_CLASSES,
  NOIR_DISPLAY_FONT_CLASSES,
} from "./noir-tokens";

/** Fallbacks for the optional hero fields (used when CMS leaves them empty). */
const NOIR_HERO_EYEBROW_FALLBACK = "SOLID PERFUME";
const NOIR_HERO_SECONDARY_CTA_TEXT_FALLBACK = "TAKE THE QUIZ";
const NOIR_HERO_SECONDARY_CTA_LINK_FALLBACK = "/quiz";

interface NoirHeroProps {
  hero: HomepageHeroContent;
  onCtaClick?: (link: string) => void;
  /**
   * When true the hero is rendered INSIDE the landing's framed top
   * experience (NoirTopExperience): it drops its own rounded container,
   * border, surface gradient, outer shadow, top highlight, red glow, and
   * horizontal margins — the frame owns those. The sharp photo is alpha-
   * masked (not painted over) so the frame's blurred atmosphere shows
   * through its dissolved edges, and the composition is made more compact.
   * Default false = original standalone look, unchanged.
   */
  embedded?: boolean;
}

/**
 * getNoirHeroImage — resolves the CMS hero image URL the Noir landing
 * already uses (desktop background → first hero slide fallback → none).
 * Shared by NoirHero and NoirTopExperience's atmosphere layer so the
 * resolution isn't duplicated.
 */
export function getNoirHeroImage(hero: HomepageHeroContent): string {
  return hero.backgroundImage || hero.heroSlides?.[0]?.imageUrl || "";
}

/**
 * NoirHero — cinematic hero inside a large rounded dark-glass container.
 * Red eyebrow (hero.eyebrow) → condensed uppercase display headline →
 * subcopy → solid-red primary CTA + filled dark-grey secondary CTA
 * (hero.secondaryCtaText / hero.secondaryCtaLink). Hero image renders as a
 * composed panel on the end side (CMS backgroundImage, mobile variant via
 * <picture>); stacks below text on mobile. Renders nothing when the section
 * is disabled. All three optional hero fields fall back to the Noir
 * reference defaults declared above.
 */
export function NoirHero({
  hero,
  onCtaClick,
  embedded = false,
}: NoirHeroProps) {
  const { t, locale } = useMinimalI18n();
  const isAr = locale === "ar";
  const track = isAr ? "" : "tracking-[0.3em]";

  if (!hero.enabled) return null;

  const desktopImage = getNoirHeroImage(hero);
  const mobileImage = hero.mobileBackgroundImage || desktopImage;
  const hasImage = Boolean(desktopImage);

  // Standalone image-panel dissolve colors (opaque panel surface). Embedded
  // mode no longer paints these overlays — it alpha-masks the sharp image so
  // the frame's blurred atmosphere shows through the dissolved edges instead.
  const imageFadeFrom = "from-[#0e0e0e]";
  const imageFadeBottom = "from-[#0a0a0a]";

  // Embedded-only: alpha mask on the sharp hero image, MOBILE ONLY.
  //
  // On mobile the photo stacks below the text as a grid item, so its top edge
  // is faded into the panel. On DESKTOP the CMS asset is full-width hero
  // artwork that already carries its own dark negative space on the
  // inline-start side, and the image is painted as the panel's full-width
  // background — so it gets NO mask at all. A mask there would erase the
  // artwork's own edges. Desktop text contrast is handled by the scrim layer
  // below the text instead (a paint overlay, not an alpha mask).
  //
  // Scoped with `max-md:` so the vertical fade cannot leak onto the desktop
  // full-panel image. Standalone mode gets no mask (empty string).
  //
  // Desktop DOES take one short bottom fade (last 12%) so the sharp artwork
  // dissolves into the frame's blurred continuation rather than stopping on a
  // hard edge — the seam between the hero and the section below.
  const embeddedImageMask = embedded
    ? cn(
        "max-md:[mask-image:linear-gradient(to_bottom,transparent_0%,#000_45%,#000_85%,transparent_100%)]",
        "max-md:[-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,#000_45%,#000_85%,transparent_100%)]",
        "md:[mask-image:linear-gradient(to_bottom,#000_0%,#000_88%,transparent_100%)]",
        "md:[-webkit-mask-image:linear-gradient(to_bottom,#000_0%,#000_88%,transparent_100%)]",
      )
    : "";

  const handleCta = (link: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (onCtaClick) {
      e.preventDefault();
      onCtaClick(link);
    }
  };

  const ctaLink = hero.ctaLink || "/shop";
  const eyebrowText = hero.eyebrow || NOIR_HERO_EYEBROW_FALLBACK;
  const secondaryCtaText =
    hero.secondaryCtaText || NOIR_HERO_SECONDARY_CTA_TEXT_FALLBACK;
  const secondaryCtaLink =
    hero.secondaryCtaLink || NOIR_HERO_SECONDARY_CTA_LINK_FALLBACK;

  // Shared button geometry — reference: ~34px tall, 28px side padding.
  const ctaBaseClasses = cn(
    "inline-flex items-center justify-center px-7 py-3 rounded-full",
    "text-[10.5px] leading-none uppercase font-medium transition-colors duration-300",
    isAr ? "" : "tracking-[0.12em]",
    NOIR_DISPLAY_FONT_CLASSES,
  );

  return (
    <section
      className={cn(
        "relative overflow-hidden",
        !embedded && "px-4 md:px-8 pt-6 md:pt-8 pb-3 md:pb-4",
      )}>
      <div className={cn("relative", !embedded && "mx-auto max-w-7xl")}>
        <div
          className={cn(
            "relative grid items-stretch gap-0 overflow-hidden",
            embedded
              ? // Nested hero panel: its own rounded surface + hairline inside
                // the outer frame (reference has TWO nested containers).
                // Height is a PROPORTIONAL FLOOR, never a cap: 23.4vw matches
                // the reference's 315px-at-1344px ratio and scales with the
                // viewport, bounded so it stays sane on very small/large
                // screens. Because it is min-height, longer CMS copy always
                // grows the panel instead of being clipped by overflow-hidden.
                cn(
                  // Nested hero panel with its own hairline border, inset
                  // inside the outer frame — the reference has TWO nested
                  // containers, not one continuous surface.
                  "rounded-xl border border-white/8",
                  // Mobile keeps an opaque surface (text sits directly on it).
                  // Desktop goes TRANSLUCENT toward the bottom so the frame's
                  // shared blurred atmosphere shows through the panel's lower
                  // edge — that is what connects the hero to the continuation
                  // behind Best Sellers without dissolving the panel itself.
                  "bg-linear-to-b from-[#0e0e0e] to-[#0a0a0a]",
                  "md:from-[#0e0e0e]/85 md:to-[#0a0a0a]/45",
                  "min-h-110 md:min-h-[clamp(17.5rem,23.4vw,24rem)]",
                )
              : cn(
                  "rounded-2xl border border-white/10",
                  "bg-linear-to-b from-[#121212] to-[#0a0a0a]",
                  "shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)]",
                  "min-h-120 md:min-h-140 md:max-h-160",
                ),
            hasImage ? (embedded ? "md:grid-cols-[45%_55%]" : "md:grid-cols-2") : "",
          )}>
          {/* Top-edge highlight — glass panel catchlight (frame owns it when embedded) */}
          {!embedded && (
            <div
              className='absolute inset-x-0 top-0 h-px z-10 pointer-events-none bg-linear-to-r from-transparent via-white/25 to-transparent'
              aria-hidden='true'
            />
          )}
          {/* Ambient red rim-light glow. Standalone: a wide bottom-start wash
              bleeding under the column boundary. Embedded: the reference's
              discrete soft orb clipped by the panel's inline-start edge,
              ~70% down the panel. `-translate-x-1/2` is mirrored for RTL
              because translate utilities don't auto-flip.
              Embedded desktop lifts it to z-2 so it reads ON TOP of the
              full-panel background image (which sits at z-0) while staying
              under the text at z-10. Mobile keeps z-0 — there the image is a
              stacked grid item and the previous paint order is preserved. */}
          <div
            className={cn(
              "pointer-events-none absolute rounded-full blur-3xl",
              embedded
                ? "z-0 md:z-2 top-[70%] start-[6%] w-50 h-50 -translate-x-1/2 -translate-y-1/2 rtl:translate-x-1/2"
                : "z-0 -bottom-1/3 -start-1/5 w-[60%] aspect-square",
            )}
            style={{
              background: embedded
                ? "radial-gradient(circle, rgba(232,17,45,0.38) 0%, rgba(232,17,45,0.12) 45%, transparent 72%)"
                : "radial-gradient(circle, rgba(232,17,45,0.16) 0%, rgba(232,17,45,0.04) 45%, transparent 70%)",
            }}
            aria-hidden='true'
          />

          {/* ── Text panel ── */}
          <div
            className={cn(
              // min-w-0 defeats the grid item's default `min-width: auto`, so
              // a long headline can never force this column wider than its
              // 45% track (which would push the image column out of the frame).
              "relative z-10 flex flex-col justify-center min-w-0",
              embedded
                ? // Reference-style inline inset that scales with the column.
                  // Held at 20% rather than the reference's literal ~26% to
                  // leave headroom for CMS titles longer than the reference's.
                  "px-6 py-10 md:ps-[20%] md:pe-8 md:py-3 gap-4 md:gap-4.5"
                : "px-6 py-12 md:px-12 md:py-14 gap-5 md:gap-6",
              !hasImage && "items-center text-center mx-auto max-w-3xl",
            )}>
            {/* Eyebrow — no leading rule in the reference; the label sits
                flush with the headline's inline-start edge. */}
            <p
              className={cn(
                "text-[11px] uppercase text-[#E8112D] font-semibold",
                isAr ? "" : embedded ? "tracking-[0.19em]" : track,
                NOIR_DISPLAY_FONT_CLASSES,
              )}>
              {eyebrowText}
            </p>

            <h1
              className={cn(
                // wrap-break-word + min-w-0: an unbreakable word longer than
                // the text column wraps instead of being cut off by the panel's
                // overflow-hidden (which the rounded corners and image mask
                // both require).
                "uppercase text-white font-bold text-balance min-w-0 wrap-break-word",
                embedded
                  ? "leading-[1.01] text-[clamp(1.875rem,4.9vw,4.125rem)]"
                  : cn(
                      "leading-[0.98] text-[clamp(2.5rem,5.5vw,4.5rem)]",
                      isAr ? "" : "tracking-[0.01em]",
                    ),
                NOIR_DISPLAY_FONT_CLASSES,
              )}>
              {hero.title}
            </h1>

            {hero.subtitle && (
              <p
                className={cn(
                  "uppercase",
                  embedded
                    ? cn(
                        "text-[10.5px] leading-[1.75] max-w-[50ch] text-white/72",
                        isAr ? "" : "tracking-[0.05em]",
                      )
                    : cn(
                        "text-[11px] md:text-xs leading-[1.9] max-w-[42ch] text-white/60",
                        isAr ? "" : "tracking-[0.16em]",
                      ),
                  !hasImage && "mx-auto",
                )}>
                {hero.subtitle}
              </p>
            )}

            <div
              className={cn(
                "flex flex-col sm:flex-row gap-3 sm:gap-2.75 pt-0.5",
                !hasImage && "justify-center",
              )}>
              {/* Primary — solid red pill, no icon (the reference has none). */}
              <a
                href={ctaLink}
                onClick={handleCta(ctaLink)}
                className={cn(
                  ctaBaseClasses,
                  "text-white",
                  NOIR_ACCENT_BG_CLASSES,
                )}>
                {hero.ctaText || t("shop_now")}
              </a>
              {/* Secondary — FILLED dark grey pill, not a transparent outline. */}
              <a
                href={secondaryCtaLink}
                onClick={handleCta(secondaryCtaLink)}
                className={cn(
                  ctaBaseClasses,
                  "bg-[#212121] border border-white/10 text-white",
                  "hover:bg-[#2a2a2a] hover:border-white/20",
                )}>
                {secondaryCtaText}
              </a>
            </div>
          </div>

          {/* ── Image panel (stacks below text on mobile) ── */}
          {hasImage && (
            <div
              className={cn(
                "relative min-h-80 order-last",
                embedded
                  ? // Desktop: leave the grid flow entirely and become the
                    // panel's FULL-WIDTH background. The CMS asset is complete
                    // hero artwork (dark negative space inline-start, product
                    // inline-end), so confining it to the 55% track rendered it
                    // at 55% scale and pushed the product too far end-ward.
                    // Absolute here resolves against the panel, which is
                    // `relative`. The grid keeps its 45%/55% tracks — track 2
                    // simply becomes empty, so the text column is unchanged.
                    // Below md it stays a stacked grid item exactly as before.
                    "md:absolute md:inset-0 md:z-0 md:min-h-0"
                  : // Standalone keeps the original grid-item image panel.
                    "md:min-h-full bg-black",
              )}>
              <picture>
                {mobileImage !== desktopImage && (
                  <source media='(max-width: 767px)' srcSet={mobileImage} />
                )}
                <img
                  src={desktopImage}
                  alt={hero.title}
                  className={cn(
                    "absolute inset-0 w-full h-full object-cover",
                    // Embedded desktop only: the panel is ~4:1 while the CMS
                    // artwork is far taller, so object-cover discards a large
                    // share of its height. The default `50% 50%` centred that
                    // crop window and cut the top of the product/hand off.
                    // Biasing to 68% moves the retained window UP the source
                    // image — revealing more of its top and seating the
                    // product lower inside the panel. Horizontal stays 50%,
                    // so nothing needs mirroring for RTL. Mobile and
                    // standalone keep the default `50% 50%`.
                    embedded && "md:object-[50%_68%]",
                    embeddedImageMask,
                  )}
                  fetchPriority='high'
                />
              </picture>

              {/* Embedded desktop scrim — a PAINT overlay (not an alpha mask)
                  between the background image and the text. Darkens the
                  inline-start side so the headline keeps contrast whatever
                  artwork a merchant uploads, and reproduces the reference's
                  dark negative space. Mirrored for RTL, since gradient
                  directions don't auto-flip. */}
              {embedded && (
                <div
                  className={cn(
                    "hidden md:block absolute inset-0 z-1 pointer-events-none",
                    "bg-[linear-gradient(to_right,rgba(10,10,10,0.92)_0%,rgba(10,10,10,0.55)_38%,transparent_62%)]",
                    "rtl:bg-[linear-gradient(to_left,rgba(10,10,10,0.92)_0%,rgba(10,10,10,0.55)_38%,transparent_62%)]",
                  )}
                  aria-hidden='true'
                />
              )}
              {/* Standalone: dissolve the photo into the opaque glass panel via
                  overlay fades. Embedded mode masks the sharp image instead
                  (see embeddedImageMask above), so these paint layers are
                  skipped and the blurred atmosphere shows through. */}
              {!embedded && (
                <>
                  {/* Inline-start fade (desktop, side-by-side) — wide, matches surface */}
                  <div
                    className={cn(
                      "absolute inset-y-0 start-0 w-[55%] pointer-events-none bg-linear-to-r rtl:bg-linear-to-l to-transparent hidden md:block",
                      imageFadeFrom,
                    )}
                    aria-hidden='true'
                  />
                  {/* Top fade (mobile, stacked below text) */}
                  <div
                    className={cn(
                      "absolute inset-x-0 top-0 h-[55%] pointer-events-none bg-linear-to-b to-transparent md:hidden",
                      imageFadeFrom,
                    )}
                    aria-hidden='true'
                  />
                  {/* Bottom fade — matches container bottom surface */}
                  <div
                    className={cn(
                      "absolute inset-x-0 bottom-0 h-[30%] pointer-events-none bg-linear-to-t to-transparent",
                      imageFadeBottom,
                    )}
                    aria-hidden='true'
                  />
                </>
              )}
              {/* Very subtle full-panel vignette — standalone only; in embedded
                  mode it would re-darken the very edges the mask is opening. */}
              {!embedded && (
                <div
                  className='absolute inset-0 pointer-events-none'
                  style={{
                    background:
                      "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.35) 100%)",
                  }}
                  aria-hidden='true'
                />
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
