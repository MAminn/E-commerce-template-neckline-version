import { useEffect, type CSSProperties, type ReactNode } from "react";
import { NoirAnnouncementBar } from "./NoirChrome";
import { NoirReferenceNavbar } from "./NoirReferenceNavbar";
import { NoirFooter } from "./NoirFooter";
import { cn } from "#root/lib/utils";
import { NOIR_COLORS } from "./noir-tokens";
import {
  NOIR_REF,
  NOIR_REF_PAGE_GUTTER,
  NOIR_REF_UNIT_DECL,
  nuMin,
} from "./noir-reference-metrics";

interface NoirPageFrameProps {
  children: ReactNode;
  /** Announcement bar text — overrides the translated default. */
  announcementText?: string;
  /**
   * Admin preview mode — skips the `<html data-noir-chrome>` side effect so
   * dashboard previews don't restyle the page or hide the global chrome.
   */
  previewMode?: boolean;
}

/**
 * NoirPageFrame — framed shell for standalone Noir content pages (/faq).
 *
 * The reference puts these pages inside ONE rounded panel: the announcement
 * bar sits on the black page ground, and the reference navbar, the page
 * content and the footer all live inside a single radius. NoirChrome cannot
 * express that — it renders a sticky full-bleed navbar and a full-bleed
 * footer OUTSIDE any frame, which is right for the product/sorting/shop
 * pages and must stay that way. So this is a sibling shell, not an edit to
 * NoirChrome: nothing that renders today changes shape.
 *
 * What it does share with NoirChrome is the `data-noir-chrome` attribute,
 * which is what the scoped CSS block in layouts/style.css keys off to hide
 * `#global-navbar` / `#global-footer` and apply the Noir canvas and fonts.
 * That side effect is duplicated here deliberately rather than lifted into a
 * hook — it is five lines, and threading a new shared hook through
 * NoirChrome would touch the pages this component exists to leave alone.
 */
export function NoirPageFrame({
  children,
  announcementText,
  previewMode = false,
}: NoirPageFrameProps) {
  useEffect(() => {
    if (previewMode) return;
    document.documentElement.dataset.noirChrome = "true";
    return () => {
      delete document.documentElement.dataset.noirChrome;
    };
  }, [previewMode]);

  const frameStyle = {
    "--nu": NOIR_REF_UNIT_DECL,
    borderRadius: nuMin(NOIR_REF.frame.radius, 16),
  } as CSSProperties;

  return (
    <div
      className='w-full min-h-screen'
      style={{
        backgroundColor: NOIR_COLORS.bgBase,
        color: NOIR_COLORS.textPrimary,
      }}>
      <NoirAnnouncementBar text={announcementText} />

      <div
        style={{
          paddingInline: NOIR_REF_PAGE_GUTTER,
          paddingTop: NOIR_REF.frame.topGap,
          paddingBottom: NOIR_REF.frame.topGap,
        }}>
        {/* Measuring container: `--nu` inside the frame resolves `100cqw`
            against THIS element, so it must be the frame's parent — container
            query units never resolve against the container's own styles. */}
        <div
          className='mx-auto [container-type:inline-size]'
          style={{ maxWidth: NOIR_REF.frame.maxWidth }}>
          <div
            className={cn(
              "relative overflow-hidden bg-[#0a0a0a]",
              // Hairline as an inset ring, not a border, so it costs no
              // layout — same trick the landing's top frame uses.
              "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07),0_40px_120px_-40px_rgba(0,0,0,0.9)]",
            )}
            style={frameStyle}>
            <NoirReferenceNavbar />
            {children}
          </div>
        </div>
      </div>

      {/*
        Sibling of the content frame, never a child of it — NoirFooter carries
        its own panel, so nesting it here would have double-wrapped it and is
        what made this page's footer differ from the landing's.
      */}
      <NoirFooter />
    </div>
  );
}

NoirPageFrame.displayName = "NoirPageFrame";
