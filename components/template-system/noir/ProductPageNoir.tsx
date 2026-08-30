import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Droplet,
  Loader2,
  ImagePlus,
  Minus,
  Package,
  PenLine,
  Plus,
  RefreshCw,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "#root/components/utils/Link";
import { trpc } from "#root/shared/trpc/client";
import type { ProductPageProduct } from "../productPage/ProductPageModernSplit";
import type { FeaturedProduct } from "../home/HomeFeaturedProducts";
import { useMinimalI18n } from "#root/lib/i18n/MinimalI18nContext";
import { cn } from "#root/lib/utils";
import { NoirChrome } from "./NoirChrome";
import { NoirImagePlaceholder, type NoirProduct } from "./ProductCardNoir";
import { NoirShopProductCard } from "./NoirShopProductCard";
import { NoirVariantSelector } from "./NoirVariantSelector";
import { formatNoirPrice } from "./format-price";
import {
  NOIR_ACCENT_BG_CLASSES,
  NOIR_CARD_CLASSES,
  NOIR_CONTAINER,
  NOIR_DISPLAY_FONT_CLASSES,
  NOIR_INPUT_CLASSES,
  NOIR_MONO_FONT_CLASSES,
  NOIR_SECTION_Y,
  NOIR_TEXT_MUTED_CLASSES,
  NOIR_TEXT_SECONDARY_CLASSES,
} from "./noir-tokens";

/* ------------------------------------------------------------------ */
/*  Types — exact productPage template contract                        */
/*  (pages/featured/products/@productId/+Page.tsx, route /shop/@id)    */
/* ------------------------------------------------------------------ */

/**
 * A related product, plus the extra columns `product.search` already
 * returns. They are optional, so a caller that supplies plain
 * `FeaturedProduct`s (the admin preview does) still typechecks — the
 * shop card simply omits the rows it has no data for.
 */
export type NoirRelatedProduct = FeaturedProduct & {
  description?: string;
  rating?: number;
  reviewCount?: number;
  sortOrder?: number | null;
};

export interface ProductPageNoirProps {
  product?: ProductPageProduct;
  relatedProducts?: NoirRelatedProduct[];
  /**
   * The catalogue in display order, which the route already passes. Used
   * only as the fallback source for the title's display number when the
   * merchant has not set a `sortOrder` — see `scentNumber`.
   */
  allProducts?: NoirRelatedProduct[];
  isLoading?: boolean;
  showWishlist?: boolean;
  /**
   * `quantity` is optional and defaults to 1 at the call site, so the
   * handler the route passes stays byte-compatible with every other
   * product template — none of which send a third argument.
   */
  onAddToCart?: (
    product: ProductPageProduct,
    selectedOptions?: Record<string, string>,
    quantity?: number,
  ) => void;
  onAddToWishlist?: (product: ProductPageProduct) => void;
  onImageClick?: (imageUrl: string, index: number) => void;
  className?: string;
  /** Admin preview mode — disables the <html> chrome side effect */
  previewMode?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function resolveImageUrl(url?: string | null): string {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("/")) return url;
  return `/uploads/${url}`;
}

/* ------------------------------------------------------------------ */
/*  Hero stage — the image treatment                                   */
/* ------------------------------------------------------------------ */

/**
 * HERO STAGE, not an image box.
 *
 * The old hero put the shot in an `aspect-square` panel with its own
 * fill, hairline border and rounded corners. That rectangle is exactly
 * what made the product read as a picture pasted into a card, and half
 * of a `max-w-7xl` column capped it at ~30% of the viewport where the
 * reference runs ~43%.
 *
 * The panel is a 16/10 band inside a full-bleed `max-w-[1600px]` row,
 * with no surface of its own.
 *
 * FIT. `object-cover` was the first attempt and it is the wrong fit here.
 * The catalogue's shots are 666 x 375 (aspect 1.776) and the panel is
 * narrower than that, so cover matched the panel's HEIGHT and threw away
 * ~200px of the shot's left and right ground. The tin then filled 72% of
 * the panel against the reference's 66% and lost the clean margin around
 * the silver base — the "stretched, oversized" read.
 *
 * `object-contain` fits by WIDTH instead: nothing is cropped horizontally,
 * the base's left edge and the leaning lid stay fully in frame, and the
 * tin lands at exactly 55% of the panel's width before zoom. What the fit
 * leaves over vertically is a thin letterbox of the shot's own near-black
 * ground on a near-black page — invisible, and the edge mask covers it.
 *
 * ZOOM. The tin occupies 55.0% x 49.1% of the source frame, sitting 11px
 * right and 15.5px below its centre (the same measurements
 * NoirShopProductCard works from). 55% x 1.3 = 71.5% of the panel's width.
 *
 * The tin's own edges stay well clear of the clip: at 1.3 its half-width
 * reaches 37.9% of the panel from centre against the panel's 50%, and its
 * half-height 29% against 50%. Only the shot's empty ground is cut, which
 * is the point — the mask's solid window (7% -> 93% across, 9% -> 91%
 * down) still contains the product with room to spare.
 */
const NOIR_PDP_IMAGE_ZOOM = "1.3";

/**
 * Cancels the source's own off-centre bias so the enlarged tin sits on
 * the panel's centre. Percentages of the element's border box, since
 * `translate` is applied after `scale` and is therefore not itself
 * scaled. Under `contain` the rendered box matches the panel's width, so
 * the only correction is the zoom itself:
 *
 *     x = -(11/666) x 1.3   = -2%
 *     y = -(15.5/375) x 1.3 = -5.4%, damped to -4.5% because `contain`
 *         letterboxes the shot and the tin already sits high in it
 */
const NOIR_PDP_IMAGE_OFFSET = "-2% -4.5%";

/**
 * Dissolves the artwork's own rectangle into the page on BOTH axes — the
 * hero stage has no card edge to hide behind, unlike the shop card where
 * a vertical fade was enough. The solid window runs 9% -> 91% vertically
 * and 7% -> 93% horizontally, which comfortably contains the tin, so the
 * product is never touched; outside it the shot's near-black ground fades
 * out and the page shows through.
 *
 * `mask-composite: intersect` is what makes the two layers a window
 * rather than a union. Where it is unsupported the layers simply add, and
 * the stage degrades to an unmasked shot on a near-black ground — visibly
 * squarer, never broken.
 */
const NOIR_PDP_STAGE_MASK = [
  "linear-gradient(to bottom, transparent 0%, #000 9%, #000 91%, transparent 100%)",
  "linear-gradient(to right, transparent 0%, #000 7%, #000 93%, transparent 100%)",
].join(", ");

/** Soft pool of light under the product, so the stage reads as LIT. */
const NOIR_PDP_STAGE_LIGHT =
  "radial-gradient(ellipse 68% 60% at 50% 47%, rgba(255,244,236,0.085) 0%, transparent 72%)";

/** Wide, very faint red ambience across the hero band. */
const NOIR_PDP_HERO_GLOW =
  "radial-gradient(ellipse 90% 70% at 34% 46%, rgba(232,17,45,0.07) 0%, transparent 70%)";

/**
 * Notes line. Merchants type scent notes into the product description and
 * the reference renders them bullet-separated. A comma list is converted
 * here so the separator stays a presentation detail — copy that already
 * uses bullets (which the Neckline catalogue does) passes through
 * untouched. Mirrors NoirShopProductCard.
 */
function formatNotes(notes: string): string {
  const parts = notes
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts.join(" • ") : notes;
}

/** `ProductFeature.icon` is a closed set; map it onto real glyphs. */
const NOIR_FEATURE_ICONS: Record<string, LucideIcon> = {
  package: Package,
  zap: Zap,
  award: Award,
  shield: Shield,
};

/**
 * Feature bullets are part of the reference's hero layout, so the column
 * keeps its shape when a product carries none.
 *
 * This is UI chrome, NOT product data: it describes the format every Noir
 * demo product is (a solid perfume in a tin) and makes no claim about any
 * particular scent — the same standing as the trust row below it. The
 * moment the CMS supplies real `features`, they replace this entirely.
 */
function noirFallbackFeatures(
  isAr: boolean,
): { Icon: LucideIcon; title: string }[] {
  return [
    {
      Icon: Package,
      title: isAr ? "عطر صلب جاهز للسفر" : "Travel-ready solid perfume",
    },
    { Icon: Sparkles, title: isAr ? "ثبات طويل" : "Long-lasting scent" },
    {
      Icon: Droplet,
      title: isAr ? "خالٍ من الكحول، بدون انسكاب" : "Alcohol-free, no spill",
    },
  ];
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className='flex items-center gap-0.5'>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "w-3.5 h-3.5",
            i <= Math.round(rating)
              ? "fill-[#E8112D] text-[#E8112D]"
              : "text-white/15",
          )}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

function GallerySkeleton() {
  return (
    <div className='flex flex-col-reverse gap-4 md:flex-row md:gap-5'>
      <div className='flex shrink-0 gap-3 md:flex-col'>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className='size-16 shrink-0 animate-pulse rounded-[3px] bg-white/5 md:size-20'
          />
        ))}
      </div>
      <div className='aspect-16/10 w-full flex-1 animate-pulse rounded-[3px] bg-white/5' />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Reviews                                                           */
/* ------------------------------------------------------------------ */

/** One APPROVED review, as returned by `product.getReviews`. */
interface NoirReviewRow {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  mediaUrl?: string | null;
  createdAt: string | Date;
}

/** Extensions rendered with <video> rather than <img> — mirrors the wall. */
const NOIR_REVIEW_VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i;

/**
 * Backend limits, mirrored client-side.
 *
 * `createReviewSchema` rejects anything outside these, and a tRPC input
 * failure throws rather than returning `{ success: false }` — so the form
 * blocks the submit instead of surfacing a raw zod error to a customer.
 */
const REVIEW_NAME_MIN = 2;
const REVIEW_NAME_MAX = 50;
const REVIEW_COMMENT_MIN = 3;
const REVIEW_COMMENT_MAX = 500;

/* ── Review media (optional) ─────────────────────────────────────────
 * Mirrors backend/products/review-media/api.ts. These checks are a
 * courtesy so the customer hears about a bad file before spending an
 * upload on it; the server re-validates everything, including the actual
 * bytes, and is the only thing that decides what gets stored.
 * ------------------------------------------------------------------ */
const REVIEW_MEDIA_ENDPOINT = "/api/review-media";
const REVIEW_MEDIA_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const REVIEW_MEDIA_VIDEO_TYPES = ["video/mp4", "video/webm"];
const REVIEW_MEDIA_ACCEPT = [
  ...REVIEW_MEDIA_IMAGE_TYPES,
  ...REVIEW_MEDIA_VIDEO_TYPES,
].join(",");
const REVIEW_MEDIA_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const REVIEW_MEDIA_VIDEO_MAX_BYTES = 25 * 1024 * 1024;

/** Upload one file and return its stored URL, or throw with a message. */
async function uploadReviewMedia(file: File): Promise<string> {
  const body = new FormData();
  // The server ignores this name and derives its own from the MIME type.
  body.append("file", file);

  const res = await fetch(REVIEW_MEDIA_ENDPOINT, { method: "POST", body });
  const payload = (await res.json().catch(() => null)) as {
    success?: boolean;
    mediaUrl?: string;
    error?: string;
  } | null;

  if (!res.ok || !payload?.success || !payload.mediaUrl) {
    throw new Error(payload?.error || "Upload failed.");
  }
  return payload.mediaUrl;
}

/**
 * Best-effort removal of an upload whose review never got created.
 *
 * Failure here is not surfaced: the review already failed, and a second
 * error message about a temporary file would only add noise. The route
 * refuses to touch anything a review references, so this cannot orphan a
 * successful review's media.
 */
async function cleanupReviewMedia(mediaUrl: string): Promise<void> {
  const filename = mediaUrl.split("/").pop();
  if (!filename) return;
  try {
    await fetch(`${REVIEW_MEDIA_ENDPOINT}/${encodeURIComponent(filename)}`, {
      method: "DELETE",
    });
  } catch {
    // Orphan is swept up by the operator; see the report.
  }
}

/** Interactive 1-5 star picker for the review form. */
function NoirStarInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(0);
  const active = hover || value;

  return (
    <div className='flex items-center gap-1' onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type='button'
          disabled={disabled}
          onClick={() => onChange(i)}
          onMouseEnter={() => setHover(i)}
          onFocus={() => setHover(i)}
          onBlur={() => setHover(0)}
          aria-label={`${i} / 5`}
          aria-pressed={value === i}
          className='p-0.5 transition-transform duration-200 hover:scale-110 disabled:cursor-not-allowed'>
          <Star
            className={cn(
              "w-6 h-6",
              i <= active
                ? "fill-[#E8112D] text-[#E8112D]"
                : "fill-transparent text-white/25",
            )}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}

/** Media carried by an approved review. Display only — see the note below. */
function NoirReviewMedia({ url, name }: { url: string; name: string }) {
  const resolved = resolveImageUrl(url);
  const isVideo = NOIR_REVIEW_VIDEO_EXTENSIONS.test(resolved);

  return (
    <div className='mt-3 w-28 h-28 overflow-hidden rounded-md border border-white/10 bg-black'>
      {isVideo ? (
        <video
          src={resolved}
          muted
          playsInline
          controls
          preload='metadata'
          className='w-full h-full object-cover'
          aria-label={`Video review by ${name}`}
        />
      ) : (
        <img
          src={resolved}
          alt={`Review by ${name}`}
          loading='lazy'
          className='w-full h-full object-cover'
        />
      )}
    </div>
  );
}

/**
 * NoirProductReviews — approved reviews for one product, plus the customer
 * submission form.
 *
 * ── Moderation ──────────────────────────────────────────────────────────
 * The list comes from `product.getReviews`, which filters on
 * `status = "approved"` SERVER-SIDE — a pending or rejected review cannot
 * reach this component. A new submission is therefore invisible here until
 * an admin approves it, and the confirmation says exactly that rather than
 * implying the review is live. The list is deliberately NOT refetched after
 * a submit: there is nothing new to show, and a silent no-op refresh reads
 * as the review having been dropped.
 *
 * ── Media ───────────────────────────────────────────────────────────────
 * An approved review that carries a `mediaUrl` renders it. There is NO
 * upload field on this form: public customer upload is deliberately out of
 * scope for this phase, so media reaches a review only via a seed or an
 * admin.
 *
 * Lives in its own component so its hooks sit below the parent's
 * loading/not-found early returns.
 */
function NoirProductReviews({
  productId,
  previewMode = false,
}: {
  productId: string;
  previewMode?: boolean;
}) {
  const { locale } = useMinimalI18n();
  const isAr = locale === "ar";
  const track = isAr ? "" : "tracking-[0.18em]";

  const [reviews, setReviews] = useState<NoirReviewRow[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [isLoadingReviews, setIsLoadingReviews] = useState(!previewMode);

  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formRating, setFormRating] = useState(0);
  const [formComment, setFormComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  /** Sticky inline confirmation — a toast alone is too easy to miss. */
  const [awaitingApproval, setAwaitingApproval] = useState(false);

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  // Object URLs are process-wide until revoked; a customer swapping files a
  // few times would otherwise leak every one of them.
  useEffect(() => {
    if (!mediaPreview) return;
    return () => URL.revokeObjectURL(mediaPreview);
  }, [mediaPreview]);

  useEffect(() => {
    // The admin template preview renders against mock data whose id is not a
    // uuid; querying would only produce a rejected promise.
    if (previewMode) return;
    let cancelled = false;
    setIsLoadingReviews(true);
    trpc.product.getReviews
      .query({ productId })
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.result) {
          setReviews(res.result.reviews as NoirReviewRow[]);
          setAverageRating(res.result.averageRating);
          setTotalReviews(res.result.totalReviews);
        }
      })
      .catch(() => {
        // An empty list is the correct degraded state — never a hard error.
      })
      .finally(() => {
        if (!cancelled) setIsLoadingReviews(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId, previewMode]);

  const isVideoFile = mediaFile
    ? REVIEW_MEDIA_VIDEO_TYPES.includes(mediaFile.type)
    : false;

  const clearMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setMediaError(null);
    // Without this, re-picking the same file fires no change event.
    if (mediaInputRef.current) mediaInputRef.current.value = "";
  };

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = REVIEW_MEDIA_IMAGE_TYPES.includes(file.type);
    const isVideo = REVIEW_MEDIA_VIDEO_TYPES.includes(file.type);

    if (!isImage && !isVideo) {
      clearMedia();
      setMediaError(
        isAr
          ? "نوع الملف غير مدعوم. المسموح: JPG أو PNG أو WebP أو MP4 أو WebM."
          : "Unsupported file type. Allowed: JPG, PNG, WebP, MP4, WebM.",
      );
      return;
    }

    const cap = isVideo
      ? REVIEW_MEDIA_VIDEO_MAX_BYTES
      : REVIEW_MEDIA_IMAGE_MAX_BYTES;
    if (file.size > cap) {
      clearMedia();
      const mb = Math.floor(cap / (1024 * 1024));
      setMediaError(
        isAr
          ? `الملف كبير جداً (الحد ${mb} ميجابايت).`
          : `File is too large (max ${mb}MB).`,
      );
      return;
    }

    setMediaError(null);
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const trimmedName = formName.trim();
  const trimmedComment = formComment.trim();
  const canSubmit =
    !submitting &&
    !uploading &&
    !previewMode &&
    trimmedName.length >= REVIEW_NAME_MIN &&
    trimmedName.length <= REVIEW_NAME_MAX &&
    formRating >= 1 &&
    formRating <= 5 &&
    trimmedComment.length >= REVIEW_COMMENT_MIN &&
    trimmedComment.length <= REVIEW_COMMENT_MAX;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      toast.error(
        isAr
          ? "يرجى إدخال الاسم والتقييم والتعليق."
          : "Please add your name, a rating and a comment.",
      );
      return;
    }

    setSubmitting(true);

    // Media is uploaded only now — picking a file does nothing over the
    // wire, so a customer who changes their mind never costs an upload.
    let uploadedUrl: string | null = null;
    if (mediaFile) {
      setUploading(true);
      try {
        uploadedUrl = await uploadReviewMedia(mediaFile);
        setMediaError(null);
      } catch (err) {
        const message =
          err instanceof Error && err.message
            ? err.message
            : isAr
              ? "تعذّر رفع الملف."
              : "Could not upload your file.";
        setMediaError(message);
        toast.error(message);
        setUploading(false);
        setSubmitting(false);
        return;
      }
      setUploading(false);
    }

    try {
      const res = await trpc.product.createReview.mutate({
        productId,
        userName: trimmedName,
        rating: formRating,
        comment: trimmedComment,
        ...(uploadedUrl ? { mediaUrl: uploadedUrl } : {}),
      });

      if (res.success) {
        // Submissions land as "pending" (create-review sets that explicitly),
        // so the customer is told it is queued — not that it is published.
        setAwaitingApproval(true);
        setShowForm(false);
        setFormName("");
        setFormRating(0);
        setFormComment("");
        clearMedia();
        toast.success(
          isAr
            ? "شكراً — تقييمك بانتظار الموافقة."
            : "Thanks — your review is awaiting approval.",
        );
      } else {
        // The file is already on disk but no review points at it — take it
        // back out rather than leaving an orphan behind.
        if (uploadedUrl) await cleanupReviewMedia(uploadedUrl);
        toast.error(
          isAr ? "تعذّر إرسال التقييم." : "Could not submit your review.",
        );
      }
    } catch {
      if (uploadedUrl) await cleanupReviewMedia(uploadedUrl);
      toast.error(
        isAr ? "تعذّر إرسال التقييم." : "Could not submit your review.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatReviewDate = (value: string | Date) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString(isAr ? "ar" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <section
      id='product-reviews-section'
      data-noir-section='product-reviews'
      className='border-t border-white/10'>
      <div className={cn(NOIR_CONTAINER, NOIR_SECTION_Y)}>
        {/* ── Header ── */}
        <div className='flex flex-wrap items-end justify-between gap-4'>
          <div className='space-y-2'>
            <h2
              className={cn(
                "text-2xl md:text-3xl uppercase font-bold text-white leading-none",
                isAr ? "" : "tracking-[0.02em]",
                NOIR_DISPLAY_FONT_CLASSES,
              )}>
              {isAr ? "التقييمات" : "Reviews"}
            </h2>
            {totalReviews > 0 && (
              <div className='flex items-center gap-2'>
                <Stars rating={averageRating} />
                <span className='text-sm font-medium text-white'>
                  {averageRating.toFixed(1)}
                </span>
                <span className={cn("text-xs", NOIR_TEXT_MUTED_CLASSES)}>
                  ({totalReviews})
                </span>
              </div>
            )}
          </div>

          {!showForm && (
            <button
              type='button'
              onClick={() => {
                setAwaitingApproval(false);
                setShowForm(true);
              }}
              className={cn(
                "inline-flex items-center gap-2 px-7 py-3 rounded-md",
                "border border-white/20 text-xs uppercase font-medium text-white/80",
                "hover:border-white/50 hover:text-white transition-colors duration-300",
                track,
                NOIR_DISPLAY_FONT_CLASSES,
              )}>
              <PenLine className='w-3.5 h-3.5' strokeWidth={1.5} />
              {isAr ? "اكتب تقييماً" : "Write a review"}
            </button>
          )}
        </div>

        {/* ── Awaiting-approval notice ── */}
        {awaitingApproval && (
          <output
            className={cn(
              "mt-6 flex items-start gap-3 rounded-md p-4",
              "border border-[#E8112D]/40 bg-[#E8112D]/10",
            )}>
            <CheckCircle2
              className='w-5 h-5 shrink-0 text-[#E8112D]'
              strokeWidth={1.5}
              aria-hidden='true'
            />
            <p className='text-sm text-white/90'>
              {isAr
                ? "شكراً — تقييمك بانتظار الموافقة."
                : "Thanks — your review is awaiting approval."}
            </p>
          </output>
        )}

        {/* ── Form ── */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className={cn("mt-8 space-y-6 p-6 md:p-8", NOIR_CARD_CLASSES)}>
            <div className='space-y-2'>
              <label
                htmlFor='noir-review-name'
                className={cn(
                  "block text-[11px] uppercase text-white/70",
                  track,
                  NOIR_MONO_FONT_CLASSES,
                )}>
                {isAr ? "الاسم" : "Name"}
              </label>
              <input
                id='noir-review-name'
                type='text'
                value={formName}
                maxLength={REVIEW_NAME_MAX}
                disabled={submitting}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={isAr ? "اسمك" : "Your name"}
                className={cn("w-full px-4 py-3 text-sm", NOIR_INPUT_CLASSES)}
              />
            </div>

            <div className='space-y-2'>
              <span
                className={cn(
                  "block text-[11px] uppercase text-white/70",
                  track,
                  NOIR_MONO_FONT_CLASSES,
                )}>
                {isAr ? "التقييم" : "Rating"}
              </span>
              <NoirStarInput
                value={formRating}
                onChange={setFormRating}
                disabled={submitting}
              />
            </div>

            <div className='space-y-2'>
              <label
                htmlFor='noir-review-comment'
                className={cn(
                  "block text-[11px] uppercase text-white/70",
                  track,
                  NOIR_MONO_FONT_CLASSES,
                )}>
                {isAr ? "تعليقك" : "Your review"}
              </label>
              <textarea
                id='noir-review-comment'
                rows={4}
                value={formComment}
                maxLength={REVIEW_COMMENT_MAX}
                disabled={submitting}
                onChange={(e) => setFormComment(e.target.value)}
                placeholder={
                  isAr ? "شاركنا رأيك بالمنتج" : "Tell us what you think"
                }
                className={cn(
                  "w-full resize-y px-4 py-3 text-sm",
                  NOIR_INPUT_CLASSES,
                )}
              />
              <p className={cn("text-[11px]", NOIR_TEXT_MUTED_CLASSES)}>
                {trimmedComment.length}/{REVIEW_COMMENT_MAX}
              </p>
            </div>

            {/* ── Optional photo or video ── */}
            <div className='space-y-2'>
              <span
                className={cn(
                  "block text-[11px] uppercase text-white/70",
                  track,
                  NOIR_MONO_FONT_CLASSES,
                )}>
                {isAr ? "صورة أو فيديو (اختياري)" : "Photo or video (optional)"}
              </span>

              <input
                ref={mediaInputRef}
                id='noir-review-media'
                type='file'
                accept={REVIEW_MEDIA_ACCEPT}
                disabled={submitting || uploading}
                onChange={handleMediaChange}
                className='sr-only'
              />

              {!mediaFile ? (
                <label
                  htmlFor='noir-review-media'
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-2 rounded-md px-5 py-3",
                    "border border-dashed border-white/20 text-xs uppercase text-white/70",
                    "hover:border-white/40 hover:text-white transition-colors duration-300",
                    (submitting || uploading) &&
                      "pointer-events-none opacity-40",
                    track,
                    NOIR_DISPLAY_FONT_CLASSES,
                  )}>
                  <ImagePlus className='w-4 h-4' strokeWidth={1.5} />
                  {isAr ? "إضافة ملف" : "Add a file"}
                </label>
              ) : (
                <div className='flex items-start gap-3'>
                  <div className='h-24 w-24 shrink-0 overflow-hidden rounded-md border border-white/10 bg-black'>
                    {isVideoFile ? (
                      <video
                        src={mediaPreview ?? undefined}
                        muted
                        playsInline
                        preload='metadata'
                        className='h-full w-full object-cover'
                      />
                    ) : (
                      <img
                        src={mediaPreview ?? undefined}
                        alt={isAr ? "معاينة" : "Selected media preview"}
                        className='h-full w-full object-cover'
                      />
                    )}
                  </div>

                  <div className='min-w-0 space-y-1'>
                    <p className='truncate text-xs text-white/80'>
                      {mediaFile.name}
                    </p>
                    <p className={cn("text-[11px]", NOIR_TEXT_MUTED_CLASSES)}>
                      {(mediaFile.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                    <button
                      type='button'
                      onClick={clearMedia}
                      disabled={submitting || uploading}
                      className={cn(
                        "inline-flex items-center gap-1 text-[11px] uppercase",
                        "text-white/60 hover:text-[#E8112D] transition-colors duration-200",
                        "disabled:opacity-40 disabled:cursor-not-allowed",
                        track,
                      )}>
                      <X className='w-3 h-3' strokeWidth={2} />
                      {isAr ? "إزالة" : "Remove"}
                    </button>
                  </div>
                </div>
              )}

              {mediaError && (
                <p className='text-[11px] leading-relaxed text-[#E8112D]'>
                  {mediaError}
                </p>
              )}

              <p className={cn("text-[11px]", NOIR_TEXT_MUTED_CLASSES)}>
                {isAr
                  ? "JPG أو PNG أو WebP حتى ٥ ميجابايت، أو MP4 أو WebM حتى ٢٥ ميجابايت."
                  : "JPG, PNG or WebP up to 5MB, or MP4 / WebM up to 25MB."}
              </p>
            </div>

            {/* Sets expectations BEFORE the submit, not only after it. */}
            <p
              className={cn(
                "text-[11px] leading-relaxed",
                NOIR_TEXT_MUTED_CLASSES,
              )}>
              {isAr
                ? "تتم مراجعة جميع التقييمات قبل نشرها."
                : "Every review is checked before it is published."}
            </p>

            <div className='flex flex-col gap-3 sm:flex-row'>
              <button
                type='submit'
                disabled={!canSubmit}
                className={cn(
                  "flex-1 inline-flex items-center justify-center gap-2 rounded-md px-8 py-3.5",
                  "text-xs uppercase font-medium text-white transition-all duration-300",
                  "disabled:opacity-40 disabled:cursor-not-allowed",
                  track,
                  NOIR_DISPLAY_FONT_CLASSES,
                  NOIR_ACCENT_BG_CLASSES,
                )}>
                {(submitting || uploading) && (
                  <Loader2
                    className='w-4 h-4 animate-spin'
                    strokeWidth={1.5}
                    aria-hidden='true'
                  />
                )}
                {uploading
                  ? isAr
                    ? "جارٍ الرفع…"
                    : "Uploading…"
                  : isAr
                    ? "إرسال التقييم"
                    : "Submit review"}
              </button>
              <button
                type='button'
                disabled={submitting || uploading}
                onClick={() => setShowForm(false)}
                className={cn(
                  "rounded-md border border-white/20 px-8 py-3.5",
                  "text-xs uppercase font-medium text-white/70",
                  "hover:border-white/40 hover:text-white transition-colors duration-300",
                  "disabled:opacity-40 disabled:cursor-not-allowed",
                  track,
                  NOIR_DISPLAY_FONT_CLASSES,
                )}>
                {isAr ? "إلغاء" : "Cancel"}
              </button>
            </div>
          </form>
        )}

        {/* ── Approved reviews ── */}
        <div className='mt-10'>
          {isLoadingReviews ? (
            <div className='grid gap-4 sm:grid-cols-2'>
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className='h-32 animate-pulse rounded-lg bg-white/5'
                />
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <p className={cn("text-sm", NOIR_TEXT_SECONDARY_CLASSES)}>
              {isAr
                ? "لا توجد تقييمات منشورة بعد."
                : "No published reviews yet."}
            </p>
          ) : (
            <ul className='grid gap-4 sm:grid-cols-2'>
              {reviews.map((review) => (
                <li
                  key={review.id}
                  className={cn("p-5 md:p-6", NOIR_CARD_CLASSES)}>
                  <div className='flex items-start justify-between gap-4'>
                    <div className='space-y-1.5'>
                      <p className='text-sm font-semibold text-white'>
                        {review.userName}
                      </p>
                      <Stars rating={review.rating} />
                    </div>
                    <time
                      className={cn(
                        "text-[11px] whitespace-nowrap",
                        NOIR_MONO_FONT_CLASSES,
                        NOIR_TEXT_MUTED_CLASSES,
                      )}>
                      {formatReviewDate(review.createdAt)}
                    </time>
                  </div>

                  <p
                    className={cn(
                      "mt-3 text-sm leading-relaxed",
                      NOIR_TEXT_SECONDARY_CLASSES,
                    )}>
                    {review.comment}
                  </p>

                  {review.mediaUrl && (
                    <NoirReviewMedia
                      url={review.mediaUrl}
                      name={review.userName}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

/**
 * ProductPageNoir — Demo 5 "Noir" product detail page.
 *
 * Hero → You Might Also Like → specifications → reviews.
 *
 * The hero is a full-bleed stage: a far-left thumb rail (vertical on
 * desktop, a strip below the shot on mobile, red active border) beside an
 * unboxed product image, and an info column on the right — breadcrumb,
 * condensed uppercase "SCENT No. XX – NAME" title, price, real stock
 * state, the approved-review aggregate, the
 * merchant's notes line, NoirVariantSelector, qty stepper, red ADD TO
 * CART, and a generic trust row (no invented claims). Related products
 * use the Shop-phase NoirShopProductCard.
 */
export function ProductPageNoir({
  product,
  relatedProducts = [],
  allProducts = [],
  isLoading = false,
  onAddToCart,
  onImageClick,
  className = "",
  previewMode = false,
}: ProductPageNoirProps) {
  const { t, locale } = useMinimalI18n();
  const isAr = locale === "ar";
  const track = isAr ? "" : "tracking-[0.18em]";

  const [selectedImage, setSelectedImage] = useState(0);
  const [imageError, setImageError] = useState<Record<number, boolean>>({});
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState<
    Record<string, string>
  >({});

  // Gallery images: images[] first, imageUrl fallback
  const images = useMemo(() => {
    if (product?.images && product.images.length > 0) return product.images;
    if (product?.imageUrl) return [{ url: product.imageUrl, isPrimary: true }];
    return [];
  }, [product]);

  if (isLoading && !product) {
    return (
      <NoirChrome previewMode={previewMode}>
        <div className='mx-auto grid max-w-[1600px] gap-8 px-4 py-10 md:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] lg:gap-10 lg:px-12 xl:grid-cols-[minmax(0,1fr)_minmax(400px,500px)]'>
          <GallerySkeleton />
          <div className='space-y-4'>
            <div className='h-3 w-1/3 bg-white/5 rounded animate-pulse' />
            <div className='h-8 w-3/4 bg-white/5 rounded animate-pulse' />
            <div className='h-5 w-1/4 bg-white/5 rounded animate-pulse' />
            <div className='h-24 w-full bg-white/5 rounded animate-pulse' />
            <div className='h-12 w-full bg-white/5 rounded animate-pulse' />
          </div>
        </div>
      </NoirChrome>
    );
  }

  if (!product) {
    return (
      <NoirChrome previewMode={previewMode}>
        <div className='mx-auto max-w-7xl px-4 md:px-8 py-24 text-center space-y-4'>
          <p className={cn("text-sm", NOIR_TEXT_SECONDARY_CLASSES)}>
            {isAr ? "المنتج غير موجود" : "Product not found"}
          </p>
          <Link
            href='/shop'
            className={cn(
              "inline-flex items-center gap-2 px-8 py-3 border border-white/20 rounded-md",
              "text-xs uppercase text-white/80 hover:border-white/50 hover:text-white transition-colors duration-300",
              track,
              NOIR_DISPLAY_FONT_CLASSES,
            )}>
            {t("view_all")}
          </Link>
        </div>
      </NoirChrome>
    );
  }

  const hasDiscount =
    product.discountPrice !== undefined &&
    product.discountPrice !== null &&
    product.discountPrice !== "" &&
    Number(product.discountPrice) < product.price;
  const displayPrice = hasDiscount
    ? Number(product.discountPrice)
    : product.price;

  const related = relatedProducts
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  const allVariantsSelected =
    !product.variants?.length ||
    product.variants.every((v) => selectedVariants[v.name]);

  const canAddToCart = product.available && allVariantsSelected;

  /**
   * The stepper's value is passed straight through as the third argument.
   * The route clamps it and hands it to `addItem` as the quantity, so one
   * click adds one cart line of N units and fires ONE add-to-cart event —
   * rather than the old behaviour, where the stepper moved but a single
   * unit was added regardless.
   */
  const handleAddToCart = () => {
    if (!canAddToCart) return;
    onAddToCart?.(product, selectedVariants, quantity);
  };

  /**
   * Related-row add-to-cart. Deliberately routed through the SAME
   * `onAddToCart` prop rather than reaching into the cart directly, so the
   * row inherits the route's tracking and stays inert (no thrown
   * `useCart`) inside the admin template preview.
   */
  const handleRelatedAddToCart = (card: NoirProduct) => {
    const match = related.find((p) => p.id === card.id);
    if (!match || match.available === false) return;
    // `search` reports an unset display order as null; the product
    // contract spells the same thing `undefined`.
    onAddToCart?.({ ...match, sortOrder: match.sortOrder ?? undefined }, {}, 1);
  };

  const handleThumbClick = (index: number) => {
    setSelectedImage(index);
    onImageClick?.(resolveImageUrl(images[index]?.url), index);
  };

  const mainImageUrl = resolveImageUrl(images[selectedImage]?.url);
  const mainImageBroken = images.length === 0 || imageError[selectedImage];

  const trustItems = [
    {
      Icon: Truck,
      title: isAr ? "شحن سريع" : "Fast shipping",
      subtext: isAr ? "توصيل إلى باب منزلك" : "Delivered to your door",
    },
    {
      Icon: RefreshCw,
      title: isAr ? "إرجاع سهل" : "Easy returns",
      subtext: isAr ? "عملية إرجاع بسيطة" : "Simple return process",
    },
    {
      Icon: ShieldCheck,
      title: isAr ? "دفع آمن" : "Secure checkout",
      subtext: isAr ? "معاملات محمية" : "Protected transactions",
    },
  ];

  const longText = product.longDescription || null;
  const hasSpecs =
    Array.isArray(product.specifications) && product.specifications.length > 0;

  /* ── Hero copy, all of it derived from the record ── */

  /*
    DISPLAY NUMBER — three sources, in order of how much the merchant
    meant it, and nothing per-product is ever hardcoded:

      1. `sortOrder`, the merchant's own display order, when it is set.
      2. Otherwise the product's 1-based position in the catalogue the
         route already loaded, which is ordered by sortOrder then newest —
         a real fact about where this product sits in the collection.
      3. Otherwise 01, when the catalogue is unavailable (the admin
         preview) or the product is absent from it (out of stock, since
         `search` is queried with `includeOutOfStock: false`).
  */
  const catalogueIndex = allProducts.findIndex((p) => p.id === product.id);
  const scentNumber =
    typeof product.sortOrder === "number" && product.sortOrder > 0
      ? product.sortOrder
      : catalogueIndex >= 0
        ? catalogueIndex + 1
        : 1;

  const scentLabel = String(scentNumber).padStart(2, "0");

  const notesLine = product.description ? formatNotes(product.description) : "";

  /*
    RATING ROW PRESENCE vs RATING VALUE — the same two questions the shop
    card answers. A numeric `reviewCount` means review data was loaded,
    not that the product has reviews.
  */
  const hasReviewData = typeof product.reviewCount === "number";
  const reviewCount = product.reviewCount ?? 0;
  const ratingValue = typeof product.rating === "number" ? product.rating : 0;
  // `product.reviews` is the plural form. Arabic uses one word either way;
  // English reads "(1 reviews)" without this.
  const reviewLabel =
    !isAr && reviewCount === 1 ? "review" : t("product.reviews");

  const featureItems = product.features?.length
    ? product.features.map((f) => ({
        Icon: NOIR_FEATURE_ICONS[f.icon] ?? Package,
        title: f.title,
      }))
    : noirFallbackFeatures(isAr);

  /** Stepper ceiling — never offers more units than the record has. */
  const maxQuantity = Math.max(1, product.stock || 0);

  return (
    <NoirChrome previewMode={previewMode}>
      {/* ── HERO ─────────────────────────────────────────────────────
          Full-bleed dark stage, not a boxed card. The shot carries no
          border, no radius and no panel fill of its own: a stage light
          sits behind it and a two-axis mask dissolves the artwork's own
          rectangle into the page — the same treatment the approved Noir
          shop card uses, at hero scale. ── */}
      <section className={cn("relative overflow-hidden", className)}>
        <div
          className='pointer-events-none absolute inset-0 z-0'
          style={{ background: NOIR_PDP_HERO_GLOW }}
          aria-hidden='true'
        />

        <div className='relative z-10 mx-auto max-w-[1600px] px-4 py-6 md:px-8 md:py-9 lg:px-12 lg:py-10'>
          <div className='grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(400px,500px)] xl:gap-14'>
            {/* ── Gallery: far-left thumb rail + huge stage ── */}
            <div className='flex flex-col-reverse gap-4 md:flex-row md:gap-5'>
              {/*
                RAIL PRESENCE.

                The rail renders whenever the product carries ANY image, a
                single one included, so the hero holds the reference's
                rail + stage proportions on a one-image catalogue instead
                of collapsing to a bare picture. With one image that lone
                thumb is simply the active one; with several, clicking
                swaps the stage. With none there is nothing to rail, and
                the stage falls back to the Noir placeholder.
              */}
              {images.length > 0 && (
                <div className='flex shrink-0 gap-3 overflow-x-auto scrollbar-hide md:flex-col md:overflow-visible'>
                  {images.map((img, index) => (
                    <button
                      key={img.url + index}
                      type='button'
                      onClick={() => handleThumbClick(index)}
                      aria-label={`${product.name} ${index + 1}`}
                      aria-current={index === selectedImage}
                      className={cn(
                        "size-16 shrink-0 overflow-hidden rounded-[3px] border bg-[#0d0d0d] md:size-20",
                        "transition-colors duration-200",
                        index === selectedImage
                          ? "border-[#E8112D]"
                          : "border-white/12 hover:border-white/30",
                      )}>
                      {imageError[index] ? (
                        <NoirImagePlaceholder />
                      ) : (
                        <img
                          src={resolveImageUrl(img.url)}
                          alt=''
                          loading='lazy'
                          className='h-full w-full object-cover'
                          onError={() =>
                            setImageError((prev) => ({
                              ...prev,
                              [index]: true,
                            }))
                          }
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Stage — no border, no radius, no fill. See the constants. */}
              <div className='relative min-w-0 flex-1'>
                <div className='relative aspect-16/10 w-full overflow-hidden'>
                  <div
                    className='pointer-events-none absolute inset-0'
                    style={{ background: NOIR_PDP_STAGE_LIGHT }}
                    aria-hidden='true'
                  />
                  {mainImageBroken ? (
                    <NoirImagePlaceholder />
                  ) : (
                    <img
                      src={mainImageUrl}
                      alt={product.name}
                      fetchPriority='high'
                      className='relative h-full w-full scale-(--noir-pdp-zoom) object-contain'
                      style={
                        {
                          "--noir-pdp-zoom": NOIR_PDP_IMAGE_ZOOM,
                          translate: NOIR_PDP_IMAGE_OFFSET,
                          maskImage: NOIR_PDP_STAGE_MASK,
                          WebkitMaskImage: NOIR_PDP_STAGE_MASK,
                          maskComposite: "intersect",
                          WebkitMaskComposite: "source-in",
                        } as CSSProperties
                      }
                      onError={() =>
                        setImageError((prev) => ({
                          ...prev,
                          [selectedImage]: true,
                        }))
                      }
                    />
                  )}
                </div>
              </div>
            </div>

            {/* ── Info column ── */}
            <div className='flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start'>
              {/* Breadcrumb */}
              <nav
                className={cn(
                  "flex items-center gap-2 text-[11px] uppercase",
                  isAr ? "" : "tracking-[0.16em]",
                  NOIR_MONO_FONT_CLASSES,
                  NOIR_TEXT_MUTED_CLASSES,
                )}
                aria-label='Breadcrumb'>
                <Link
                  href='/'
                  className='transition-colors duration-200 hover:text-white'>
                  {isAr ? "الرئيسية" : "Home"}
                </Link>
                <span aria-hidden='true'>/</span>
                <Link
                  href='/shop'
                  className='transition-colors duration-200 hover:text-white'>
                  {isAr ? "تسوق" : "Shop"}
                </Link>
                <span aria-hidden='true'>/</span>
                <span className='max-w-40 truncate text-white/70'>
                  {product.name}
                </span>
              </nav>

              {/*
                TITLE — "SCENT No. 01 – ORIGINAL", as the reference reads
                it. See `scentNumber` for where the number comes from.

                The h1 carries NO `uppercase`. The reference sets "No." in
                mixed case, and a blanket transform on the heading would
                print "SCENT NO." — so the label is written literally and
                the transform is applied only to the product name, which is
                the one part that comes from data and may arrive in any
                case. Nothing here depends on a child overriding an
                inherited `text-transform`.
              */}
              <h1
                className={cn(
                  "text-[clamp(1.9rem,2.9vw,2.85rem)] font-bold leading-[1.05] text-white",
                  isAr ? "" : "tracking-[0.02em]",
                  NOIR_DISPLAY_FONT_CLASSES,
                )}>
                {isAr ? "عطر" : "SCENT"} No. {scentLabel}
                {" – "}
                <span className='uppercase'>{product.name}</span>
              </h1>

              {/* Price + real stock state */}
              <div className='flex flex-wrap items-baseline gap-x-3 gap-y-2'>
                <span className='text-[32px] font-semibold leading-none text-white'>
                  {formatNoirPrice(displayPrice)}
                </span>
                {hasDiscount && (
                  <span
                    className={cn(
                      "text-base line-through",
                      NOIR_TEXT_MUTED_CLASSES,
                    )}>
                    {formatNoirPrice(product.price)}
                  </span>
                )}
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-[10px] uppercase",
                    isAr ? "" : "tracking-[0.16em]",
                    NOIR_MONO_FONT_CLASSES,
                    product.available ? "text-white/55" : "text-[#E8112D]",
                  )}>
                  <span
                    className={cn(
                      "inline-block size-1.5 rounded-full",
                      product.available ? "bg-[#E8112D]" : "bg-white/30",
                    )}
                    aria-hidden='true'
                  />
                  {product.available ? t("in_stock") : t("out_of_stock")}
                </span>
              </div>

              {/*
                RATING ROW — approved reviews only.

                Presence is decided by whether review data was loaded at
                all, not by whether this product has reviews: a zero-review
                product shows a real empty scale and a real "(0 reviews)",
                which is a fact about the product rather than a hole in the
                layout. The averaged number is printed only when there is
                something to average.
              */}
              {hasReviewData && (
                <div className='flex items-center gap-2'>
                  <Stars rating={ratingValue} />
                  {reviewCount > 0 && (
                    <span className='text-[14px] font-medium text-white'>
                      {ratingValue.toFixed(1)}
                    </span>
                  )}
                  <span className={cn("text-[12px]", NOIR_TEXT_MUTED_CLASSES)}>
                    ({reviewCount} {reviewLabel})
                  </span>
                </div>
              )}

              {/* Scent notes — the merchant's own description line. */}
              {notesLine && (
                <p
                  className={cn(
                    "text-[13.5px] uppercase text-white/75",
                    isAr ? "" : "tracking-[0.1em]",
                    NOIR_MONO_FONT_CLASSES,
                  )}>
                  {notesLine}
                </p>
              )}

              {/* Longer copy — only when the CMS actually carries it. */}
              {longText && (
                <p
                  className={cn(
                    "max-w-prose whitespace-pre-line text-[14px] leading-relaxed",
                    NOIR_TEXT_SECONDARY_CLASSES,
                  )}>
                  {longText}
                </p>
              )}

              {/* Feature bullets — product features when the CMS has them,
                  otherwise the product-agnostic Noir fallback copy. See
                  noirFallbackFeatures. */}
              {featureItems.length > 0 && (
                <ul className='flex flex-col gap-3'>
                  {featureItems.map(({ Icon, title }) => (
                    <li key={title} className='flex items-center gap-2.5'>
                      <Icon
                        className='size-[18px] shrink-0 text-white/45'
                        strokeWidth={1.5}
                      />
                      <span
                        className={cn(
                          "text-[13.5px]",
                          NOIR_TEXT_SECONDARY_CLASSES,
                        )}>
                        {title}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Variants */}
              {product.variants && product.variants.length > 0 && (
                <NoirVariantSelector
                  variants={product.variants}
                  selectedVariants={selectedVariants}
                  onVariantChange={(name, value) =>
                    setSelectedVariants((prev) => ({ ...prev, [name]: value }))
                  }
                />
              )}

              {/* Quantity + Add to cart */}
              <div className='flex flex-col gap-3 sm:flex-row'>
                <div className='flex items-center self-start rounded-md border border-white/15'>
                  <button
                    type='button'
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    aria-label={isAr ? "تقليل الكمية" : "Decrease quantity"}
                    className='p-3.5 text-white/70 transition-colors duration-200 hover:text-white disabled:opacity-30'>
                    <Minus className='size-4' />
                  </button>
                  <span
                    className={cn(
                      "min-w-11 border-x border-white/15 px-3 py-2.5 text-center text-[15px] text-white",
                      NOIR_MONO_FONT_CLASSES,
                    )}>
                    {quantity}
                  </span>
                  <button
                    type='button'
                    onClick={() =>
                      setQuantity((q) => Math.min(maxQuantity, q + 1))
                    }
                    disabled={!product.available || quantity >= maxQuantity}
                    aria-label={isAr ? "زيادة الكمية" : "Increase quantity"}
                    className='p-3.5 text-white/70 transition-colors duration-200 hover:text-white disabled:opacity-30'>
                    <Plus className='size-4' />
                  </button>
                </div>

                <button
                  type='button'
                  onClick={handleAddToCart}
                  disabled={!canAddToCart}
                  className={cn(
                    "inline-flex flex-1 items-center justify-center gap-2 rounded-md px-8 py-4",
                    "text-[13px] font-medium uppercase text-white transition-all duration-300",
                    "disabled:cursor-not-allowed disabled:opacity-40",
                    "hover:shadow-[0_10px_40px_-12px_rgba(232,17,45,0.6)]",
                    track,
                    NOIR_DISPLAY_FONT_CLASSES,
                    NOIR_ACCENT_BG_CLASSES,
                  )}>
                  <ShoppingBag className='size-[18px]' strokeWidth={1.5} />
                  {t("add_to_cart")}
                </button>
              </div>

              {/* Secondary CTA */}
              <Link
                href='/shop'
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-md px-8 py-4",
                  "border border-white/20 text-[13px] font-medium uppercase text-white/80",
                  "transition-colors duration-300 hover:border-white/50 hover:text-white",
                  track,
                  NOIR_DISPLAY_FONT_CLASSES,
                )}>
                {isAr ? "استكشف المجموعة" : "Explore the collection"}
                <ArrowRight
                  className='size-3.5 rtl:rotate-180'
                  strokeWidth={1.5}
                />
              </Link>

              {/* Trust row — generic claims only, nothing invented. */}
              <div className='grid grid-cols-3 gap-4 border-t border-white/10 pt-6'>
                {trustItems.map(({ Icon, title, subtext }) => (
                  <div key={title} className='flex items-start gap-2'>
                    <Icon
                      className='mt-0.5 size-[18px] shrink-0 text-[#E8112D]'
                      strokeWidth={1.5}
                    />
                    <div className='min-w-0'>
                      <p
                        className={cn(
                          "text-[11px] font-semibold uppercase leading-tight text-white",
                          isAr ? "" : "tracking-[0.12em]",
                          NOIR_DISPLAY_FONT_CLASSES,
                        )}>
                        {title}
                      </p>
                      <p
                        className={cn(
                          "mt-0.5 text-[11px] leading-snug",
                          NOIR_TEXT_MUTED_CLASSES,
                        )}>
                        {subtext}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── You Might Also Like — directly under the hero, rendered with
          the Shop-phase Noir card. No `index` is passed: a "Scent No."
          taken from this row's position would be a number the product does
          not own, so the overline appears only for products whose
          `sortOrder` is really set. ── */}
      {related.length > 0 && (
        <section className='border-t border-white/10 pb-14 pt-7 md:pb-16 md:pt-9'>
          <div className='mx-auto max-w-[1600px] px-4 md:px-8 lg:px-12'>
            <div className='mb-4 flex items-end justify-between gap-4 md:mb-6'>
              <h2
                className={cn(
                  "text-sm font-semibold uppercase text-white md:text-[15px]",
                  isAr ? "" : "tracking-[0.22em]",
                  NOIR_DISPLAY_FONT_CLASSES,
                )}>
                {isAr ? "قد يعجبك أيضاً" : "You Might Also Like"}
              </h2>
              <Link
                href='/shop'
                className={cn(
                  "group/va inline-flex items-center gap-1.5 text-[11px] uppercase text-white/60",
                  "transition-colors duration-300 hover:text-[#E8112D]",
                  isAr ? "" : "tracking-[0.2em]",
                  NOIR_DISPLAY_FONT_CLASSES,
                )}>
                {t("view_all")}
                <ArrowRight
                  className='size-3 transition-transform duration-300 group-hover/va:translate-x-1 rtl:rotate-180 rtl:group-hover/va:-translate-x-1'
                  strokeWidth={1.5}
                />
              </Link>
            </div>

            {/* The row shares the hero's full-bleed gutter, so its width —
                and therefore each card and the shot inside it — tracks the
                reference instead of the narrower max-w-7xl body. */}
            <div className='grid auto-rows-fr grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4'>
              {related.map((rp) => (
                <NoirShopProductCard
                  key={rp.id}
                  product={{
                    ...rp,
                    // Scent notes come from the merchant's description,
                    // exactly as on the shop grid.
                    notes: rp.description || undefined,
                  }}
                  onAddToCart={handleRelatedAddToCart}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Specifications — only when the CMS carries them. ── */}
      {hasSpecs && (
        <section className='pb-14 md:pb-16'>
          <div className={NOIR_CONTAINER}>
            <div className={cn("p-6 md:p-8", NOIR_CARD_CLASSES)}>
              <h2
                className={cn(
                  "mb-4 text-sm font-semibold uppercase text-white",
                  track,
                  NOIR_DISPLAY_FONT_CLASSES,
                )}>
                {isAr ? "المواصفات" : "Specifications"}
              </h2>
              <dl className='divide-y divide-white/10'>
                {product.specifications?.map((spec) => (
                  <div
                    key={spec.label}
                    className='flex items-baseline justify-between gap-4 py-2.5'>
                    <dt className={cn("text-xs", NOIR_TEXT_MUTED_CLASSES)}>
                      {spec.label}
                    </dt>
                    <dd className='text-end text-xs text-white/80'>
                      {spec.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>
      )}

      {/* ── Reviews — below the related row, per the reference order. ── */}
      <NoirProductReviews productId={product.id} previewMode={previewMode} />
    </NoirChrome>
  );
}

ProductPageNoir.displayName = "ProductPageNoir";
