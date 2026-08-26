import type { CSSProperties, MouseEvent } from "react";
import type { HomepageHeroContent } from "#root/shared/types/homepage-content";
import { useMinimalI18n } from "#root/lib/i18n/MinimalI18nContext";
import { cn } from "#root/lib/utils";
import { NOIR_DISPLAY_FONT_CLASSES } from "./noir-tokens";
import {
  NOIR_REF,
  NOIR_REF_HERO_IMAGE_OFFSET,
  nu,
  nuMin,
} from "./noir-reference-metrics";

/** Fallbacks for the optional hero fields the CMS may leave empty. */
const NOIR_HERO_EYEBROW_FALLBACK = "SOLID PERFUME";
const NOIR_HERO_SECONDARY_CTA_TEXT_FALLBACK = "TAKE THE QUIZ";
const NOIR_HERO_SECONDARY_CTA_LINK_FALLBACK = "/quiz";

/**
 * getNoirReferenceHeroImage — resolves the CMS hero artwork the frame uses
 * (desktop background → first hero slide → none). Shared with the frame's
 * atmosphere layer so the resolution is defined once.
 */
export function getNoirReferenceHeroImage(hero: HomepageHeroContent): string {
  return hero.backgroundImage || hero.heroSlides?.[0]?.imageUrl || "";
}

interface NoirReferenceHeroProps {
  hero: HomepageHeroContent;
  onCtaClick?: (link: string) => void;
}

/**
 * NoirReferenceHero — the hero panel of the Noir reference top frame.
 *
 * A dedicated clone of the reference composition, not a variant of the old
 * NoirHero: one rounded panel inset 14px inside the frame, the CMS artwork
 * painted as the panel's full-bleed background with a directional scrim, and
 * a top-aligned text block starting 150px in from the panel's inline-start
 * edge.
 *
 * Reference geometry (1344px viewport, 1312px frame):
 *   panel      1284 x 314, radius 16, inset 14 each side, flush under nav
 *   text       starts x = 150 (panel-relative), y = 44 (panel-relative)
 *   eyebrow    13px, 0.19em, #E8112D
 *   headline   60px with a 67px line BOX, wraps at 430px
 *   subcopy    13px with an 18px line box, wraps at 340px
 *   CTAs       34px tall, 28px side padding, 10px apart, pill radius
 *
 * The stack sums to the panel exactly:
 *   44 + 13 + 5.5 + 134 + 9 + 36 + 18 + 34 + 20 = 313.5
 *
 * `minHeight` (never a fixed height) means longer CMS copy grows the panel
 * instead of being clipped by the rounded overflow. That floor is applied as
 * a md:-overridable CLASS, not an inline `max()` — an inline floor silently
 * beat the reference height on desktop and inflated the panel by 74px.
 */
export function NoirReferenceHero({
  hero,
  onCtaClick,
}: NoirReferenceHeroProps) {
  const { t, locale } = useMinimalI18n();
  const isAr = locale === "ar";
  const m = NOIR_REF.hero;

  if (!hero.enabled) return null;

  const desktopImage = getNoirReferenceHeroImage(hero);
  const mobileImage = hero.mobileBackgroundImage || desktopImage;
  const hasImage = Boolean(desktopImage);

  const ctaLink = hero.ctaLink || "/shop";
  const eyebrowText = hero.eyebrow || NOIR_HERO_EYEBROW_FALLBACK;
  const secondaryCtaText =
    hero.secondaryCtaText || NOIR_HERO_SECONDARY_CTA_TEXT_FALLBACK;
  const secondaryCtaLink =
    hero.secondaryCtaLink || NOIR_HERO_SECONDARY_CTA_LINK_FALLBACK;

  const handleCta = (link: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (onCtaClick) {
      e.preventDefault();
      onCtaClick(link);
    }
  };

  const ctaBaseClasses = cn(
    "inline-flex items-center justify-center rounded-full whitespace-nowrap",
    "uppercase font-medium leading-none transition-colors duration-300",
    "h-11 md:h-(--noir-hero-cta-h)",
    isAr ? "" : "tracking-[0.12em]",
    NOIR_DISPLAY_FONT_CLASSES,
  );
  // The CTA is the one metric mobile needs MORE of than desktop (44px tap
  // target vs the reference's 34), so it cannot be an inline `max()` — that
  // would raise desktop too. It takes the same var + `md:` class shape as the
  // panel height below.
  const ctaStyle = {
    "--noir-hero-cta-h": nu(m.ctaHeight),
    paddingInline: nuMin(m.ctaPadX, 20),
    fontSize: `max(10px, ${nu(m.ctaSize)})`,
  } as CSSProperties;

  return (
    <section
      className='relative'
      style={{ paddingInline: nuMin(m.insetX, 8) }}>
      <div
        className={cn(
          "relative overflow-hidden",
          // OUTER glow only. The inset ring that used to live here never
          // rendered: inset box-shadow paints with the element's BACKGROUND,
          // and the artwork below is `absolute inset-0 z-0` — a positioned
          // descendant, which paints above it. Measured edge profiles showed
          // no rim pixel at all (left edge fell 11.6 -> 7.6 across the border,
          // i.e. darker, not brighter). The rim now lives in the RIM SHEEN
          // overlay further down, which sits above the artwork.
          //
          // Outer shadows are never occluded by children, so they stay here:
          // a hairline contact ring, a soft warm halo that lifts the panel off
          // the frame's atmosphere, and the original grounding shadow.
          "shadow-[0_0_0_1px_rgba(255,255,255,0.045),0_0_34px_-12px_rgba(255,238,226,0.13),0_22px_54px_-30px_rgba(0,0,0,0.85)]",
          // Panel surface. Sits under the artwork; visible wherever the
          // artwork is scrimmed or absent.
          "bg-linear-to-b from-[#0e0e0e] to-[#0a0a0a]",
          // Mobile floor lives HERE, as a class the md: breakpoint overrides.
          // As an inline `max(26rem, nu(314))` it resolved to max(416px, 314px)
          // on desktop and inflated the panel by 74px, shifting every box below
          // the hero down with it.
          "min-h-88 md:min-h-(--noir-hero-min-h)",
        )}
        style={
          {
            borderRadius: nuMin(m.radius, 12),
            "--noir-hero-min-h": nu(m.minHeight),
            "--noir-hero-img-x": nu(NOIR_REF_HERO_IMAGE_OFFSET.x),
            "--noir-hero-img-y": nu(NOIR_REF_HERO_IMAGE_OFFSET.y),
          } as CSSProperties
        }>
        {/* ── Artwork: the SHARP WINDOW onto the frame's picture ────────
            This is not a second crop of the hero image — it is the same
            photograph on the same mapping as the frame's blurred copy. The
            image is sized to the shared box (frame width x frame height) and
            offset back by the panel's own displacement from the frame origin
            (-14 inline, -54 block, i.e. the panel inset and the navbar). The
            panel's `overflow: hidden` then clips it to the hero rectangle,
            so the hero is literally a window cut into the frame's picture and
            the two can never drift apart.

            Below md the frame is a stacked mobile layout whose height bears no
            relation to the nominal 713, so there the image just covers the
            panel. */}
        {hasImage && (
          <picture>
            {mobileImage !== desktopImage && (
              <source media='(max-width: 767px)' srcSet={mobileImage} />
            )}
            <img
              src={desktopImage}
              alt=''
              aria-hidden='true'
              className={cn(
                "absolute inset-0 z-0 h-full w-full object-cover",
                "md:inset-auto md:left-(--noir-hero-img-x) md:top-(--noir-hero-img-y)",
                "md:w-(--noir-img-w) md:h-(--noir-img-h)",
              )}
              style={{
                objectPosition: NOIR_REF.frame.imageObjectPosition,
              // maxWidth is set INLINE, not via a utility. pages/+Head.tsx
              // injects an UNLAYERED `img { max-width: 100% }`, and unlayered
              // CSS outranks every @layer utilities rule regardless of
              // specificity — so md:max-w-none could never win. That file is
              // global to all five demos, so it is not ours to change; an
              // inline declaration beats it without touching anything shared.
              // Without this the sharp copy clamps to the panel's 1284px and
              // the shared mapping silently breaks.
                maxWidth: "none",
              }}
              fetchPriority='high'
            />
          </picture>
        )}

        {/* Directional scrim — darkens the inline-start side so the headline
            keeps contrast over any artwork a merchant uploads, and recreates
            the reference's dark negative space. Mirrored for RTL because
            gradient directions do not auto-flip. */}
        {hasImage && (
          <div
            className={cn(
              "pointer-events-none absolute inset-0 z-1",
              "bg-[linear-gradient(to_right,rgba(8,8,8,0.95)_0%,rgba(8,8,8,0.78)_26%,rgba(8,8,8,0.34)_46%,transparent_64%)]",
              "rtl:bg-[linear-gradient(to_left,rgba(8,8,8,0.95)_0%,rgba(8,8,8,0.78)_26%,rgba(8,8,8,0.34)_46%,transparent_64%)]",
            )}
            aria-hidden='true'
          />
        )}

        {/* Mobile scrim — below md the text sits over the artwork in a single
            narrow column, where a horizontal gradient gives it no cover, so a
            vertical one takes over. Desktop keeps the directional scrim. */}
        {hasImage && (
          <div
            className='pointer-events-none absolute inset-0 z-1 bg-[linear-gradient(to_bottom,rgba(8,8,8,0.92)_0%,rgba(8,8,8,0.72)_55%,rgba(8,8,8,0.5)_100%)] md:hidden'
            aria-hidden='true'
          />
        )}

        {/* ── RIM SHEEN ────────────────────────────────────────────────────
            The panel's glass edge. This is an OVERLAY rather than an inset
            shadow on the panel itself because the artwork is a positioned
            descendant and would paint over any inset shadow (see the panel's
            className). z-5 puts it above the artwork and both scrims, below
            the text at z-10, so it can never touch legibility.

            Contributes no layout: absolutely positioned, inset-0,
            pointer-events-none, and it inherits the panel's radius.

            The stack, outside-in:
              1  hairline rim, warm-neutral white — the glass edge itself
              2  top sheen — a single bright line, light arriving from above
              3  left  lateral bloom
              4  right lateral bloom
              5  base lift, weakest of the four

            Blooms 3-5 use a large blur with a large NEGATIVE spread. That is
            what concentrates them: the spread pulls the shadow's casting edge
            back so only its falloff reaches inside, giving a perimeter glow
            that dies within ~20px and leaves the centre untouched. A positive
            spread here would flood the panel and read as fog. */}
        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-5",
            "shadow-[inset_0_0_0_1px_rgba(255,251,247,0.14),inset_0_1px_0_0_rgba(255,255,255,0.10),inset_24px_0_30px_-28px_rgba(255,246,238,0.50),inset_-24px_0_30px_-28px_rgba(255,246,238,0.50),inset_0_-18px_24px_-23px_rgba(255,246,238,0.17)]",
          )}
          style={{ borderRadius: nu(m.radius) }}
          aria-hidden='true'
        />

        {/* ── Text block ── */}
        <div
          className={cn(
            "relative z-10 flex min-w-0 flex-col items-start",
            // Same floor problem as the panel height: max(2.5rem, nu(20))
            // resolved to 40px on desktop against the reference's 20px.
            "pb-10 md:pb-(--noir-hero-pb)",
          )}
          style={
            {
              paddingInlineStart: `max(1.5rem, ${nu(m.textStart)})`,
              paddingInlineEnd: `max(1.5rem, ${nu(40)})`,
              paddingTop: `max(2.5rem, ${nu(m.textTop)})`,
              "--noir-hero-pb": nu(m.textBottom),
            } as CSSProperties
          }>
          <p
            className={cn(
              "font-semibold uppercase leading-none text-[#E8112D]",
              isAr ? "" : "tracking-[0.19em]",
              NOIR_DISPLAY_FONT_CLASSES,
            )}
            style={{ fontSize: `max(11px, ${nu(m.eyebrowSize)})` }}>
            {eyebrowText}
          </p>

          <h1
            className={cn(
              // wrap-break-word + min-w-0: an unbreakable word longer than the
              // wrap width wraps instead of being clipped by the panel's
              // rounded overflow.
              "min-w-0 wrap-break-word font-bold uppercase text-white",
              NOIR_DISPLAY_FONT_CLASSES,
            )}
            style={{
              marginTop: nuMin(m.eyebrowGap, 5.5),
              fontSize: `clamp(2rem, ${nu(m.headlineSize)}, 4.5rem)`,
              // Explicit line BOX. The unitless 1.117 rendered a 73px pitch in
              // Antonio against the reference's measured 67px.
              lineHeight: nuMin(m.headlineLineHeight, 36),
              maxWidth: `max(18rem, ${nu(m.headlineMaxWidth)})`,
            }}>
            {hero.title}
          </h1>

          {hero.subtitle && (
            <p
              className={cn(
                "uppercase text-white/70",
                isAr ? "" : "tracking-[0.05em]",
              )}
              style={{
                marginTop: nuMin(m.headlineGap, 9),
                fontSize: `max(11px, ${nu(m.subSize)})`,
                lineHeight: nuMin(m.subLineHeight, 17),
                maxWidth: `max(16rem, ${nu(m.subMaxWidth)})`,
              }}>
              {hero.subtitle}
            </p>
          )}

          <div
            className='flex flex-col sm:flex-row'
            style={{ marginTop: nuMin(m.subGap, 16), gap: nuMin(m.ctaGap, 10) }}>
            {/* Primary — solid red pill, no icon (the reference has none). */}
            <a
              href={ctaLink}
              onClick={handleCta(ctaLink)}
              className={cn(
                ctaBaseClasses,
                "bg-[#E8112D] text-white hover:bg-[#C40E26]",
              )}
              style={ctaStyle}>
              {hero.ctaText || t("shop_now")}
            </a>
            {/* Secondary — FILLED dark grey pill, not a transparent outline. */}
            <a
              href={secondaryCtaLink}
              onClick={handleCta(secondaryCtaLink)}
              className={cn(
                ctaBaseClasses,
                "border border-white/10 bg-[#212121] text-white",
                "hover:border-white/20 hover:bg-[#2a2a2a]",
              )}
              style={ctaStyle}>
              {secondaryCtaText}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

NoirReferenceHero.displayName = "NoirReferenceHero";
