import type { HomepageContent } from "#root/shared/types/homepage-content";
import type { FeaturedProduct } from "../home/HomeFeaturedProducts";
import type { CategoryStripItem } from "#root/components/shop/CategoryStrip";
import type { NewArrivalProduct } from "#root/components/shop/NewArrivals";
import { NoirChrome } from "./NoirChrome";
import { NoirReferenceTopFrame } from "./NoirReferenceTopFrame";
import { NoirReferenceBenefits } from "./NoirReferenceBenefits";
import { NoirWhyUs } from "./NoirWhyUs";
import { NoirExploreGrid } from "./NoirExploreGrid";
import { NoirNewArrivals } from "./NoirNewArrivals";
import { NoirReferenceReviews } from "./NoirReferenceReviews";
import { NoirFaqSection } from "./NoirFaqSection";
import { NoirFooterCta } from "./NoirFooterCta";

/**
 * LandingTemplateNoir — Demo 5 "Noir" dark-luxury landing page.
 *
 * Consumes the exact landing props contract that pages/index/+Page.tsx
 * passes to every registered landing template (same shape as
 * LandingTemplateModernProps) — registration alone makes it work.
 *
 * ── Newsletter ───────────────────────────────────────────────────────────
 * On Noir the FOOTER owns the newsletter (reference design puts it in the
 * footer's fifth column). This template therefore renders no standalone
 * newsletter band and no longer sets `data-has-template-newsletter`, so the
 * footer column stays visible here exactly as it does on /faq, /shop and the
 * product pages — one signup form per page, one footer everywhere.
 *
 * `content.newsletter` is untouched and still drives the other four demos.
 * To bring the standalone band back, re-add `<NoirNewsletter
 * newsletter={content.newsletter} />` below and restore the
 * `data-has-template-newsletter` effect so the two do not both appear.
 *
 * Section still DEFERRED (no CMS fields yet):
 * - Feature/campaign card — no campaign-card fields exist.
 */
export interface LandingTemplateNoirProps {
  /** Homepage content (editable by merchants) */
  content: HomepageContent;
  /** Featured products data (fetched dynamically) */
  featuredProducts?: FeaturedProduct[];
  /** Discounted products */
  discountedProducts?: FeaturedProduct[];
  /** Categories data (not rendered by Noir in this phase) */
  categories?: CategoryStripItem[];
  /** Loading state for categories */
  categoriesLoading?: boolean;
  /** New arrivals products (latest added, fetched dynamically) */
  newArrivals?: NewArrivalProduct[];
  /** Loading state for new arrivals */
  newArrivalsLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Callback when any CTA button is clicked */
  onCtaClick?: (link: string) => void;
  /** Admin preview mode — disables the <html> chrome side effect */
  previewMode?: boolean;
}

export function LandingTemplateNoir({
  content,
  featuredProducts,
  discountedProducts: _discountedProducts,
  categories: _categories,
  categoriesLoading: _categoriesLoading,
  newArrivals,
  newArrivalsLoading = false,
  className = "",
  onCtaClick,
  previewMode = false,
}: LandingTemplateNoirProps) {
  // CMS promo banner feeds the announcement bar text
  const announcementText = content.promoBanner.enabled
    ? content.promoBanner.text
    : undefined;

  return (
    <NoirChrome
      announcementText={announcementText}
      previewMode={previewMode}
      hideNavbar>
      <div className={className}>
        <NoirReferenceTopFrame
          hero={content.hero}
          onCtaClick={onCtaClick}
          bestSellersContent={content.featuredProducts}
          featuredProducts={featuredProducts}
        />

        <NoirReferenceBenefits
          valueProps={content.valueProps}
          hero={content.hero}
        />

        <NoirWhyUs brandStatement={content.brandStatement} />

        <NoirExploreGrid categoriesContent={content.categories} />

        <NoirNewArrivals
          content={content.newArrivals}
          products={newArrivals}
          isLoading={newArrivalsLoading}
        />

        <NoirReferenceReviews testimonials={content.testimonials} />

        <NoirFooterCta footerCta={content.footerCta} onCtaClick={onCtaClick} />

        {/* FAQ is the last content section — nothing may sit between it and
            the footer, so any new section belongs ABOVE this one. */}
        {content.faq?.enabled && <NoirFaqSection faq={content.faq} />}
      </div>
    </NoirChrome>
  );
}

LandingTemplateNoir.displayName = "LandingTemplateNoir";
