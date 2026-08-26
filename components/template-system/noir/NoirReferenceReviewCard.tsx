import { BadgeCheck, Star } from "lucide-react";
import { cn } from "#root/lib/utils";
import {
  NOIR_DISPLAY_FONT_CLASSES,
  NOIR_TEXT_MUTED_CLASSES,
} from "./noir-tokens";

/** One review, normalised from either a real review row or a CMS testimonial. */
export interface NoirReviewItem {
  id: string;
  quote: string;
  rating: number;
  name: string;
  /** Scent / product the review is about. */
  productLabel?: string | null;
  /** Customer photo or video. */
  mediaUrl?: string | null;
  /**
   * Forces how `mediaUrl` is rendered. Unset falls back to sniffing the
   * extension, which is all a real product review carries.
   */
  mediaType?: "image" | "video";
  /** Shows a verified tick beside the name. Off unless explicitly set. */
  verified?: boolean;
}

/** Extensions we render with <video> rather than <img>. */
const VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i;

/** Resolve a stored media reference to a servable URL. */
function resolveMediaUrl(url: string): string {
  if (url.startsWith("http") || url.startsWith("/")) return url;
  return `/uploads/${url}`;
}

/** Five stars, filled to the review's rating. White — the accent stays out. */
function NoirReviewStars({ rating }: { rating: number }) {
  return (
    <div
      className='flex items-center justify-center gap-1'
      role='img'
      aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "size-4.5",
            i <= Math.round(rating)
              ? "fill-white text-white"
              : "fill-transparent text-white/30",
          )}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

/**
 * NoirReferenceReviewCard — one card in the Noir review wall.
 *
 * Media on top with a centred play button, then a centred quote, five white
 * stars, the reviewer's name and the scent they reviewed.
 *
 * Both sources feed this identically: an approved product review supplies
 * media from its `mediaUrl` column, a CMS testimonial from its `mediaUrl`
 * field, and neither is treated as second class.
 *
 * The media block renders ONLY when the item actually carries media. Without
 * it the card becomes a clean quote card rather than a grey placeholder box
 * pretending a video exists.
 */
export function NoirReferenceReviewCard({
  item,
  className,
}: {
  item: NoirReviewItem;
  className?: string;
}) {
  const media = item.mediaUrl ? resolveMediaUrl(item.mediaUrl) : null;
  // An explicit mediaType wins over extension sniffing — CDN and signed URLs
  // frequently carry no extension to sniff.
  const isVideo = media
    ? item.mediaType
      ? item.mediaType === "video"
      : VIDEO_EXTENSIONS.test(media)
    : false;

  return (
    <article
      className={cn(
        "group/review flex flex-col overflow-hidden rounded-none",
        "border border-white/10 bg-[#0d0d0d]",
        "transition-colors duration-300 hover:border-white/20",
        className,
      )}>
      {media && (
        <div className='relative aspect-square w-full overflow-hidden bg-[#141414]'>
          {isVideo ? (
            // `preload="metadata"` paints the first frame as a poster without
            // pulling the whole file down — a review wall can hold a dozen of
            // these and must not cost a dozen video downloads on load.
            <video
              src={media}
              muted
              playsInline
              preload='metadata'
              className='h-full w-full object-cover'
              aria-label={`Video review by ${item.name}`}
            />
          ) : (
            <img
              src={media}
              alt={`Review by ${item.name}`}
              loading='lazy'
              className='h-full w-full object-cover transition-transform duration-700 group-hover/review:scale-105'
            />
          )}

          {/* Play button — a white ring with a solid white triangle. */}
          <div
            className='pointer-events-none absolute inset-0 flex items-center justify-center'
            aria-hidden='true'>
            <span
              className={cn(
                "flex size-14 items-center justify-center rounded-full",
                "shadow-[inset_0_0_0_2px_rgba(255,255,255,0.95)]",
                "bg-black/20 backdrop-blur-[2px]",
                "transition-transform duration-300 group-hover/review:scale-110",
              )}>
              {/* Nudged right by 2px: a triangle's visual centre sits left of
                  its bounding box, so a centred one looks off-centre. */}
              <svg
                viewBox='0 0 24 24'
                className='ms-0.5 size-6 fill-white'
                aria-hidden='true'>
                <path d='M8 5v14l11-7z' />
              </svg>
            </span>
          </div>
        </div>
      )}

      <div className='flex flex-1 flex-col items-center gap-4 px-5 py-6 text-center'>
        <p className='text-sm leading-relaxed text-white/85'>
          &ldquo;{item.quote}&rdquo;
        </p>

        <div className='mt-auto flex flex-col items-center gap-3'>
          <NoirReviewStars rating={item.rating} />

          <p className='flex items-center gap-1.5 text-base font-semibold text-white'>
            {item.name}
            {item.verified && (
              <BadgeCheck
                className='size-4 shrink-0 fill-[#E8112D] text-black'
                strokeWidth={1.75}
                aria-label='Verified reviewer'
              />
            )}
          </p>

          {item.productLabel && (
            <p
              className={cn(
                "text-xs uppercase tracking-[0.16em]",
                NOIR_TEXT_MUTED_CLASSES,
                NOIR_DISPLAY_FONT_CLASSES,
              )}>
              {item.productLabel}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

NoirReferenceReviewCard.displayName = "NoirReferenceReviewCard";
