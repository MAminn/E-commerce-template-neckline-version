import { useContext, useState } from "react";
import { Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { AuthContext } from "#root/context/AuthContext.js";
import { useCart } from "#root/lib/context/CartContext";
import { useLayoutSettings } from "#root/frontend/contexts/LayoutSettingsContext";
import { HeaderLogo } from "#root/components/globals/HeaderLogo";
import { useMinimalI18n } from "#root/lib/i18n/MinimalI18nContext";
import { cn } from "#root/lib/utils";
import { NOIR_DISPLAY_FONT_CLASSES } from "./noir-tokens";
import { NOIR_REF, nu, nuMin } from "./noir-reference-metrics";

/**
 * NoirReferenceNavbar — the header row of the Noir reference top frame.
 *
 * Deliberately NOT NoirNavbar. The shared navbar is a sticky, bordered,
 * three-column page header used by the Noir product / sorting / shop pages;
 * the reference's framed header is a single transparent flex row with the nav
 * links sitting immediately to the right of the logo and TEXT (not icon)
 * actions on the far end. Reshaping the shared navbar to match would drag
 * every other Noir page with it, so this row is dedicated to the frame.
 *
 * Reference geometry (1344px viewport, 1312px frame):
 *   row height   54px
 *   padding-x    32px
 *   logo         21px, 0.53em tracking  (cap height already matched; the
 *                29px width shortfall was letter-spacing, not size)
 *   nav          starts 44px after the logo, 20px gaps, 14px labels
 *   actions      search glyph 17px, LOGIN / CART (n) at 13px, 24px gaps
 *
 * All content is CMS-driven: the logo resolves through HeaderLogo (layout
 * settings) and the links through layoutSettings.header.navigationLinks.
 *
 * Anchors are plain `<a>` rather than the shared Link helper — the reference
 * metrics have to be applied as inline styles (they are scaling `calc()`
 * lengths) and Link forwards neither `style` nor `aria-label`. Link's only
 * extra behaviour is an `.is-active` class whose stylesheet rule is scoped to
 * `#sidebar`, so nothing is lost here.
 */
export function NoirReferenceNavbar() {
  const { session } = useContext(AuthContext);
  const { totalItems } = useCart();
  const layoutSettings = useLayoutSettings();
  const { locale } = useMinimalI18n();
  const isAr = locale === "ar";
  const [mobileOpen, setMobileOpen] = useState(false);

  const m = NOIR_REF.navbar;

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
    "whitespace-nowrap uppercase text-white",
    "transition-colors duration-300 hover:text-[#E8112D]",
    // Font size is inherited from the container that publishes the reference
    // metric, so it stays in one place per row.
    "[font-size:inherit]",
    NOIR_DISPLAY_FONT_CLASSES,
  );

  const actionTextClasses = cn(
    "hidden md:inline whitespace-nowrap uppercase [font-size:inherit]",
    NOIR_DISPLAY_FONT_CLASSES,
  );

  const iconLinkClasses =
    "relative text-white transition-colors duration-300 hover:text-[#E8112D]";

  return (
    <header className='relative'>
      <div
        className='flex items-center'
        style={{
          minHeight: nuMin(m.height, 52),
          paddingInlineStart: nuMin(m.padStart, 16),
          paddingInlineEnd: nuMin(m.padEnd, 16),
        }}>
        {/* ── Logo (+ mobile menu toggle) ── */}
        <div className='flex items-center gap-3'>
          <button
            type='button'
            className='p-1 text-white/80 transition-colors duration-300 hover:text-[#E8112D] md:hidden'
            aria-label={isAr ? "القائمة" : "Menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}>
            {mobileOpen ? (
              <X size={20} strokeWidth={1.5} />
            ) : (
              <Menu size={20} strokeWidth={1.5} />
            )}
          </button>
          {/* HeaderLogo exposes no sizing API, so the reference logo size is
              published on this wrapper and inherited by the text logo. */}
          <div
            style={{
              fontSize: nuMin(m.logoSize, 16),
              // Tracking, not size, is what the reference logo width needed.
              // Inline (and inherited) because Tailwind cannot scan a class
              // assembled from a metric value. Gated off for Arabic (rule 8).
              letterSpacing: isAr ? undefined : m.logoTracking,
            }}>
            <HeaderLogo
              variant='desktop'
              textClassName={cn(
                "inline-block font-bold uppercase leading-none !text-white",
                "[font-size:inherit] transition-colors duration-300 hover:!text-[#E8112D]",

                NOIR_DISPLAY_FONT_CLASSES,
              )}
            />
          </div>
        </div>

        {/* ── Nav links, immediately to the right of the logo ── */}
        <nav
          className='hidden items-center md:flex'
          style={{
            marginInlineStart: nu(m.navOffset),
            gap: nu(m.navGap),
            fontSize: nuMin(m.linkSize, 11),
            letterSpacing: isAr ? undefined : m.linkTracking,
          }}>
          {navLinks.map((link) => (
            <a
              key={link.href + link.label}
              href={link.href}
              className={linkClasses}>
              {link.label}
            </a>
          ))}
        </nav>

        {/* ── Right actions ── */}
        <div
          className='ms-auto flex items-center'
          style={{
            gap: nu(m.actionGap),
            fontSize: nuMin(m.actionSize, 11),
            letterSpacing: isAr ? undefined : m.actionTracking,
          }}>
          <a
            href='/search'
            className={iconLinkClasses}
            aria-label={isAr ? "بحث" : "Search"}>
            <Search size={m.searchIcon} strokeWidth={1.5} />
          </a>

          <a
            href={session ? "/account" : "/login"}
            className={iconLinkClasses}
            aria-label={
              session
                ? isAr
                  ? "حسابي"
                  : "Account"
                : isAr
                  ? "تسجيل الدخول"
                  : "Sign in"
            }>
            {/* Desktop shows the reference's text label; the glyph is kept for
                mobile so the touch target is unchanged. */}
            <User size={18} strokeWidth={1.5} className='md:hidden' />
            <span className={actionTextClasses}>
              {session
                ? isAr
                  ? "حسابي"
                  : "Account"
                : isAr
                  ? "دخول"
                  : "Login"}
            </span>
          </a>

          <a
            href='/cart'
            className={iconLinkClasses}
            aria-label={isAr ? "عربة التسوق" : "Shopping bag"}>
            <ShoppingBag size={18} strokeWidth={1.5} className='md:hidden' />
            {totalItems > 0 && (
              <span className='absolute -top-1 -end-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E8112D] px-0.5 text-[9px] font-semibold leading-none text-white md:hidden'>
                {totalItems}
              </span>
            )}
            <span className={cn(actionTextClasses, "text-[#E8112D]")}>
              {isAr ? `العربة (${totalItems})` : `Cart (${totalItems})`}
            </span>
          </a>
        </div>
      </div>

      {/* ── Mobile menu panel ── */}
      {mobileOpen && (
        <nav
          className='flex flex-col gap-4 border-t border-white/10 bg-black/80 px-4 py-4 text-sm backdrop-blur md:hidden'
          style={{ letterSpacing: isAr ? undefined : m.linkTracking }}>
          {navLinks.map((link) => (
            <a
              key={link.href + link.label}
              href={link.href}
              className={linkClasses}
              onClick={() => setMobileOpen(false)}>
              {link.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}

NoirReferenceNavbar.displayName = "NoirReferenceNavbar";
