import type { CSSProperties } from "react";
import type {
  HomepageHeroContent,
  HomepageValuePropsContent,
} from "#root/shared/types/homepage-content";
import { getNoirBenefitIcon } from "./noir-benefit-icons";
import { useMinimalI18n } from "#root/lib/i18n/MinimalI18nContext";
import { cn } from "#root/lib/utils";
import { getNoirReferenceHeroImage } from "./NoirReferenceHero";
import { NOIR_DISPLAY_FONT_CLASSES } from "./noir-tokens";
import {
  NOIR_REF_BENEFITS,
  NOIR_REF_PAGE_GUTTER,
  NOIR_REF_UNIT_DECL,
  nu,
  nuMin,
} from "./noir-reference-metrics";

/** The reference band is 4-up. */
const BENEFITS_MAX = 4;

interface NoirReferenceBenefitsProps {
  valueProps: HomepageValuePropsContent;
  /**
   * Hero content — supplies the artwork whose faint continuation backs the
   * band. Optional: without it the band is simply the dark base.
   */
  hero?: HomepageHeroContent;
}

/**
 * NoirReferenceBenefits — the value-props band under the Noir reference frame.
 *
 * A dedicated clone of the design reference rather than a restyle of
 * NoirBenefitsStrip, which was a generic dark ecommerce strip: 1024px wide,
 * 11px labels, and small red-outline icon chips. None of those numbers are
 * recoverable by tweaking; the reference band is a different composition.
 *
 * Reference geometry (1344px viewport, 1312px band width):
 *   band     113 tall, full-bleed fill, hairlines ending on the frame's column
 *   row      inset 70 each side, 4 x 275 columns, 24 gap — the CARD row's own
 *            geometry, so benefit n sits directly under card n
 *   item     50 outline ring + 20 gap + text block
 *   title    14 uppercase display / 0.09em, white
 *   copy     13 / 18, two lines reserved so all four columns align
 *
 * Every metric is `nu(N)` against the frame's `--nu` unit (one reference
 * pixel), declared here from this band's own measuring container, so the band
 * holds the reference ratio at any viewport and stays in step with the frame
 * above it.
 *
 * ── Why the icons are outline rings, not red chips ───────────────────────
 * The reference draws each glyph as a thin white line icon inside a bare
 * 46px hairline circle. The accent stays out of this band entirely — the red
 * belongs to the CTA and the best-sellers rule, and repeating it four times
 * across a quiet strip is what made the old version read as a utility bar
 * rather than a luxury one.
 *
 * Titles, copy and icon CHOICE are all CMS-driven. Glyphs resolve through
 * `getNoirBenefitIcon`, which is the shared `ValuePropIconType` map with two
 * Noir-only substitutions where lucide reads visibly wrong against the
 * reference — so a merchant's selection keeps its meaning everywhere, and
 * only the drawing differs here.
 */
export function NoirReferenceBenefits({
  valueProps,
  hero,
}: NoirReferenceBenefitsProps) {
  const { locale } = useMinimalI18n();
  const isAr = locale === "ar";
  const m = NOIR_REF_BENEFITS;

  if (!valueProps.enabled || valueProps.items.length === 0) return null;

  const items = valueProps.items.slice(0, BENEFITS_MAX);
  const continuationImage = hero ? getNoirReferenceHeroImage(hero) : "";

  const rowStyle = {
    "--nu": NOIR_REF_UNIT_DECL,
    paddingBlock: nuMin(m.padY, 22),
    paddingInline: `max(1rem, ${nu(m.gutter)})`,
  } as CSSProperties;

  return (
    <section
      data-noir-section='benefits'
      className='relative isolate overflow-hidden bg-[#080808]'
      style={{ marginTop: m.topGap }}>
      {/* The same photograph the frame above uses, continuing under the band
          at a fraction of its value and masked away before the bottom edge.
          Heavily blurred and low-opacity: it is atmosphere, not an image —
          it exists so the band does not read as a separate black box bolted
          under the frame, which is what a flat #0c0c0c fill looked like. */}
      {continuationImage && (
        <img
          src={continuationImage}
          alt=''
          aria-hidden='true'
          loading='lazy'
          className='pointer-events-none absolute inset-x-0 top-0 -z-10 h-[240%] w-full object-cover opacity-[0.26] blur-[26px] saturate-[1.28]'
          style={{
            objectPosition: "50% 100%",
            // An unlayered global `img` rule in pages/+Head.tsx outranks
            // utility classes — see NoirReferenceHero for the same guard.
            maxWidth: "none",
            maskImage:
              "linear-gradient(to bottom, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.45) 52%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.45) 52%, transparent 100%)",
          }}
        />
      )}

      {/* GLASS SHEEN — a top-lit wash over the continuation artwork, the same
          idea as the shelf inside the frame: light enters from above and
          falls off before the base. Without it the band was a flat fill with
          a photo behind one end, so the right half — where the artwork runs
          dark — dropped to dead black and the whole strip read as a plain
          bar. The white component is what makes it glass; the warm component
          keeps the band on the frame's palette instead of drifting grey where
          the picture gives out.

          A backdrop-filter would do nothing here: the band is opaque over the
          page's own black, so there is no live picture behind it to sample.
          The glass has to be painted, not derived. */}
      <div
        className='pointer-events-none absolute inset-0 -z-10'
        style={{
          background:
            "linear-gradient(to bottom, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.014) 40%, rgba(255,255,255,0) 74%), " +
            "linear-gradient(to bottom, rgba(74,42,34,0.34) 0%, rgba(28,18,16,0.16) 55%, rgba(0,0,0,0) 100%)",
        }}
        aria-hidden='true'
      />

      {/* Band edges — the sheen where the glass catches light, matching the
          shelf hairline inside the frame.

          They run the FRAME's width, not the viewport's. Full-bleed, they
          were rules 1344/1920/2560px long drawn at a width nothing else on
          the page shares, and they read as a hard horizontal cut separating
          the band from the composition above. Ending them on the frame's own
          column turns the same hairline into the frame's baseline. */}
      <div
        className='pointer-events-none absolute inset-0'
        style={{ paddingInline: NOIR_REF_PAGE_GUTTER }}
        aria-hidden='true'>
        <div className='relative mx-auto h-full' style={{ maxWidth: m.maxWidth }}>
          <div className='absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/10 to-transparent' />
          <div className='absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-white/8 to-transparent' />
        </div>
      </div>

      <div style={{ paddingInline: NOIR_REF_PAGE_GUTTER }}>
        {/* Measuring container — `--nu` is declared on the CHILD, since
            container query units never resolve against the container's own
            styles. */}
        <div
          className='mx-auto [container-type:inline-size]'
          style={{ maxWidth: m.maxWidth }}>
          <div
            className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4'
            style={{
              ...rowStyle,
              columnGap: nuMin(m.columnGap, 12),
              // Mobile-only in effect: at md+ the grid is a single 4-column
              // row, so no row gap is ever drawn. Centred blocks need more
              // separation than the side-by-side rows did.
              rowGap: "2.5rem",
            }}>
            {items.map((item, index) => {
              const Icon = getNoirBenefitIcon(item.icon);
              return (
                <div
                  key={`${item.icon}-${item.title}`}
                  // Below md: a centred feature list — ring above, title and
                  // copy centred under it. From md up: the reference row,
                  // ring inline-start with the text beside it.
                  //
                  // `items-center` serves both — it centres horizontally in
                  // the column direction and vertically in the row direction,
                  // so only the axis and the text alignment need a breakpoint.
                  // The vertical gap is `gap-y`, not the inline `columnGap`
                  // below: in a column flex container column-gap is the
                  // cross-axis and contributes no space between the ring and
                  // the text. The two properties never collide, which is why
                  // the inline style can stay unconditional.
                  className={cn(
                    "relative flex flex-col items-center gap-y-3 text-center",
                    "md:flex-row md:gap-y-0 md:text-start",
                  )}
                  style={{ columnGap: nuMin(m.textGap, 16) }}>
                  {/* Divider centred in the column gap, not butted against
                      the item — hence the negative half-gap offset. */}
                  {index > 0 && (
                    <span
                      className='pointer-events-none absolute top-1/2 hidden -translate-y-1/2 bg-linear-to-b from-transparent via-white/12 to-transparent md:block'
                      style={{
                        insetInlineStart: `calc(-1 * ${nuMin(m.columnGap / 2, 6)})`,
                        width: 1,
                        height: nuMin(m.dividerHeight, 44),
                      }}
                      aria-hidden='true'
                    />
                  )}

                  {/* The ring is a hairline at 0.32, not 0.22, and carries a
                      2.5% fill. At 0.22 over a band whose right half falls to
                      near-black the circle simply disappeared on the last two
                      items — the reference's ring is legible across all four.
                      The fill is what makes it read as a glass disc set into
                      the band rather than an outline drawn on it. */}
                  <span
                    className='flex shrink-0 items-center justify-center rounded-full bg-white/2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.32)]'
                    style={
                      {
                        width: nuMin(m.ringSize, 46),
                        height: nuMin(m.ringSize, 46),
                        "--noir-benefit-icon": nuMin(m.iconSize, 25),
                      } as CSSProperties
                    }
                    aria-hidden='true'>
                    <Icon
                      className={cn(
                        "h-(--noir-benefit-icon) w-(--noir-benefit-icon)",
                        // CSS stroke-width overrides lucide's presentation
                        // attribute — the reference glyphs are hairline, not
                        // the default 2. It governs the Noir-authored SVGs
                        // identically, since they ship no width of their own.
                        // Full white at 1.4: at 92%/1.25 the glyph read grey
                        // and undernourished against the reference's crisp
                        // white line, and dimming an already-thin stroke is
                        // what cost it definition.
                        "text-white stroke-[1.4]",
                      )}
                    />
                  </span>

                  <div className='flex min-w-0 flex-col'>
                    <h3
                      className={cn(
                        "font-bold uppercase leading-none text-white",
                        NOIR_DISPLAY_FONT_CLASSES,
                      )}
                      style={{
                        fontSize: `max(12px, ${nu(m.titleSize)})`,
                        // Never build a tracking class from a template
                        // literal — Tailwind's scanner cannot see it.
                        letterSpacing: isAr ? undefined : m.titleTracking,
                      }}>
                      {item.title}
                    </h3>
                    {item.description && (
                      <p
                        // `whitespace-pre-line` honours the newlines the
                        // merchant types into the CMS textarea, which is how
                        // the reference gets its deliberate two-line breaks
                        // ("No alcohol. No parabens." / "Just what you
                        // need.") instead of whatever the column width
                        // happens to wrap at. Copy without newlines still
                        // wraps normally. There is deliberately no
                        // line-clamp: clamping would swallow the merchant's
                        // second line behind an ellipsis.
                        className='whitespace-pre-line text-white/72'
                        style={{
                          marginTop: nuMin(m.titleGap, 6),
                          fontSize: `max(11.5px, ${nu(m.copySize)})`,
                          lineHeight: nuMin(m.copyLineHeight, 17),
                          // Two lines are reserved even when the copy is one,
                          // so the four ring/text pairs stay on one baseline.
                          minHeight: nuMin(m.copyLineHeight * 2, 34),
                        }}>
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

NoirReferenceBenefits.displayName = "NoirReferenceBenefits";
