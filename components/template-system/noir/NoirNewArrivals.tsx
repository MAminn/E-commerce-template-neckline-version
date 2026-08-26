import type { HomepageNewArrivalsContent } from "#root/shared/types/homepage-content";
import { useMinimalI18n } from "#root/lib/i18n/MinimalI18nContext";
import { NoirProductSection } from "./NoirProductSection";
import type { NoirProduct } from "./ProductCardNoir";

interface NoirNewArrivalsProps {
  /** CMS "New Arrivals" section content (title / view-all / enable flag). */
  content?: HomepageNewArrivalsContent;
  /** Newest products, fetched dynamically and passed by LandingTemplateNoir. */
  products?: NoirProduct[];
  /** Loading state for the products fetch. */
  isLoading?: boolean;
}

/**
 * NoirNewArrivals — the dashboard-controlled "New Arrivals" row on the Noir
 * landing, rendered as its own section (separate from the Explore Scents
 * category grid). A thin wrapper around the shared NoirProductSection.
 *
 * Fully CMS-driven: title / view-all text / link come from
 * `content.newArrivals`; products come from the `newArrivals` pool that
 * pages/index/+Page.tsx already fetches. Renders nothing when the CMS
 * section is disabled or there is no data.
 */
export function NoirNewArrivals({
  content,
  products = [],
  isLoading = false,
}: NoirNewArrivalsProps) {
  const { locale } = useMinimalI18n();
  const isAr = locale === "ar";

  const show = content?.enabled && (products.length > 0 || isLoading);
  if (!show || !content) return null;

  const title =
    (isAr && content.titleAr ? content.titleAr : content.title) ||
    (isAr ? "وصل حديثاً" : "New Arrivals");

  return (
    <NoirProductSection
      title={title}
      viewAllText={
        isAr && content.viewAllTextAr ? content.viewAllTextAr : content.viewAllText
      }
      viewAllLink={content.viewAllLink || "/shop"}
      products={products}
      isLoading={isLoading}
    />
  );
}
