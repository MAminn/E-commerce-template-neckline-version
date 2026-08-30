import { useMemo, useState, type ReactNode } from "react";
import { Minus, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import type { SortingPageProduct } from "../sorting/SortingMinimalTemplate";
import { useCart } from "#root/lib/context/CartContext";
import { showCartToast } from "#root/components/ui/cart-toast";
import { useMinimalI18n } from "#root/lib/i18n/MinimalI18nContext";
import { cn } from "#root/lib/utils";
import { NoirChrome } from "./NoirChrome";
import type { NoirProduct } from "./ProductCardNoir";
import { NoirShopProductCard } from "./NoirShopProductCard";
import { NoirSkeletonCard } from "./NoirProductSection";
import { formatNoirPrice } from "./format-price";
import {
  NOIR_DISPLAY_FONT_CLASSES,
  NOIR_INPUT_CLASSES,
  NOIR_MONO_FONT_CLASSES,
  NOIR_TEXT_MUTED_CLASSES,
  NOIR_TEXT_SECONDARY_CLASSES,
} from "./noir-tokens";

/* ------------------------------------------------------------------ */
/*  Types — exact sorting template contract                            */
/*  (pages/shop/+Page.tsx and pages/categories/@slug/+Page.tsx)        */
/* ------------------------------------------------------------------ */

export interface SortingNoirTemplateProps {
  products?: SortingPageProduct[];
  isLoading?: boolean;
  emptyStateMessage?: string;
  defaultSort?: string;
  onSortChange?: (value: string) => void;
  onOpenFilters?: () => void;
  className?: string;
  /** Admin preview mode — disables the <html> chrome side effect */
  previewMode?: boolean;
  /**
   * Page heading. Defaults to "Shop"; the category page passes the category
   * name so one template serves both routes.
   */
  heading?: string;
  /**
   * Product ids the merchant marked as featured in the homepage CMS
   * (`featuredProducts.productIds`). Those products get the "Best Seller"
   * badge. Empty/absent → no badges, which is the honest result when the
   * merchant has not chosen any.
   */
  featuredProductIds?: string[];
}

interface FilterState {
  search: string;
  categories: string[];
  /** null = no user constraint (full data range) */
  priceRange: [number, number] | null;
  inStockOnly: boolean;
}

function resolveImageUrl(url?: string | null): string {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("/")) return url;
  return `/uploads/${url}`;
}

/* ------------------------------------------------------------------ */
/*  Sidebar checkbox                                                   */
/* ------------------------------------------------------------------ */

/**
 * Tick mark, drawn as a background image because `appearance: none` inputs do
 * not reliably render pseudo-elements across browsers. Inlined as a data URI
 * so it costs no request and inherits nothing.
 */
const NOIR_CHECKBOX_TICK =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2.6 6.3 4.9 8.6 9.4 3.8' fill='none' stroke='%23fff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";

/**
 * NoirCheckbox — the sidebar's filter checkbox.
 *
 * The native control (`accent-[#E8112D]`) still paints the browser's own
 * chrome for the UNCHECKED state, which on a dark page is a white filled box —
 * the single most off-reference thing in the sidebar, since `accent-color`
 * only recolours the checked fill. `appearance-none` drops that chrome
 * entirely and the box is drawn here: near-black fill with a hairline muted
 * border unchecked, solid accent with a white tick checked.
 *
 * It is a real `<input type="checkbox">` throughout — only its painting
 * changes. Keyboard focus, the label's click target, and the controlled
 * `checked`/`onChange` contract are all untouched.
 */
function NoirCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <input
      type='checkbox'
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className={cn(
        "h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-[2px] border",
        "bg-center bg-no-repeat transition-colors duration-200",
        checked
          ? "border-[#E8112D] bg-[#E8112D]"
          : "border-white/25 bg-[#0B0B0B] group-hover:border-white/45",
        "focus-visible:border-[#E8112D] focus-visible:outline-none",
      )}
      style={
        checked
          ? { backgroundImage: NOIR_CHECKBOX_TICK, backgroundSize: "11px 11px" }
          : undefined
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Collapsible filter group                                          */
/* ------------------------------------------------------------------ */

function FilterGroup({
  title,
  children,
  defaultOpen = true,
  track,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  track: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className='border-t border-white/10 py-5 first:border-t-0 first:pt-0'>
      <button
        type='button'
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className='flex w-full items-center justify-between gap-2 text-start'>
        <span
          className={cn(
            "text-[11px] font-semibold uppercase text-white",
            track,
            NOIR_DISPLAY_FONT_CLASSES,
          )}>
          {title}
        </span>
        {open ? (
          <Minus className='h-3.5 w-3.5 shrink-0 text-white/50' strokeWidth={2} />
        ) : (
          <Plus className='h-3.5 w-3.5 shrink-0 text-white/50' strokeWidth={2} />
        )}
      </button>
      {open && <div className='mt-4'>{children}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

/**
 * SortingNoirTemplate — Demo 5 "Noir" shop / category collection page,
 * rebuilt to the Demo 5 shop reference.
 *
 * Layout: heading + result count on the left rail, sort control top-right of
 * the grid, sticky filter sidebar, steady 4-column card grid.
 *
 * ── Filter groups are limited to what the data can actually support ──
 *
 * The reference mocks up SCENT FAMILY / INTENSITY / BEST FOR / INGREDIENTS.
 * Only the first has a real source (product categories); the store has no
 * intensity, occasion or ingredient fields on `product`, so those three
 * groups are deliberately NOT built — inventing them would mean shipping
 * filters that cannot filter. Scent family, price and availability are all
 * derived from live product data, and every option carries its real count.
 *
 * The search box is not in the reference but is kept: it is existing working
 * functionality on this page and dropping it to match a mock would be a
 * regression.
 */
export function SortingNoirTemplate({
  products = [],
  isLoading = false,
  emptyStateMessage,
  defaultSort = "featured",
  onSortChange,
  className = "",
  previewMode = false,
  heading,
  featuredProductIds,
}: SortingNoirTemplateProps) {
  const { t, locale } = useMinimalI18n();
  const isAr = locale === "ar";
  const track = isAr ? "" : "tracking-[0.18em]";
  const { addItem } = useCart();

  const [currentSort, setCurrentSort] = useState(defaultSort);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    categories: [],
    priceRange: null,
    inStockOnly: false,
  });

  const SORT_OPTIONS = [
    { value: "featured", label: isAr ? "مميز" : "Featured" },
    { value: "newest", label: t("new_arrivals") },
    {
      value: "price-asc",
      label: isAr ? "السعر: من الأقل" : "Price: Low to High",
    },
    {
      value: "price-desc",
      label: isAr ? "السعر: من الأعلى" : "Price: High to Low",
    },
  ];

  const featuredSet = useMemo(
    () => new Set(featuredProductIds ?? []),
    [featuredProductIds],
  );

  // Category names + their real counts, derived from the product data.
  const availableCategories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      if (p.categoryName)
        counts.set(p.categoryName, (counts.get(p.categoryName) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [products]);

  const inStockCount = useMemo(
    () => products.filter((p) => p.stock > 0).length,
    [products],
  );

  // Full price range of the data set
  const dataPriceRange = useMemo((): [number, number] => {
    if (products.length === 0) return [0, 0];
    const prices = products.map((p) => Number(p.discountPrice ?? p.price));
    return [Math.floor(Math.min(...prices)), Math.ceil(Math.max(...prices))];
  }, [products]);

  const effectiveRange = filters.priceRange ?? dataPriceRange;

  const filteredAndSorted = useMemo(() => {
    let filtered = [...products];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (filters.categories.length > 0) {
      filtered = filtered.filter(
        (p) => p.categoryName && filters.categories.includes(p.categoryName),
      );
    }
    if (filters.inStockOnly) {
      filtered = filtered.filter((p) => p.stock > 0);
    }
    if (filters.priceRange) {
      filtered = filtered.filter((p) => {
        const price = Number(p.discountPrice ?? p.price);
        return (
          price >= (filters.priceRange as [number, number])[0] &&
          price <= (filters.priceRange as [number, number])[1]
        );
      });
    }

    filtered.sort((a, b) => {
      switch (currentSort) {
        case "price-asc":
          return (
            Number(a.discountPrice ?? a.price) -
            Number(b.discountPrice ?? b.price)
          );
        case "price-desc":
          return (
            Number(b.discountPrice ?? b.price) -
            Number(a.discountPrice ?? a.price)
          );
        case "newest":
          return b.id.localeCompare(a.id);
        default:
          return 0;
      }
    });

    return filtered;
  }, [products, filters, currentSort]);

  const hasActiveFilters =
    filters.search !== "" ||
    filters.categories.length > 0 ||
    filters.priceRange !== null ||
    filters.inStockOnly;

  const clearFilters = () =>
    setFilters({
      search: "",
      categories: [],
      priceRange: null,
      inStockOnly: false,
    });

  const toggleCategory = (category: string) =>
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));

  const setPrice = (next: [number, number]) =>
    setFilters((prev) => ({ ...prev, priceRange: next }));

  const handleSortChange = (value: string) => {
    setCurrentSort(value);
    onSortChange?.(value);
  };

  // Add-to-cart from the grid — same cart source the existing cards use
  const handleAddToCart = (product: NoirProduct) => {
    if (product.available === false) return;
    const price = Number(
      product.discountPrice != null && product.discountPrice !== ""
        ? product.discountPrice
        : product.price,
    );
    const imageUrl =
      product.images && product.images.length > 0
        ? resolveImageUrl(
            (product.images.find((i) => i.isPrimary) || product.images[0])?.url,
          )
        : resolveImageUrl(product.imageUrl);
    const success = addItem(
      {
        id: product.id,
        name: product.name,
        price,
        imageUrl: imageUrl || undefined,
        stock: product.stock ?? 0,
      },
      1,
      {},
    );
    if (success) {
      showCartToast({
        name: product.name,
        price,
        imageUrl: imageUrl || undefined,
      });
    }
  };

  const optionRowClasses =
    "flex w-full items-center gap-2.5 cursor-pointer group";
  const optionLabelClasses = cn(
    "flex-1 text-[13px] transition-colors duration-200 group-hover:text-white",
    NOIR_TEXT_SECONDARY_CLASSES,
  );
  const optionCountClasses = cn(
    "text-[11px] text-[#6B6B6B]",
    NOIR_MONO_FONT_CLASSES,
  );
  /*
    Both price handles share this. The track is drawn by the sibling divs, so
    the input itself is transparent and only its thumb is interactive —
    otherwise the upper input would swallow every click meant for the lower.
  */
  const rangeInputClasses =
    "pointer-events-none absolute inset-x-0 top-0 h-4 w-full appearance-none bg-transparent " +
    "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 " +
    "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#E8112D] " +
    "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 " +
    "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[#E8112D]";

  /* ── Filter panel (shared desktop sidebar / mobile collapsible) ── */
  const filterPanel = (
    <div>
      {/* Panel header — reference "FILTERS  ·  Clear all", flat, no card. */}
      <div className='flex items-center justify-between gap-3 pb-4'>
        <h2
          className={cn(
            "text-[12px] font-semibold uppercase text-white",
            track,
            NOIR_DISPLAY_FONT_CLASSES,
          )}>
          {isAr ? "الفلاتر" : "Filters"}
        </h2>
        {hasActiveFilters && (
          <button
            type='button'
            onClick={clearFilters}
            className='text-[11px] text-[#8A8A8A] transition-colors duration-200 hover:text-[#E8112D]'>
            {isAr ? "مسح الكل" : "Clear all"}
          </button>
        )}
      </div>

      {/* Search — not in the reference, kept because it works. Styled as a
          plain row so it does not break the flat, line-based rhythm. */}
      <FilterGroup title={isAr ? "بحث" : "Search"} track={track}>
        <div className='relative'>
          <Search
            className={cn(
              "absolute start-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2",
              NOIR_TEXT_MUTED_CLASSES,
            )}
            strokeWidth={1.5}
          />
          <input
            type='text'
            value={filters.search}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value }))
            }
            placeholder={isAr ? "ابحث..." : "Search products..."}
            className='w-full border-0 border-b border-white/10 bg-transparent py-2 pe-0 ps-6 text-[13px] text-white placeholder:text-[#6B6B6B] focus:border-[#E8112D] focus:outline-none'
          />
        </div>
      </FilterGroup>

      {/* Scent family — real categories, real counts */}
      {availableCategories.length > 0 && (
        <FilterGroup
          title={isAr ? "العائلة العطرية" : "Scent Family"}
          track={track}>
          <div className='space-y-3.5'>
            {availableCategories.map((category) => (
              <label key={category.name} className={optionRowClasses}>
                <NoirCheckbox
                  checked={filters.categories.includes(category.name)}
                  onChange={() => toggleCategory(category.name)}
                />
                <span className={optionLabelClasses}>{category.name}</span>
                <span className={optionCountClasses}>{category.count}</span>
              </label>
            ))}
          </div>
        </FilterGroup>
      )}

      {/* Availability */}
      <FilterGroup title={isAr ? "التوفر" : "Availability"} track={track}>
        <label className={optionRowClasses}>
          <NoirCheckbox
            checked={filters.inStockOnly}
            onChange={(next) =>
              setFilters((prev) => ({ ...prev, inStockOnly: next }))
            }
          />
          <span className={optionLabelClasses}>{t("in_stock")}</span>
          <span className={optionCountClasses}>{inStockCount}</span>
        </label>
      </FilterGroup>

      {/* Price — dual-handle range over the real data range */}
      {products.length > 0 && dataPriceRange[1] > dataPriceRange[0] && (
        <FilterGroup title={isAr ? "السعر" : "Price"} track={track}>
          {/*
            Two overlaid range inputs. Each handle is clamped against the
            other so the pair can never cross, which a single input cannot
            express and a slider library would not be worth the dependency.
          */}
          <div className='relative h-4'>
            <div className='absolute top-1/2 h-px w-full -translate-y-1/2 bg-white/15' />
            <div
              className='absolute top-1/2 h-0.5 -translate-y-1/2 bg-[#E8112D]'
              style={{
                insetInlineStart: `${((effectiveRange[0] - dataPriceRange[0]) / (dataPriceRange[1] - dataPriceRange[0])) * 100}%`,
                width: `${((effectiveRange[1] - effectiveRange[0]) / (dataPriceRange[1] - dataPriceRange[0])) * 100}%`,
              }}
            />
            <input
              type='range'
              min={dataPriceRange[0]}
              max={dataPriceRange[1]}
              value={effectiveRange[0]}
              onChange={(e) =>
                setPrice([
                  Math.min(Number(e.target.value), effectiveRange[1]),
                  effectiveRange[1],
                ])
              }
              aria-label={isAr ? "أدنى سعر" : "Minimum price"}
              className={rangeInputClasses}
            />
            <input
              type='range'
              min={dataPriceRange[0]}
              max={dataPriceRange[1]}
              value={effectiveRange[1]}
              onChange={(e) =>
                setPrice([
                  effectiveRange[0],
                  Math.max(Number(e.target.value), effectiveRange[0]),
                ])
              }
              aria-label={isAr ? "أعلى سعر" : "Maximum price"}
              className={rangeInputClasses}
            />
          </div>
          <div
            className={cn(
              "mt-3 flex items-center justify-between text-[12px] text-[#8A8A8A]",
              NOIR_MONO_FONT_CLASSES,
            )}>
            <span>{formatNoirPrice(effectiveRange[0])}</span>
            <span>{formatNoirPrice(effectiveRange[1])}</span>
          </div>
        </FilterGroup>
      )}
    </div>
  );

  const resultCount = filteredAndSorted.length;

  /*
    Grid: 4 columns on wide screens, as the reference. The previous version
    narrowed the column count and capped the width when few products matched,
    which made the same store look like a different page depending on stock.
  */
  /*
    `auto-rows-fr` gives every row the same height, so cards stay aligned even
    though the card body now renders only the rows it has real data for. It is
    what lets the card drop its empty placeholder line boxes without the grid
    going ragged from one row to the next.
  */
  const gridClasses =
    "grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  return (
    <NoirChrome previewMode={previewMode}>
      {/*
        Near-full-bleed. The reference sits on ~22px of page padding with the
        sidebar starting at the left edge — NOT inside a centred max-w
        container, which is what made the previous attempt read as narrow and
        floating on a wide monitor. The cap only stops the grid stretching
        absurdly on ultrawide displays; below it the page is full width.
      */}
      <div
        className={cn(
          "mx-auto w-full max-w-480 px-5 py-6 md:px-6 md:py-8",
          className,
        )}>
        <div className='lg:flex lg:items-start lg:gap-7'>
          {/* ── Left rail: heading + flat filter list ── */}
          <div className='lg:w-62.5 lg:shrink-0'>
            <h1
              className={cn(
                "text-[clamp(1.6rem,2.4vw,2rem)] font-bold uppercase leading-none text-white",
                isAr ? "" : "tracking-[0.04em]",
                NOIR_DISPLAY_FONT_CLASSES,
              )}>
              {heading || (isAr ? "المتجر" : "Shop")}
            </h1>

            {/* Desktop sidebar — flat and line-based: a top rule and section
                dividers, no rounded card, no panel background. */}
            <aside className='mt-7 hidden border-t border-white/10 pt-5 lg:block'>
              <div className='sticky top-24'>{filterPanel}</div>
            </aside>
          </div>

          {/* ── Right: count + sort, then the grid ── */}
          <div className='mt-6 min-w-0 flex-1 lg:mt-0'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              {!isLoading && (
                <p
                  className={cn(
                    "text-[12px] uppercase",
                    track,
                    NOIR_MONO_FONT_CLASSES,
                    NOIR_TEXT_SECONDARY_CLASSES,
                  )}>
                  {isAr
                    ? `${resultCount} منتج`
                    : `${resultCount} ${resultCount === 1 ? "scent" : "scents"}`}
                </p>
              )}

              <div className='ms-auto flex items-center gap-3'>
                {/* Mobile filters toggle */}
                <button
                  type='button'
                  onClick={() => setMobileFiltersOpen((v) => !v)}
                  aria-expanded={mobileFiltersOpen}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-[3px] border border-white/15 px-4 py-2.5 lg:hidden",
                    "text-[11px] uppercase text-white/80 transition-colors duration-200 hover:border-white/40",
                    track,
                    NOIR_DISPLAY_FONT_CLASSES,
                  )}>
                  {mobileFiltersOpen ? (
                    <X className='h-3.5 w-3.5' strokeWidth={1.5} />
                  ) : (
                    <SlidersHorizontal
                      className='h-3.5 w-3.5'
                      strokeWidth={1.5}
                    />
                  )}
                  {isAr ? "الفلاتر" : "Filters"}
                </button>

                <label
                  className={cn(
                    "hidden text-[11px] uppercase sm:inline",
                    track,
                    NOIR_DISPLAY_FONT_CLASSES,
                    NOIR_TEXT_MUTED_CLASSES,
                  )}
                  htmlFor='noir-shop-sort'>
                  {isAr ? "ترتيب حسب" : "Sort by"}
                </label>
                <select
                  id='noir-shop-sort'
                  value={currentSort}
                  onChange={(e) => handleSortChange(e.target.value)}
                  aria-label={isAr ? "ترتيب" : "Sort by"}
                  className={cn(
                    "cursor-pointer rounded-[3px] px-3 py-2.5 text-xs",
                    NOIR_INPUT_CLASSES,
                  )}>
                  {SORT_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      className='bg-[#101010]'>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── Mobile collapsible filter panel ── */}
            {mobileFiltersOpen && (
              <div className='mt-5 border-t border-white/10 pt-5 lg:hidden'>
                {filterPanel}
              </div>
            )}

            <div className='mt-5'>
              {isLoading ? (
                <div className={gridClasses}>
                  {Array.from({ length: 8 }, (_, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static skeletons
                    <NoirSkeletonCard key={i} />
                  ))}
                </div>
              ) : resultCount === 0 ? (
                <div className='space-y-4 py-24 text-center'>
                  <p className={cn("text-sm", NOIR_TEXT_SECONDARY_CLASSES)}>
                    {emptyStateMessage ||
                      (isAr ? "لا توجد منتجات" : "No products found")}
                  </p>
                  {hasActiveFilters && (
                    <button
                      type='button'
                      onClick={clearFilters}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-[3px] border border-white/20 px-8 py-3",
                        "text-xs uppercase text-white/80 transition-colors duration-300 hover:border-white/50 hover:text-white",
                        track,
                        NOIR_DISPLAY_FONT_CLASSES,
                      )}>
                      {isAr ? "مسح الفلاتر" : "Clear filters"}
                    </button>
                  )}
                </div>
              ) : (
                <div className={gridClasses}>
                  {filteredAndSorted.map((product, i) => (
                    <NoirShopProductCard
                      key={product.id}
                      index={i + 1}
                      product={{
                        ...product,
                        // Scent notes come from the merchant's description.
                        notes: product.description || undefined,
                        badge: featuredSet.has(product.id)
                          ? "bestseller"
                          : undefined,
                      }}
                      onAddToCart={handleAddToCart}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </NoirChrome>
  );
}

SortingNoirTemplate.displayName = "SortingNoirTemplate";
