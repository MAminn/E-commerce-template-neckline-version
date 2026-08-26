import { useContext, useState } from "react";
import { Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { Link } from "#root/components/utils/Link";
import { AuthContext } from "#root/context/AuthContext.js";
import { useCart } from "#root/lib/context/CartContext";
import { useLayoutSettings } from "#root/frontend/contexts/LayoutSettingsContext";
import { HeaderLogo } from "#root/components/globals/HeaderLogo";
import { useMinimalI18n } from "#root/lib/i18n/MinimalI18nContext";
import { cn } from "#root/lib/utils";
import { NOIR_DISPLAY_FONT_CLASSES } from "./noir-tokens";

/**
 * NoirNavbar — Noir (Demo 5) navigation.
 *
 * Black bg, hairline white/10 bottom border, uppercase tracked links
 * (tracking gated for Arabic), red hovers, sticky top. Logo resolves
 * from the same CMS layout-settings source the global navbar uses
 * (HeaderLogo). Nav links come from layoutSettings.header.navigationLinks
 * with a Home + Shop fallback. Cart count reuses useCart().totalItems
 * (same source as the existing navbars) rendered in accent red.
 *
 * Sits BELOW the NoirAnnouncementBar inside NoirChrome.
 *
 * `variant`:
 *  - "standalone" (default): sticky black bar with a hairline bottom
 *    border — exactly the original page-level header.
 *  - "embedded": transparent, non-sticky header row inside the landing's
 *    framed top experience. No black fill / no top-level border; instead a
 *    faint hairline divider (border-b border-white/8) so it reads as the
 *    frame's header row. Same grid/logo/links/icons/cart badge/mobile
 *    panel; the mobile panel gains a translucent blurred backdrop so it
 *    stays readable over the frame surface.
 */
export function NoirNavbar({
  variant = "standalone",
}: {
  variant?: "standalone" | "embedded";
} = {}) {
  const { session } = useContext(AuthContext);
  const { totalItems } = useCart();
  const layoutSettings = useLayoutSettings();
  const { locale } = useMinimalI18n();
  const isAr = locale === "ar";
  const track = isAr ? "" : "tracking-[0.2em]";
  const [mobileOpen, setMobileOpen] = useState(false);
  const embedded = variant === "embedded";

  // CMS nav links with Home + Shop fallback
  const cmsLinks = layoutSettings.header.navigationLinks;
  const navLinks =
    cmsLinks && cmsLinks.length > 0
      ? cmsLinks.map((l) => ({
          href: l.url,
          label: isAr && l.labelAr ? l.labelAr : l.label,
        }))
      : [
          { href: "/", label: isAr ? "الرئيسية" : "Home" },
          { href: "/shop", label: isAr ? "تسوق" : "Shop" },
        ];

  const linkClasses = cn(
    "uppercase hover:text-[#E8112D] transition-colors duration-300",
    embedded
      ? cn("text-[10.5px] text-white", isAr ? "" : "tracking-[0.09em]")
      : cn("text-[11px] text-white/80", track),
    NOIR_DISPLAY_FONT_CLASSES,
  );

  /** Reference-matched metrics for the embedded right-hand text actions. */
  const actionTextClasses = cn(
    "hidden md:inline text-[10.5px] uppercase",
    isAr ? "" : "tracking-[0.08em]",
    NOIR_DISPLAY_FONT_CLASSES,
  );

  return (
    <header
      className={cn(
        // Embedded carries NO bottom divider — in the reference the navbar is
        // separated from the hero by the inset hero panel's own edge.
        embedded ? "" : "sticky top-0 z-40 bg-black border-b border-white/10",
      )}>
      <div
        className={
          embedded ? "px-4 md:px-7" : "mx-auto max-w-7xl px-4 md:px-8"
        }>
        <div
          className={cn(
            "items-center gap-4",
            embedded
              ? // Reference: logo, then links immediately to its right, then
                // actions pushed to the far end. Not a centered 3-col grid.
                "flex h-14 md:h-13"
              : "grid grid-cols-[auto_1fr_auto] md:grid-cols-3 h-16",
          )}>
          {/* ─── Start: mobile menu toggle + logo ─── */}
          <div className='flex items-center gap-3'>
            <button
              type='button'
              className='md:hidden p-1 text-white/80 hover:text-[#E8112D] transition-colors duration-300'
              aria-label={isAr ? "القائمة" : "Menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}>
              {mobileOpen ? (
                <X size={20} strokeWidth={1.5} />
              ) : (
                <Menu size={20} strokeWidth={1.5} />
              )}
            </button>
            <HeaderLogo
              variant='desktop'
              textClassName={cn(
                "inline-block font-semibold uppercase !text-white hover:!text-[#E8112D] transition-colors duration-300",
                embedded ? "text-lg md:text-xl" : "text-xl md:text-2xl",
                isAr ? "" : embedded ? "tracking-[0.4em]" : "tracking-[0.3em]",
                NOIR_DISPLAY_FONT_CLASSES,
              )}
            />
          </div>

          {/* ─── Nav links (desktop) — left-adjacent to the logo when embedded ─── */}
          <nav
            className={cn(
              "hidden md:flex items-center",
              embedded ? "gap-6 ms-11" : "justify-center gap-10",
            )}>
            {navLinks.map((link) => (
              <Link
                key={link.href + link.label}
                href={link.href}
                className={linkClasses}>
                {link.label}
              </Link>
            ))}
          </nav>

          {/* ─── End: search / account / cart ─── */}
          <div
            className={cn(
              "flex items-center gap-4",
              embedded ? "ms-auto" : "justify-end",
            )}>
            <Link
              href='/search'
              className={cn(
                "p-1 hover:text-[#E8112D] transition-colors duration-300",
                // +8px so the glyph gap to LOGIN reads 32px (vs 24px to CART)
                embedded ? "me-2 text-white" : "text-white/80",
              )}
              aria-label={isAr ? "بحث" : "Search"}>
              <Search size={embedded ? 16 : 18} strokeWidth={1.5} />
            </Link>
            <Link
              href={session ? "/account" : "/login"}
              className={cn(
                "p-1 hover:text-[#E8112D] transition-colors duration-300",
                embedded ? "text-white" : "text-white/80",
              )}
              aria-label={
                session
                  ? isAr
                    ? "حسابي"
                    : "Account"
                  : isAr
                    ? "تسجيل الدخول"
                    : "Sign in"
              }>
              {/* Embedded desktop shows a text label (reference); the icon is
                  kept for mobile so touch targets are unchanged. */}
              <User
                size={18}
                strokeWidth={1.5}
                className={embedded ? "md:hidden" : undefined}
              />
              {embedded && (
                <span className={actionTextClasses}>
                  {session
                    ? isAr
                      ? "حسابي"
                      : "Account"
                    : isAr
                      ? "دخول"
                      : "Login"}
                </span>
              )}
            </Link>
            <Link
              href='/cart'
              className={cn(
                "relative p-1 hover:text-[#E8112D] transition-colors duration-300",
                embedded ? "text-white" : "text-white/80",
              )}
              aria-label={isAr ? "عربة التسوق" : "Shopping bag"}>
              <ShoppingBag
                size={18}
                strokeWidth={1.5}
                className={embedded ? "md:hidden" : undefined}
              />
              {totalItems > 0 && (
                <span
                  className={cn(
                    "absolute -top-1 -end-1.5 inline-flex items-center justify-center min-w-4 h-4 px-0.5 text-[9px] font-semibold leading-none rounded-full bg-[#E8112D] text-white",
                    embedded && "md:hidden",
                  )}>
                  {totalItems}
                </span>
              )}
              {embedded && (
                <span className={cn(actionTextClasses, "text-[#E8112D]")}>
                  {isAr
                    ? `العربة (${totalItems})`
                    : `Cart (${totalItems})`}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Mobile menu panel ─── */}
      {mobileOpen && (
        <nav
          className={cn(
            "md:hidden border-t border-white/10 px-4 py-4 flex flex-col gap-4",
            embedded ? "bg-black/80 backdrop-blur" : "bg-black",
          )}>
          {navLinks.map((link) => (
            <Link
              key={link.href + link.label}
              href={link.href}
              className={linkClasses}
              onClick={() => setMobileOpen(false)}>
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
