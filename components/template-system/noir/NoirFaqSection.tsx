import { useEffect, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import type {
  HomepageFaqContent,
  HomepageFaqItem,
} from "#root/shared/types/homepage-content";
import { useMinimalI18n } from "#root/lib/i18n/MinimalI18nContext";
import { cn } from "#root/lib/utils";
import {
  NOIR_ACCENT_TEXT_CLASSES,
  NOIR_DISPLAY_FONT_CLASSES,
  NOIR_TEXT_SECONDARY_CLASSES,
} from "./noir-tokens";

interface NoirFaqSectionProps {
  /** FAQ content from the homepage CMS. */
  faq: HomepageFaqContent;
  /**
   * Index of the item that starts expanded. Defaults to the first item;
   * pass `null` for an all-collapsed initial state.
   */
  defaultOpenIndex?: number | null;
  /**
   * Heading level for the section title. `/faq` is a page about this content
   * so it passes "h1"; on the landing the hero already owns the h1, so the
   * default keeps the document to a single one.
   */
  headingLevel?: "h1" | "h2";
  className?: string;
}

/**
 * Sorts by explicit `order` when present, keeping unnumbered items in their
 * stored array position after the numbered ones. Merchants can therefore
 * reorder either by dragging rows in the CMS or by setting numbers, without
 * one mechanism silently overruling the other.
 */
function sortFaqItems(items: HomepageFaqItem[]): HomepageFaqItem[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const ao = a.item.order;
      const bo = b.item.order;
      if (typeof ao === "number" && typeof bo === "number") {
        return ao - bo || a.index - b.index;
      }
      if (typeof ao === "number") return -1;
      if (typeof bo === "number") return 1;
      return a.index - b.index;
    })
    .map((entry) => entry.item);
}

/**
 * NoirFaqSection — the Demo 5 FAQ accordion.
 *
 * Reference layout: centred red eyebrow, condensed uppercase title,
 * supporting line, then a TWO-COLUMN grid of dark gradient cards with a red
 * plus / minus affordance on the trailing edge. The items are split down the
 * middle into two independent columns rather than flowing across a CSS grid,
 * so expanding a card only grows its own column — matching the reference,
 * where the opened first card does not shift the right-hand stack.
 *
 * Collapses to a single column below `md`.
 *
 * Content is 100% CMS-driven; this component contributes only presentation.
 */
export function NoirFaqSection({
  faq,
  defaultOpenIndex = 0,
  headingLevel = "h2",
  className,
}: NoirFaqSectionProps) {
  const { locale } = useMinimalI18n();
  const isAr = locale === "ar";
  const track = isAr ? "" : "tracking-[0.28em]";

  const items = useMemo(() => sortFaqItems(faq.items ?? []), [faq.items]);

  const [openId, setOpenId] = useState<string | null>(() => {
    if (defaultOpenIndex === null) return null;
    const sorted = sortFaqItems(faq.items ?? []);
    return sorted[defaultOpenIndex]?.id ?? null;
  });

  /**
   * Deep links: `/faq#faq-returns` opens that question instead of the first
   * and scrolls to it. Lets the footer point "Shipping & Returns" at the
   * answer that actually covers it rather than at a page that does not exist.
   * Runs client-side only, so the SSR markup still has the first item open.
   */
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    if (!(faq.items ?? []).some((item) => item.id === hash)) return;
    setOpenId(hash);
    document
      .getElementById(hash)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [faq.items]);

  if (!items.length) return null;

  const title = isAr ? faq.titleAr || faq.title : faq.title;
  const eyebrow = isAr ? faq.eyebrowAr || faq.eyebrow : faq.eyebrow;
  const subtitle = isAr ? faq.subtitleAr || faq.subtitle : faq.subtitle;

  const Heading = headingLevel;

  // Column-major split: first half stacks on the left, the rest on the right.
  const half = Math.ceil(items.length / 2);
  const columns = [items.slice(0, half), items.slice(half)].filter(
    (col) => col.length > 0,
  );

  return (
    // Gutter matches NoirFooter's so the cards and the footer columns share
    // one left edge inside the page frame.
    <section
      className={cn("px-6 py-16 md:px-10 md:py-20 lg:px-14", className)}>
      <div className='mx-auto w-full max-w-300'>
        {/* ── Heading ── */}
        <div className='mx-auto max-w-2xl text-center'>
          {eyebrow && (
            <p
              className={cn(
                "text-[11px] font-semibold uppercase",
                track,
                NOIR_ACCENT_TEXT_CLASSES,
                NOIR_DISPLAY_FONT_CLASSES,
              )}>
              {eyebrow}
            </p>
          )}
          {title && (
            <Heading
              className={cn(
                "mt-3 text-[clamp(1.9rem,4.6vw,3.25rem)] font-bold uppercase leading-[0.98] text-white",
                isAr ? "" : "tracking-[0.01em]",
                NOIR_DISPLAY_FONT_CLASSES,
              )}>
              {title}
            </Heading>
          )}
          {subtitle && (
            <p
              className={cn(
                "mt-4 text-sm leading-relaxed",
                NOIR_TEXT_SECONDARY_CLASSES,
              )}>
              {subtitle}
            </p>
          )}
        </div>

        {/* ── Accordion grid ── */}
        <div className='mt-10 grid gap-4 md:mt-12 md:grid-cols-2 md:gap-5'>
          {columns.map((column, columnIndex) => (
            <div
              // Column position is the only identity a column has; the items
              // inside carry the real keys.
              key={`faq-column-${columnIndex}`}
              className='flex flex-col gap-4 md:gap-5'>
              {column.map((item) => {
                const isOpen = openId === item.id;
                const question = isAr
                  ? item.questionAr || item.question
                  : item.question;
                const answer = isAr ? item.answerAr || item.answer : item.answer;
                const panelId = `noir-faq-panel-${item.id}`;
                const buttonId = `noir-faq-trigger-${item.id}`;

                return (
                  <div
                    key={item.id}
                    id={item.id}
                    className={cn(
                      "rounded-xl border bg-linear-to-b transition-colors duration-300",
                      isOpen
                        ? "border-white/15 from-[#191919] to-[#101010]"
                        : "border-white/10 from-[#141414] to-[#0d0d0d] hover:border-white/20",
                    )}>
                    <h3>
                      <button
                        type='button'
                        id={buttonId}
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => setOpenId(isOpen ? null : item.id)}
                        className='flex w-full items-start justify-between gap-4 px-5 py-4 text-start md:px-6 md:py-5'>
                        <span className='text-[15px] font-medium leading-snug text-white'>
                          {question}
                        </span>
                        <span
                          className={cn(
                            "mt-0.5 shrink-0",
                            NOIR_ACCENT_TEXT_CLASSES,
                          )}
                          aria-hidden='true'>
                          {isOpen ? (
                            <Minus className='h-4 w-4' strokeWidth={2} />
                          ) : (
                            <Plus className='h-4 w-4' strokeWidth={2} />
                          )}
                        </span>
                      </button>
                    </h3>
                    {/*
                      `hidden` rather than conditional rendering: the panel
                      stays in the DOM so crawlers and in-page search still
                      find the answer text.
                    */}
                    <div
                      id={panelId}
                      role='region'
                      aria-labelledby={buttonId}
                      hidden={!isOpen}
                      className='px-5 pb-5 md:px-6 md:pb-6'>
                      <p
                        className={cn(
                          "text-[13px] leading-relaxed whitespace-pre-line",
                          NOIR_TEXT_SECONDARY_CLASSES,
                        )}>
                        {answer}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

NoirFaqSection.displayName = "NoirFaqSection";
