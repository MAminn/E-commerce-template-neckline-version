import { useEffect, type ReactNode } from "react";
import { NoirFooter } from "./NoirFooter";
import { NoirNavbar } from "./NoirNavbar";
import { useMinimalI18n } from "#root/lib/i18n/MinimalI18nContext";
import { cn } from "#root/lib/utils";
import { NOIR_COLORS, NOIR_DISPLAY_FONT_CLASSES } from "./noir-tokens";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface NoirChromeProps {
  children: ReactNode;
  /** Announcement bar text — overrides the translated default. */
  announcementText?: string;
  /**
   * Admin preview mode — skips the <html data-noir-chrome> side effect
   * so the dashboard template previews don't restyle the page or hide
   * the global chrome.
   */
  previewMode?: boolean;
  /**
   * When true, NoirChrome does NOT render its own NoirNavbar — the
   * consumer owns the navbar (e.g. the landing's framed top experience
   * renders an embedded navbar inside the frame). Announcement bar,
   * footer, and the data-attribute behaviour are unchanged. Defaults to
   * false, so product/sorting pages render identically.
   */
  hideNavbar?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Announcement bar                                                  */
/* ------------------------------------------------------------------ */

function NoirAnnouncementBar({ text }: { text?: string }) {
  const { locale } = useMinimalI18n();
  const isAr = locale === "ar";
  const effectiveText =
    text || (isAr ? "شحن وإرجاع مجاني" : "Free shipping & returns");

  return (
    <div className='w-full bg-black text-white'>
      <p
        className={cn(
          // Reference: 10.5px label on a 19px-tall bar (10.5 + 2 x 4.25). The
          // bar sets the frame's y origin, so rounding it to 18.5 shifted every
          // box in the frame up by exactly 0.5px.
          "px-4 py-[4.25px] text-center text-[10.5px] font-semibold uppercase leading-none",
          // Letter-spacing gated off for Arabic (rule 8)
          isAr ? "" : "tracking-[0.14em]",
          NOIR_DISPLAY_FONT_CLASSES,
        )}>
        {effectiveText}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

/**
 * NoirChrome — wraps Noir (Demo 5) template pages.
 *
 * Follows the EditorialChrome precedent:
 * 1. Sets `data-noir-chrome="true"` on `<html>` (mount/unmount).
 *    The scoped CSS block in layouts/style.css hides `#global-navbar`
 *    and `#global-footer` and applies the Noir base canvas when set.
 * 2. Renders a NoirAnnouncementBar on top, NoirNavbar below it,
 *    children inside a full-width Noir canvas, and `<NoirFooter />`
 *    at the bottom.
 *
 * SSR-safe — attribute is set only in a `useEffect` (client-only).
 */
export function NoirChrome({
  children,
  announcementText,
  previewMode = false,
  hideNavbar = false,
}: NoirChromeProps) {
  useEffect(() => {
    if (previewMode) return;
    document.documentElement.dataset.noirChrome = "true";
    return () => {
      delete document.documentElement.dataset.noirChrome;
    };
  }, [previewMode]);

  return (
    <div
      className='w-full min-h-screen'
      style={{
        backgroundColor: NOIR_COLORS.bgBase,
        color: NOIR_COLORS.textPrimary,
      }}>
      <NoirAnnouncementBar text={announcementText} />

      {!hideNavbar && <NoirNavbar />}

      {children}

      <NoirFooter />
    </div>
  );
}
