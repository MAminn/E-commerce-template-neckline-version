import type { FC } from "react";
import { Link } from "#root/components/utils/Link";
import { ArrowRight } from "lucide-react";
import { STORE_NAME } from "#root/shared/config/branding";
import { useLayoutSettings } from "#root/frontend/contexts/LayoutSettingsContext";
import type {
  PaymentBadge,
  SocialPlatform,
} from "#root/shared/types/layout-settings";
import { FooterLogo } from "#root/components/globals/FooterLogo";
import { useMinimalI18n } from "#root/lib/i18n/MinimalI18nContext";
import { cn } from "#root/lib/utils";
import { NOIR_PAYMENT_BADGES } from "./noir-payment-badges";
import { NOIR_REF, NOIR_REF_PAGE_GUTTER } from "./noir-reference-metrics";
import {
  NOIR_ACCENT_BG_CLASSES,
  NOIR_DISPLAY_FONT_CLASSES,
} from "./noir-tokens";

/* ------------------------------------------------------------------ */
/*  Social Icons                                                      */
/* ------------------------------------------------------------------ */

const iconProps = {
  xmlns: "http://www.w3.org/2000/svg",
  width: "18",
  height: "18",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.4",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const FacebookIcon = () => (
  <svg {...iconProps} aria-labelledby='noir-facebook-title'>
    <title id='noir-facebook-title'>Facebook</title>
    <path d='M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z' />
  </svg>
);

const InstagramIcon = () => (
  <svg {...iconProps} aria-labelledby='noir-instagram-title'>
    <title id='noir-instagram-title'>Instagram</title>
    <rect x='2' y='2' width='20' height='20' rx='5' ry='5' />
    <path d='M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z' />
    <line x1='17.5' y1='6.5' x2='17.51' y2='6.5' />
  </svg>
);

const TikTokIcon = () => (
  <svg {...iconProps} aria-labelledby='noir-tiktok-title'>
    <title id='noir-tiktok-title'>TikTok</title>
    <path d='M9 12a4 4 0 1 0 0 8 4 4 0 0 0 0-8z' />
    <path d='M15 8c0 5 4 8 5 8' />
    <path d='M9 16v8' />
    <path d='M15 20V4c0-2 2-3 4-3' />
  </svg>
);

const TwitterIcon = () => (
  <svg {...iconProps} aria-labelledby='noir-twitter-title'>
    <title id='noir-twitter-title'>X</title>
    <path d='M4 4l16 16M20 4L4 20' />
  </svg>
);

const YoutubeIcon = () => (
  <svg {...iconProps} aria-labelledby='noir-youtube-title'>
    <title id='noir-youtube-title'>YouTube</title>
    <rect x='2' y='5' width='20' height='14' rx='4' />
    <path d='M10 9l5 3-5 3z' />
  </svg>
);

const PinterestIcon = () => (
  <svg {...iconProps} aria-labelledby='noir-pinterest-title'>
    <title id='noir-pinterest-title'>Pinterest</title>
    <circle cx='12' cy='12' r='10' />
    <path d='M8.5 20l3-9' />
    <path d='M9 12.5c1.5 2 5 1.5 5.8-1.4.8-2.9-1.7-4.8-4-4.3' />
  </svg>
);

const LinkedinIcon = () => (
  <svg {...iconProps} aria-labelledby='noir-linkedin-title'>
    <title id='noir-linkedin-title'>LinkedIn</title>
    <rect x='2' y='2' width='20' height='20' rx='3' />
    <path d='M7 10v7M7 7v.01M12 17v-4a2 2 0 0 1 4 0v4' />
  </svg>
);

const MailIcon = () => (
  <svg {...iconProps} aria-labelledby='noir-mail-title'>
    <title id='noir-mail-title'>Email</title>
    <rect x='2' y='4' width='20' height='16' rx='3' />
    <path d='M3 7l9 6 9-6' />
  </svg>
);

const socialIconMap: Record<SocialPlatform, FC> = {
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  twitter: TwitterIcon,
  youtube: YoutubeIcon,
  pinterest: PinterestIcon,
  linkedin: LinkedinIcon,
};

/**
 * Display names for the accessible label. Capitalising the platform slug
 * would render "Tiktok" / "Linkedin" — wrong for the brands, and the label is
 * what a screen reader announces.
 */
const socialNameMap: Record<SocialPlatform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  twitter: "X",
  youtube: "YouTube",
  pinterest: "Pinterest",
  linkedin: "LinkedIn",
};

const DEFAULT_SOCIAL_LINKS = [
  { id: "instagram", name: "Instagram", url: "#", Icon: InstagramIcon },
  { id: "tiktok", name: "TikTok", url: "#", Icon: TikTokIcon },
];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

/**
 * Noir Footer — dark luxury variant, rebuilt to the Demo 5 reference.
 *
 * Reference composition (desktop):
 *
 *   ┌ brand ──────────┬ link groups (from CMS) ─────────┬ newsletter ┐
 *   │ wordmark        │ SHOP   COMPANY   HELP           │ STAY IN…   │
 *   │ description     │ …      …         …              │ input →    │
 *   │ social row      │                                 │            │
 *   ├─────────────────────────────────────────────────────────────────┤
 *   │ © copyright         payment badges        region / currency     │
 *   └─────────────────────────────────────────────────────────────────┘
 *
 * Everything is CMS-driven through Layout Settings — the link groups are
 * rendered as-is from `footer.footerLinkGroups`, so SHOP / COMPANY / HELP
 * are merchant data, not code. Nothing here hardcodes a brand, a product,
 * or a route.
 *
 * The newsletter column keeps the `data-footer-newsletter` hook so the
 * existing `html[data-has-template-newsletter]` rule can still hide it for a
 * template that renders its own newsletter band. No Noir template does any
 * more — the footer owns the newsletter here — but the hook stays so the rule
 * keeps working for the other demos. The row is flex, not a fixed grid, so
 * hiding that column closes the gap instead of leaving a hole.
 *
 * This component renders its own outer panel (gutter, max-width, radius,
 * hairline ring). Callers must render it bare — never inside another frame,
 * or it double-wraps.
 */
export function NoirFooter() {
  const layoutSettings = useLayoutSettings();
  const { locale } = useMinimalI18n();
  const isAr = locale === "ar";
  // Letter-spacing utilities are gated off for Arabic (rule 8)
  const trackWide = isAr ? "" : "tracking-[0.22em]";
  const trackTight = isAr ? "" : "tracking-[0.06em]";

  const footer = layoutSettings.footer;

  /* ── CMS values with fallbacks ── */

  const effectiveDescription =
    (isAr ? footer.descriptionAr || footer.description : footer.description) ||
    (isAr
      ? "فخامة داكنة، حضور واثق. صُمم بعناية للفرد العصري."
      : "Dark luxury, bold presence. Crafted with intention for the modern individual.");

  const effectiveCopyright =
    (isAr ? footer.copyrightAr || footer.copyright : footer.copyright) ||
    STORE_NAME;

  const newsletterTitle =
    (isAr
      ? footer.newsletterTitleAr || footer.newsletterTitle
      : footer.newsletterTitle) ||
    (isAr ? "ابق على اطلاع" : "Stay in the know");

  const newsletterDescription =
    (isAr
      ? footer.newsletterDescriptionAr || footer.newsletterDescription
      : footer.newsletterDescription) ||
    (isAr
      ? "اشترك ليصلك كل جديد وعروض حصرية وقصص العطور."
      : "Subscribe for new drops, exclusive offers, and scent stories.");

  const newsletterPlaceholder =
    (isAr
      ? footer.newsletterPlaceholderAr || footer.newsletterPlaceholder
      : footer.newsletterPlaceholder) ||
    (isAr ? "بريدك الإلكتروني" : "Enter your email");

  const regionLabel = isAr
    ? footer.regionLabelAr || footer.regionLabel
    : footer.regionLabel;

  const paymentBadges: PaymentBadge[] =
    footer.showPaymentBadges === false ? [] : (footer.paymentBadges ?? []);

  /* ── Social links (CMS, plus a mailto when a contact email is set) ── */

  const cmsSocials = footer.socialLinks.length
    ? footer.socialLinks.map((sl) => ({
        id: sl.id,
        name: socialNameMap[sl.platform] ?? sl.platform,
        url: sl.url,
        Icon: socialIconMap[sl.platform] ?? FacebookIcon,
      }))
    : DEFAULT_SOCIAL_LINKS;

  const socialLinks = footer.contactEmail
    ? [
        ...cmsSocials,
        {
          id: "email",
          name: isAr ? "البريد الإلكتروني" : "Email",
          url: `mailto:${footer.contactEmail}`,
          Icon: MailIcon,
        },
      ]
    : cmsSocials;

  /* ── Link groups (CMS) ── */

  const linkGroups = footer.footerLinkGroups.map((group) => ({
    id: group.id,
    title: isAr ? group.titleAr || group.title : group.title,
    links: group.links.map((link) => ({
      id: link.id,
      label: isAr ? link.labelAr || link.label : link.label,
      url: link.url,
    })),
  }));

  return (
    /*
      The footer carries its OWN panel — page gutter, frame max-width, radius
      and hairline ring. It used to inherit those from whatever wrapped it,
      which is exactly why /faq (inside NoirPageFrame's rounded frame) and the
      landing (a full-bleed sibling of NoirChrome) rendered the same markup at
      two different widths and radii. Owning the panel here means every caller
      gets a pixel-identical footer and no caller needs to wrap it.
    */
    <div
      className='w-full'
      style={{
        paddingInline: NOIR_REF_PAGE_GUTTER,
        paddingBottom: NOIR_REF.frame.topGap,
      }}>
      <div
        className='mx-auto w-full'
        style={{ maxWidth: NOIR_REF.frame.maxWidth }}>
        <footer
          className='relative overflow-hidden bg-[#0a0a0a] text-[#A3A3A3] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)] selection:bg-[#E8112D]/30'
          style={{ borderRadius: NOIR_REF.frame.radius }}>
          <div className='mx-auto w-full max-w-300 px-6 py-14 md:px-10 md:py-16 lg:px-14'>
            {/* ── Main row ── */}
            <div className='flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-12'>
              {/* Brand column */}
              <div className='lg:w-70 lg:shrink-0'>
                <FooterLogo
                  textClassName={cn(
                    "inline-block text-2xl md:text-[26px] font-bold uppercase leading-none text-white",
                    "transition-colors duration-300 hover:text-[#E8112D]",
                    isAr ? "" : "tracking-[0.2em]",
                    NOIR_DISPLAY_FONT_CLASSES,
                  )}
                />
                <p className='mt-6 max-w-70 text-[13px] leading-relaxed text-[#A3A3A3]'>
                  {effectiveDescription}
                </p>
                {socialLinks.length > 0 && (
                  <div className='mt-7 flex items-center gap-5'>
                    {socialLinks.map((social) => (
                      <a
                        key={social.id}
                        href={social.url}
                        target={
                          social.url.startsWith("mailto:")
                            ? undefined
                            : "_blank"
                        }
                        rel='noopener noreferrer'
                        className='text-[#8A8A8A] transition-colors duration-300 hover:text-[#E8112D]'
                        aria-label={social.name}>
                        <social.Icon />
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Link groups — whatever the merchant configured in the CMS */}
              {linkGroups.length > 0 && (
                <nav className='grid flex-1 grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:gap-x-12'>
                  {linkGroups.map((group) => (
                    <div key={group.id}>
                      <h4
                        className={cn(
                          "text-[11px] font-semibold uppercase text-white",
                          trackWide,
                          NOIR_DISPLAY_FONT_CLASSES,
                        )}>
                        {group.title}
                      </h4>
                      <ul className='mt-5 space-y-3'>
                        {group.links.map((link) => (
                          <li key={link.id}>
                            <Link
                              href={link.url}
                              className='text-[13px] text-[#A3A3A3] transition-colors duration-300 hover:text-[#E8112D]'>
                              {link.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </nav>
              )}

              {/* Newsletter column */}
              {footer.showNewsletter && (
                <div
                  data-footer-newsletter
                  className='lg:w-72 lg:shrink-0 lg:border-s lg:border-white/10 lg:ps-12'>
                  <h4
                    className={cn(
                      "text-[11px] font-semibold uppercase text-white",
                      trackWide,
                      NOIR_DISPLAY_FONT_CLASSES,
                    )}>
                    {newsletterTitle}
                  </h4>
                  <p className='mt-5 text-[13px] leading-relaxed text-[#A3A3A3]'>
                    {newsletterDescription}
                  </p>
                  {/*
                No-op submit, exactly like NoirNewsletter: this template family
                has no subscription backend yet, and the landing props contract
                exposes no newsletter callback. Wiring a fake success would be
                worse than doing nothing.
              */}
                  <form
                    onSubmit={(e) => e.preventDefault()}
                    className='mt-6 flex items-stretch overflow-hidden rounded-md border border-white/12 bg-[#111111] transition-colors duration-300 focus-within:border-[#E8112D]'>
                    <label htmlFor='noir-footer-newsletter' className='sr-only'>
                      {newsletterTitle}
                    </label>
                    <input
                      id='noir-footer-newsletter'
                      type='email'
                      required
                      placeholder={newsletterPlaceholder}
                      className='min-w-0 flex-1 bg-transparent px-4 py-3 text-[13px] text-white placeholder:text-[#6B6B6B] focus:outline-none'
                    />
                    <button
                      type='submit'
                      className={cn(
                        "flex shrink-0 items-center justify-center px-4 text-white transition-colors duration-300",
                        NOIR_ACCENT_BG_CLASSES,
                      )}
                      aria-label={isAr ? "اشترك" : "Subscribe"}>
                      <ArrowRight
                        className='h-4 w-4 rtl:rotate-180'
                        strokeWidth={1.75}
                      />
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* ── Legal strip ── */}
          <div className='border-t border-white/10'>
            <div className='mx-auto flex w-full max-w-300 flex-col items-center gap-5 px-6 py-6 md:px-10 lg:px-14 md:flex-row md:justify-between'>
              <p className={cn("text-[11px] text-[#8A8A8A]", trackTight)}>
                &copy; {new Date().getFullYear()} {effectiveCopyright}
              </p>

              {paymentBadges.length > 0 && (
                <div className='flex items-center gap-2'>
                  {paymentBadges.map((badge) => {
                    const Badge = NOIR_PAYMENT_BADGES[badge];
                    return Badge ? <Badge key={badge} /> : null;
                  })}
                </div>
              )}

              {regionLabel && (
                <p className={cn("text-[11px] text-[#8A8A8A]", trackTight)}>
                  {regionLabel}
                </p>
              )}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
