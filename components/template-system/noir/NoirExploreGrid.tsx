import { useEffect, useMemo, useState } from "react";
import type { HomepageCategoriesContent } from "#root/shared/types/homepage-content";
import { trpc } from "#root/shared/trpc/client";
import { useMinimalI18n } from "#root/lib/i18n/MinimalI18nContext";
import { Link } from "#root/components/utils/Link";
import { cn } from "#root/lib/utils";
import type { NoirProduct } from "./ProductCardNoir";
import { NoirScentCard } from "./NoirScentCard";
import { NoirSkeletonCard } from "./NoirProductSection";
import { NoirCategoryTabs, type NoirCategoryTab } from "./NoirCategoryTabs";
import {
  NOIR_CONTAINER,
  NOIR_DISPLAY_FONT_CLASSES,
  NOIR_SECTION_Y,
  NOIR_TEXT_SECONDARY_CLASSES,
} from "./noir-tokens";

/**
 * Noir-only fallback copy. These are UI chrome / last-resort defaults — the
 * CMS "categories" content always wins where the merchant has filled it in.
 * They live here rather than in DEFAULT_HOMEPAGE_CONTENT because that object
 * is shared with Modern/Classic/Editorial/Minimal, which must keep their own
 * generic "Shop by Category" wording.
 */
const NOIR_EXPLORE_EYEBROW = { en: "Explore", ar: "اكتشف" };
const NOIR_EXPLORE_TITLE = { en: "Explore Scents", ar: "اكتشف العطور" };
const NOIR_EXPLORE_SUBTITLE = {
  en: "Eight distinct scents. Each crafted with intention and precision. Find the one that speaks to you.",
  ar: "ثمانية عطور مميزة. كل منها صُنع بعناية ودقة. اعثر على العطر الذي يعبر عنك.",
};
const NOIR_EXPLORE_ALL_TAB = { en: "All Scents", ar: "كل العطور" };
const NOIR_EXPLORE_CTA = { en: "View All Scents", ar: "عرض كل العطور" };

/** Sentinel id for the computed "all products" tab. */
const ALL_SCENTS_TAB_ID = "__all__";

/** Max products fetched across the visible categories for this section. */
const EXPLORE_PRODUCT_LIMIT = 24;

/** Cards shown per tab — the reference is a single 4-up row. */
const EXPLORE_ROW_SIZE = 4;

/** Product enriched with its primary-category FK for robust filtering. */
type ExploreProduct = NoirProduct & { categoryId?: string | null };

/** A landing-visible category (tab candidate). */
interface ExploreCategory {
  id: string;
  label: string;
}

interface NoirExploreGridProps {
  /**
   * CMS "categories" section content — drives the heading/subtitle and the
   * bottom view-all CTA. The tab list itself comes from real dashboard
   * categories fetched below, never from this content.
   */
  categoriesContent?: HomepageCategoriesContent;
}

/**
 * NoirExploreGrid — Noir "Explore Scents" category-products section.
 *
 * A true, independent category browser: it fetches the real dashboard
 * categories (`category.view`) and the products assigned to the
 * landing-visible ones (`product.search` with `categoryIds`), then builds
 * filter tabs dynamically. It deliberately does NOT reuse the homepage
 * featured / new-arrivals / discounted product pools — this section stands
 * on its own so its data never couples to those sections.
 *
 * - Tabs: a computed "All" tab + one tab per visible category that actually
 *   has products in the fetched pool (no empty tabs, no hardcoded names).
 * - Filtering is client-side (instant tab switching) via the product's
 *   primary-category FK or its `categories[]` junction assignments.
 * - Cards use the section-specific NoirScentCard (explore/discovery card,
 *   no price / no add-to-cart); `description` maps to the notes line.
 */
export function NoirExploreGrid({ categoriesContent }: NoirExploreGridProps) {
  const { t, locale } = useMinimalI18n();
  const isAr = locale === "ar";

  const [categories, setCategories] = useState<ExploreCategory[]>([]);
  const [products, setProducts] = useState<ExploreProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeId, setActiveId] = useState<string>(ALL_SCENTS_TAB_ID);

  // ── Fetch categories, then products for the visible categories ──
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const catResult = await trpc.category.view.query();
        if (cancelled) return;

        const visible =
          catResult.success && catResult.result
            ? catResult.result
                .filter(
                  (c: any) =>
                    !c.deleted && c.showOnLanding !== false,
                )
                .map((c: any) => ({
                  id: c.id as string,
                  label: (c.displayName || c.name || "") as string,
                }))
            : [];

        if (cancelled) return;
        setCategories(visible);

        if (visible.length === 0) {
          setProducts([]);
          return;
        }

        const searchResult = await trpc.product.search.query({
          categoryIds: visible.map((c) => c.id),
          limit: EXPLORE_PRODUCT_LIMIT,
          includeOutOfStock: false,
        });
        if (cancelled) return;

        if (searchResult.success && searchResult.result) {
          setProducts(
            searchResult.result.items.map(
              (item: any): ExploreProduct => ({
                id: item.id,
                name: item.name,
                price: Number(item.price),
                discountPrice:
                  item.discountPrice != null
                    ? Number(item.discountPrice)
                    : null,
                stock: item.stock,
                imageUrl: item.imageUrl ?? undefined,
                images: item.images,
                available: item.available ?? item.stock > 0,
                categoryName: item.categoryName ?? null,
                categoryId: item.categoryId ?? null,
                categories: item.categories,
                // Scent notes: map product description when present.
                notes: item.description || undefined,
              }),
            ),
          );
        } else {
          setProducts([]);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Error loading Noir explore section:", err);
          setCategories([]);
          setProducts([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Does a product belong to a category (via FK or junction assignments)?
  const productInCategory = (p: ExploreProduct, categoryId: string) =>
    p.categoryId === categoryId ||
    (p.categories?.some((c) => c.id === categoryId) ?? false);

  // Only surface tabs for categories that actually have products in the pool.
  const tabs = useMemo<NoirCategoryTab[]>(() => {
    const populated = categories.filter((c) =>
      products.some((p) => productInCategory(p, c.id)),
    );
    if (populated.length === 0) return [];
    const allLabel = isAr ? NOIR_EXPLORE_ALL_TAB.ar : NOIR_EXPLORE_ALL_TAB.en;
    return [
      { id: ALL_SCENTS_TAB_ID, label: allLabel },
      ...populated.map((c) => ({ id: c.id, label: c.label })),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, products, isAr]);

  // Keep the active tab valid if the tab set changes.
  useEffect(() => {
    if (tabs.length === 0) return;
    if (!tabs.some((tab) => tab.id === activeId)) {
      setActiveId(ALL_SCENTS_TAB_ID);
    }
  }, [tabs, activeId]);

  const visibleProducts = useMemo(() => {
    const pool =
      activeId === ALL_SCENTS_TAB_ID
        ? products
        : products.filter((p) => productInCategory(p, activeId));
    // The reference shows ONE row of four and sends the rest to the view-all
    // button. A fifth card wrapping onto a second row is what made the
    // section read as a generic product grid rather than a curated shelf.
    // The wider pool is still fetched — the tabs filter across all of it,
    // and each tab shows its own top four.
    return pool.slice(0, EXPLORE_ROW_SIZE);
  }, [activeId, products]);

  // ── Empty state: never break the page — simply render nothing ──
  if (!isLoading && products.length === 0) return null;

  // Heading / subtitle / CTA come from CMS categories content.
  const heading =
    (isAr && categoriesContent?.titleAr
      ? categoriesContent.titleAr
      : categoriesContent?.title) ||
    (isAr ? NOIR_EXPLORE_TITLE.ar : NOIR_EXPLORE_TITLE.en);
  const subtitle =
    categoriesContent?.subtitle ||
    (isAr ? NOIR_EXPLORE_SUBTITLE.ar : NOIR_EXPLORE_SUBTITLE.en);
  const ctaText =
    categoriesContent?.ctaText ||
    (isAr ? NOIR_EXPLORE_CTA.ar : NOIR_EXPLORE_CTA.en);
  const ctaLink = categoriesContent?.ctaLink || "/shop";

  return (
    <section id='scents' data-noir-section='explore' className={NOIR_SECTION_Y}>
      <div className={NOIR_CONTAINER}>
        {/* ── Centered header ── */}
        <div className='mb-8 md:mb-10 flex flex-col items-center text-center'>
          <p
            className={cn(
              "text-[11px] uppercase text-[#E8112D] font-medium mb-2",
              isAr ? "" : "tracking-[0.28em]",
              NOIR_DISPLAY_FONT_CLASSES,
            )}>
            {isAr ? NOIR_EXPLORE_EYEBROW.ar : NOIR_EXPLORE_EYEBROW.en}
          </p>
          <h2
            className={cn(
              "text-2xl md:text-4xl uppercase font-semibold text-white leading-[1.05]",
              isAr ? "" : "tracking-[0.14em]",
              NOIR_DISPLAY_FONT_CLASSES,
            )}>
            {heading}
          </h2>
          {/* No accent rule here: the reference runs eyebrow -> title ->
              subtitle with nothing between them. */}
          {subtitle && (
            <p
              className={cn(
                "mt-4 max-w-lg text-sm leading-relaxed",
                NOIR_TEXT_SECONDARY_CLASSES,
              )}>
              {subtitle}
            </p>
          )}
        </div>

        {/* ── Filter tabs (skip while first load resolves the set) ── */}
        {tabs.length > 0 && (
          <div className='mb-8 md:mb-10 border-b border-white/10 pb-px'>
            <NoirCategoryTabs
              tabs={tabs}
              activeId={activeId}
              onSelect={setActiveId}
            />
          </div>
        )}

        {/* ── Products ── */}
        {isLoading ? (
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6'>
            {Array.from({ length: 4 }, (_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeletons
              <NoirSkeletonCard key={i} />
            ))}
          </div>
        ) : visibleProducts.length === 0 ? (
          <p
            className={cn(
              "py-16 text-center text-sm",
              NOIR_TEXT_SECONDARY_CLASSES,
            )}>
            {t("out_of_stock")}
          </p>
        ) : isAr ? (
          /* RTL: 2-col grid on mobile, 4-up desktop (no snap carousel) */
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5'>
            {visibleProducts.map((product) => (
              <NoirScentCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <>
            {/* LTR mobile: horizontal snap scroll */}
            <div className='flex md:hidden gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4 px-4 pb-2'>
              {visibleProducts.map((product) => (
                <NoirScentCard
                  key={product.id}
                  product={product}
                  className='w-72 shrink-0 snap-start'
                />
              ))}
            </div>
            {/* Desktop: 4-up grid */}
            <div className='hidden md:grid md:grid-cols-4 gap-5'>
              {visibleProducts.map((product) => (
                <NoirScentCard key={product.id} product={product} />
              ))}
            </div>
          </>
        )}

        {/* ── View-all CTA (centered under the grid) ──
            An outline BUTTON, not a text link with an arrow: the reference
            closes the section with a bordered pill the width of its label. */}
        {ctaText && (
          <div className='mt-10 md:mt-12 flex justify-center'>
            <Link
              href={ctaLink}
              className={cn(
                "inline-flex items-center justify-center px-10 py-4",
                "border border-white/20 bg-transparent rounded-none",
                "text-xs uppercase text-white/85",
                "transition-all duration-300 hover:border-[#E8112D] hover:bg-[#E8112D] hover:text-white",
                isAr ? "" : "tracking-[0.2em]",
                NOIR_DISPLAY_FONT_CLASSES,
              )}>
              {ctaText}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
