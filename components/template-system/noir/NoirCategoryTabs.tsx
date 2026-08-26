import { Fragment } from "react";
import { useMinimalI18n } from "#root/lib/i18n/MinimalI18nContext";
import { cn } from "#root/lib/utils";
import { NOIR_DISPLAY_FONT_CLASSES } from "./noir-tokens";

export interface NoirCategoryTab {
  /** Stable key. `ALL_SCENTS_TAB_ID` for the computed all-products tab. */
  id: string;
  /** Display label (already localized / CMS-formatted). */
  label: string;
}

export interface NoirCategoryTabsProps {
  tabs: NoirCategoryTab[];
  activeId: string;
  onSelect: (id: string) => void;
  className?: string;
}

/**
 * NoirCategoryTabs — dark-luxury filter strip for the Explore section.
 *
 * Centered on desktop with thin hairline separators between tabs; the
 * active tab carries a signal-red underline. On mobile the row becomes a
 * horizontal snap-scroll so labels never wrap. Purely presentational —
 * the parent owns the active state and the tab data (which is derived
 * from real CMS categories, never hardcoded).
 */
export function NoirCategoryTabs({
  tabs,
  activeId,
  onSelect,
  className,
}: NoirCategoryTabsProps) {
  const { locale } = useMinimalI18n();
  const isAr = locale === "ar";
  const trackWide = isAr ? "" : "tracking-[0.18em]";

  if (tabs.length === 0) return null;

  return (
    <div
      role='tablist'
      aria-orientation='horizontal'
      className={cn(
        // Mobile: horizontal scroll. Desktop: centered wrap-free row.
        "flex items-center gap-0 overflow-x-auto scrollbar-hide -mx-4 px-4",
        "md:mx-0 md:px-0 md:justify-center md:flex-wrap md:overflow-visible",
        className,
      )}>
      {tabs.map((tab, index) => {
        const active = tab.id === activeId;
        return (
          <Fragment key={tab.id}>
            {index > 0 && (
              // Thin separator between tabs (desktop only)
              <span
                aria-hidden='true'
                className='hidden md:inline-block h-4 w-px bg-white/15'
              />
            )}
            <button
              type='button'
              role='tab'
              aria-selected={active}
              onClick={() => onSelect(tab.id)}
              className={cn(
                "group relative shrink-0 whitespace-nowrap px-5 py-3 text-xs uppercase",
                "transition-colors duration-300",
                trackWide,
                NOIR_DISPLAY_FONT_CLASSES,
                active
                  ? "text-white"
                  : "text-white/50 hover:text-white/80",
              )}>
              {tab.label}
              {/* Active underline — signal red */}
              <span
                aria-hidden='true'
                className={cn(
                  "absolute inset-x-4 -bottom-px h-0.5 bg-[#E8112D] origin-center transition-transform duration-300",
                  active ? "scale-x-100" : "scale-x-0",
                )}
              />
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}
