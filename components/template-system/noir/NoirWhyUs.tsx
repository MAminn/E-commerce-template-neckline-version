import type React from "react";
import type { HomepageBrandStatementContent } from "#root/shared/types/homepage-content";
import { useMinimalI18n } from "#root/lib/i18n/MinimalI18nContext";
import { cn } from "#root/lib/utils";
import { NoirImagePlaceholder } from "./ProductCardNoir";
import { getNoirBenefitIcon } from "./noir-benefit-icons";
import {
  NOIR_ACCENT_LINE,
  NOIR_DISPLAY_FONT_CLASSES,
  NOIR_SECTION_Y_LG,
  NOIR_TEXT_SECONDARY_CLASSES,
} from "./noir-tokens";

interface NoirWhyUsProps {
  brandStatement: HomepageBrandStatementContent;
}

type NoirBenefitItem = NonNullable<
  HomepageBrandStatementContent["benefits"]
>[number];

/**
 * NoirBenefitBlock — one product benefit: a large hairline ring holding a
 * white line glyph, the title beneath it, and the copy beneath that, all
 * centred.
 *
 * Both flanking columns use the identical block. The reference does NOT
 * mirror them (text hugging the image, icon on the outside) — it centres
 * every item over its own column on both sides, which is why this takes no
 * `align` prop any more.
 */
function NoirBenefitBlock({
  item,
  track,
}: {
  item: NoirBenefitItem;
  track: string;
}) {
  const Icon = getNoirBenefitIcon(item.icon);
  return (
    // The measure, not a per-element max-width, is what shapes these blocks:
    // the reference wraps both the title and the copy inside a ~224px column,
    // which is what gives "PERFECTLY / PORTABLE" its two lines. Constraining
    // the block once lets any CMS copy wrap the same way.
    <div className='flex max-w-56 flex-col items-center text-center'>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full",
          "size-14 lg:size-16",
          // Hairline ring + a whisper of fill, matching the benefits strip's
          // treatment so the two icon systems read as one language.
          "bg-white/2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)]",
        )}
        aria-hidden='true'>
        {/* White line glyph at a hairline weight — NOT the small red icon the
            previous version drew. The accent belongs to the eyebrow. */}
        <Icon className='size-6 stroke-[1.4] text-white lg:size-7' />
      </span>

      <h3
        className={cn(
          "mt-4 text-base uppercase font-bold leading-tight text-white lg:text-lg",
          track,
          NOIR_DISPLAY_FONT_CLASSES,
        )}>
        {item.title}
      </h3>

      {item.description && (
        <p
          className={cn(
            // Newlines from the CMS are honoured, which is how the reference
            // gets its deliberate breaks. No line-clamp: clamping would eat
            // the merchant's last line behind an ellipsis.
            "mt-2.5 whitespace-pre-line text-sm leading-relaxed",
            NOIR_TEXT_SECONDARY_CLASSES,
          )}>
          {item.description}
        </p>
      )}
    </div>
  );
}

/**
 * NoirBenefitCard — the per-item wrapper that turns a benefit block into a
 * snap card below lg, and dissolves back into a plain column child at lg.
 *
 * 74vw is the carousel's whole trick: at less than a full viewport the next
 * card always peeks in from the edge, which is what tells the reader there is
 * more to swipe. A 100vw card would look like a static, single item.
 *
 * THIS WIDTH IS PAIRED with the scroller's `px-[13vw]`, which is
 * `(100vw - 74vw) / 2` — the padding is what lets the first and last card
 * reach the centre. Change one and the other must change with it.
 */
function NoirBenefitCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex w-[74vw] shrink-0 snap-center justify-center",
        // `contents` at lg, NOT `w-auto`: releasing the width still left an
        // extra flex box between the column and the block, and shrink-to-fit
        // through it sized the blocks 160-190px instead of their 224px
        // measure — the copy wrapped onto more lines and the section grew
        // 45px. Dissolving the wrapper entirely makes the block the column's
        // direct flex item again, exactly as before the carousel existed.
        "lg:contents",
      )}>
      {children}
    </div>
  );
}

/**
 * NoirWhyUs — the Noir brand-statement centrepiece ("Why solid is better").
 *
 * Composition, at lg and up:
 *
 *     ┌──────────┬────────────────────┬──────────┐
 *     │ benefit1 │  eyebrow           │ benefit4 │
 *     │ benefit2 │  HEADING (2 lines) │ benefit5 │
 *     │ benefit3 │  subtitle          │ benefit6 │
 *     │          │  product image     │          │
 *     └──────────┴────────────────────┴──────────┘
 *
 * The header and the image share the CENTRE column rather than sitting above
 * the grid, which is what lets the flanking benefits rise alongside the
 * heading exactly as the reference does. Because the grid is symmetric, the
 * heading and the product stay optically centred on the page.
 *
 * Below lg it becomes header + image, then all six benefits in a single
 * horizontal snap carousel — see the `display: contents` note at the grid.
 *
 * These benefits are PRODUCT-specific and live on `brandStatement` — they are
 * intentionally NOT the store promises in `valueProps` (NoirReferenceBenefits).
 * With no benefits present the section falls back to the plain centred
 * statement, so templates and stores that never fill them in are unaffected.
 * Renders nothing when disabled. Fully CMS-driven.
 */
export function NoirWhyUs({ brandStatement }: NoirWhyUsProps) {
  const { locale } = useMinimalI18n();
  const isAr = locale === "ar";
  // The reference heading is tightly set — the old 0.14em tracking stretched
  // "SMARTER SCENTS. BETTER FOR YOU." far past the reference's measure and
  // was a large part of why the heading wrapped badly.
  const headingTrack = isAr ? "" : "tracking-[0.01em]";
  const microTrack = isAr ? "" : "tracking-[0.18em]";
  const itemTrack = isAr ? "" : "tracking-[0.06em]";

  if (!brandStatement.enabled) return null;

  const hasImage = Boolean(brandStatement.image);
  const benefits = brandStatement.benefits ?? [];
  const hasBenefits = benefits.length > 0;

  const half = Math.ceil(benefits.length / 2);
  const leftItems = benefits.slice(0, half);
  const rightItems = benefits.slice(half);

  const header = (
    <div className='flex flex-col items-center text-center'>
      {brandStatement.eyebrow ? (
        <p
          className={cn(
            "text-xs uppercase font-semibold text-[#E8112D]",
            microTrack,
            NOIR_DISPLAY_FONT_CLASSES,
          )}>
          {brandStatement.eyebrow}
        </p>
      ) : (
        <div className={cn(NOIR_ACCENT_LINE, "mx-auto")} aria-hidden='true' />
      )}

      <h2
        className={cn(
          "mt-5 text-4xl uppercase font-bold leading-[1.06] text-white md:text-5xl lg:text-[3.25rem]",
          // `whitespace-pre-line` honours an explicit newline in the CMS
          // title — the default carries one, giving the reference's
          // "SMARTER SCENTS." / "BETTER FOR YOU." break exactly.
          //
          // The measure is the safety net for titles saved BEFORE that
          // default existed (a store's DB keeps its own copy): 26rem is wider
          // than "SMARTER SCENTS." alone but narrower than that plus the next
          // word, so a single-line title still breaks in the right place.
          "max-w-104 whitespace-pre-line",
          headingTrack,
          NOIR_DISPLAY_FONT_CLASSES,
        )}>
        {brandStatement.title}
      </h2>

      {brandStatement.description && (
        <p
          className={cn(
            "mt-5 max-w-md text-sm leading-relaxed md:text-base",
            NOIR_TEXT_SECONDARY_CLASSES,
          )}>
          {brandStatement.description}
        </p>
      )}
    </div>
  );

  const productImage = (
    <div className='mt-10 w-full lg:mt-12'>
      {hasImage ? (
        <div className='relative mx-auto aspect-4/3 w-full max-w-xl'>
          <img
            src={brandStatement.image}
            alt={brandStatement.title}
            className={cn(
              "h-full w-full object-contain",
              // Grounding shadow, then a radial mask so the shot's own black
              // background dissolves into the section instead of ending on a
              // visible rectangular edge.
              "drop-shadow-[0_34px_70px_rgba(0,0,0,0.75)]",
              "[mask-image:radial-gradient(ellipse_78%_78%_at_center,#000_58%,transparent_100%)]",
              "[-webkit-mask-image:radial-gradient(ellipse_78%_78%_at_center,#000_58%,transparent_100%)]",
            )}
            loading='lazy'
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <div className='absolute inset-0 -z-10 overflow-hidden rounded-2xl'>
            <NoirImagePlaceholder />
          </div>
        </div>
      ) : (
        <div className='relative mx-auto aspect-4/3 w-full max-w-xl overflow-hidden rounded-2xl'>
          <NoirImagePlaceholder />
        </div>
      )}
    </div>
  );

  return (
    <section
      data-noir-section='brand-statement'
      className={cn("relative overflow-hidden", NOIR_SECTION_Y_LG)}>
      {/* Spotlight behind the product. Neutral and low, not the red wash the
          previous version painted — the reference's ground is black and the
          only colour in the section is the eyebrow. */}
      <div
        // Anchored on the PRODUCT (roughly two-thirds down), not the section
        // centre — centred it lit the heading instead, which the reference
        // keeps on flat black.
        className='pointer-events-none absolute start-1/2 top-[62%] aspect-square w-[62vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl'
        style={{
          background:
            "radial-gradient(circle, rgba(255,246,238,0.05) 0%, rgba(232,17,45,0.025) 45%, transparent 70%)",
        }}
        aria-hidden='true'
      />

      <div className='relative mx-auto max-w-7xl px-4 md:px-8'>
        {hasBenefits ? (
          <div
            className={cn(
              "grid grid-cols-1 items-center gap-x-8 gap-y-10 lg:gap-y-14",
              "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)_minmax(0,1fr)]",
            )}>
            {/* Centre column — header AND product image together. First in
                source so it needs no order on mobile; `lg:order-2` puts it
                back between the two benefit columns on desktop. */}
            <div className='order-1 flex flex-col items-center lg:order-2'>
              {header}
              {productImage}
            </div>

            {/* ── Benefits ──────────────────────────────────────────────
                ONE element serving two layouts, via `display: contents`.

                Below lg this is a single snap carousel holding all six
                cards — stacked vertically they ran ~1200px, which is most
                of a phone screen spent on six short lines.

                At lg it becomes `display: contents`, so it stops generating
                a box entirely and the two column wrappers inside promote to
                direct grid items — exactly the children the grid had before
                this carousel existed. The wrappers do the same trick in
                reverse: `display: contents` below lg so the six cards are
                the carousel's own flex items, `flex` again at lg.

                That is what keeps the desktop composition byte-identical
                while the mobile one is a completely different layout, with
                no duplicated markup and one source of truth per item. */}
            <div
              className={cn(
                "order-2 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2",
                // FIRST/LAST CARD CENTRING.
                //
                // `snap-center` can only centre a card if the scroller can
                // actually scroll far enough for it to reach the centre. With
                // no leading inline padding, scrollLeft 0 pins card one to the
                // left edge and the snap engine has nowhere further to go —
                // likewise for the last card at maximum scroll. Symmetric
                // padding of exactly half the leftover viewport supplies that
                // room at both ends:
                //
                //   (100vw - 74vw) / 2 = 13vw
                //
                // At rest the sum is then 13 + 74 + 13 = 100vw, so card one is
                // already centred at scrollLeft 0, and the last card centres
                // precisely at maximum scroll. `justify-center` cannot do this
                // — it only centres the flex line when the content is NARROWER
                // than the scroller, which is never true here.
                "px-[13vw]",
                // The vw maths above measures from the true viewport edge, so
                // the scroller has to bleed past the section's own gutter at
                // BOTH breakpoints — `md:-mx-8` cancels the container's
                // `md:px-8`, which a bare `-mx-4` would leave 32px short.
                "-mx-4 md:-mx-8",
                // Project utility, defined in layouts/style.css and already
                // used by the other Noir carousels.
                "scrollbar-hide",
                // No lg order needed: at lg this box does not exist, so its
                // padding, margin and snap behaviour are all inert there.
                "lg:mx-0 lg:contents",
              )}>
              <div className='contents lg:order-1 lg:flex lg:flex-col lg:items-center lg:gap-14'>
                {leftItems.map((item) => (
                  <NoirBenefitCard key={item.title}>
                    <NoirBenefitBlock item={item} track={itemTrack} />
                  </NoirBenefitCard>
                ))}
              </div>

              <div className='contents lg:order-3 lg:flex lg:flex-col lg:items-center lg:gap-14'>
                {rightItems.map((item) => (
                  <NoirBenefitCard key={item.title}>
                    <NoirBenefitBlock item={item} track={itemTrack} />
                  </NoirBenefitCard>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Fallback: plain centred statement (pre-benefits behaviour). */
          <>
            {header}
            {hasImage && productImage}
          </>
        )}
      </div>
    </section>
  );
}
