import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import fs from "node:fs";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { v7 } from "uuid";
import { db } from "#root/shared/database/drizzle/db";
import { productReview } from "#root/shared/database/drizzle/schema";

/* ------------------------------------------------------------------ */
/*  Policy                                                            */
/* ------------------------------------------------------------------ */

/**
 * Customer review media — the ONLY file type policy for this route.
 *
 * The extension is derived from this table, never from the client's
 * filename. That single choice removes path traversal, double-extension
 * tricks (`clip.mp4.php`), and executable/script uploads by construction:
 * an unrecognised MIME never reaches disk at all, and a recognised one can
 * only ever be written as one of these six extensions.
 */
const ALLOWED_MEDIA = {
  "image/jpeg": { ext: "jpg", kind: "image", maxBytes: 5 * 1024 * 1024 },
  "image/png": { ext: "png", kind: "image", maxBytes: 5 * 1024 * 1024 },
  "image/webp": { ext: "webp", kind: "image", maxBytes: 5 * 1024 * 1024 },
  "video/mp4": { ext: "mp4", kind: "video", maxBytes: 25 * 1024 * 1024 },
  "video/webm": { ext: "webm", kind: "video", maxBytes: 25 * 1024 * 1024 },
} as const;

type AllowedMime = keyof typeof ALLOWED_MEDIA;

/** Largest cap in the table — the hard ceiling for any single request. */
const MAX_ANY_BYTES = 25 * 1024 * 1024;

/** Public prefix the stored `media_url` values carry. */
const REVIEW_MEDIA_URL_PREFIX = "/uploads/reviews";

/** Cleanup only ever touches a file younger than this. */
const CLEANUP_MAX_AGE_MS = 60 * 60 * 1000;

/**
 * Filenames this route is willing to act on: a uuid v7 plus one of our own
 * extensions, and nothing else. Cleanup matches against this before it
 * touches the filesystem, so a traversal sequence is rejected as a
 * malformed name rather than resolved as a path.
 */
const REVIEW_MEDIA_FILENAME =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|mp4|webm)$/;

/* ------------------------------------------------------------------ */
/*  Content sniffing                                                  */
/* ------------------------------------------------------------------ */

/**
 * Verify the bytes actually match the declared MIME type.
 *
 * `Content-Type` on a multipart part is attacker-controlled — it is a
 * claim, not evidence. Without this check a caller could label anything
 * `image/png` and have it stored and served back. Magic bytes are cheap and
 * catch exactly that.
 */
function magicBytesMatch(mime: AllowedMime, head: Buffer): boolean {
  switch (mime) {
    case "image/jpeg":
      return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    case "image/png":
      return (
        head[0] === 0x89 &&
        head[1] === 0x50 &&
        head[2] === 0x4e &&
        head[3] === 0x47 &&
        head[4] === 0x0d &&
        head[5] === 0x0a &&
        head[6] === 0x1a &&
        head[7] === 0x0a
      );
    case "image/webp":
      // "RIFF" .... "WEBP"
      return (
        head.subarray(0, 4).toString("ascii") === "RIFF" &&
        head.subarray(8, 12).toString("ascii") === "WEBP"
      );
    case "video/mp4":
      // ISO-BMFF: a box header whose type is "ftyp" at offset 4.
      return head.subarray(4, 8).toString("ascii") === "ftyp";
    case "video/webm":
      // EBML header.
      return (
        head[0] === 0x1a &&
        head[1] === 0x45 &&
        head[2] === 0xdf &&
        head[3] === 0xa3
      );
    default:
      return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Abuse protection                                                  */
/* ------------------------------------------------------------------ */

/**
 * Per-IP upload budget.
 *
 * Mirrors the in-memory limiter in server/routes/track.ts rather than
 * introducing a second mechanism. The global @fastify/rate-limit
 * registration (600/min) is far too generous for a route that writes
 * 25 MB files, so this sits on top of it.
 *
 * In-memory means per-process: it does not survive a restart and does not
 * coordinate across instances. See the remaining-risks note in the report.
 */
const uploadBudget = new Map<string, { count: number; resetAt: number }>();
const UPLOAD_MAX_PER_WINDOW = 10;
const UPLOAD_WINDOW_MS = 10 * 60 * 1000;

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

function isOverBudget(ip: string): boolean {
  const key = hashIp(ip);
  const now = Date.now();
  const entry = uploadBudget.get(key);

  if (!entry || now >= entry.resetAt) {
    uploadBudget.set(key, { count: 1, resetAt: now + UPLOAD_WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > UPLOAD_MAX_PER_WINDOW;
}

/** Drop expired buckets so the map cannot grow without bound. */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of uploadBudget) {
    if (now >= entry.resetAt) uploadBudget.delete(key);
  }
}, UPLOAD_WINDOW_MS).unref();

/* ------------------------------------------------------------------ */
/*  Plugin                                                            */
/* ------------------------------------------------------------------ */

/**
 * Customer review media upload.
 *
 * Deliberately separate from `uploadFileApiPlugin` (`POST /file`): that
 * route accepts any file type, writes non-images through unprocessed, and
 * does not check the session it reads. Nothing here reuses it.
 *
 * Uploading does NOT create a review and does NOT touch the database. It
 * returns a URL that the caller passes to `product.createReview`, which
 * still stores the review as `pending`.
 */
export const reviewMediaApiPlugin = (app: FastifyInstance) => {
  const root = process.cwd();
  const reviewsDir = path.join(root, "uploads", "reviews");

  fs.mkdirSync(reviewsDir, { recursive: true });

  /* ---------------------------------------------------------------- */
  /*  POST /api/review-media                                          */
  /* ---------------------------------------------------------------- */

  app.post(
    "/",
    {
      config: {
        // Per-route override of the global 600/min allowance.
        rateLimit: { max: 20, timeWindow: "10 minutes" },
      },
    },
    async (req, reply) => {
      if (isOverBudget(req.ip)) {
        return reply.code(429).send({
          success: false,
          error: "Too many uploads. Please try again later.",
        });
      }

      let data: Awaited<ReturnType<typeof req.file>>;
      try {
        data = await req.file({
          limits: { fileSize: MAX_ANY_BYTES, files: 1 },
        });
      } catch {
        return reply
          .code(400)
          .send({ success: false, error: "Malformed upload." });
      }

      if (!data) {
        return reply
          .code(400)
          .send({ success: false, error: "No file provided." });
      }

      const mime = ((data.mimetype || "").toLowerCase().split(";")[0] ?? "")
        .trim();
      const policy = ALLOWED_MEDIA[mime as AllowedMime];

      if (!policy) {
        // The stream must be drained or the connection hangs.
        data.file.resume();
        return reply.code(415).send({
          success: false,
          error:
            "Unsupported file type. Allowed: JPG, PNG, WebP, MP4, WebM.",
        });
      }

      // Temp name keeps a partial or rejected upload from ever being
      // reachable under its final, servable name.
      const id = v7();
      const finalName = `${id}.${policy.ext}`;
      const tempPath = path.join(reviewsDir, `.${id}.part`);
      const finalPath = path.join(reviewsDir, finalName);

      let written = 0;
      let head = Buffer.alloc(0);

      try {
        await new Promise<void>((resolve, reject) => {
          const out = createWriteStream(tempPath);

          // Written by hand rather than piped so an over-cap upload can stop
          // hitting the disk while STILL draining the request.
          //
          // Destroying the source mid-stream instead looks tidier and is a
          // trap: the write stream then never emits "finish", this promise
          // never settles, the request hangs (the client sees a bare 100
          // Continue) and the temp file is never unlinked. The body is
          // already bounded by the 25 MB multipart ceiling, so draining the
          // remainder costs nothing worth optimising.
          data.file.on("data", (chunk: Buffer) => {
            written += chunk.length;
            if (head.length < 16) {
              head = Buffer.concat([head, chunk]).subarray(0, 16);
            }
            if (written <= policy.maxBytes) out.write(chunk);
          });

          data.file.on("end", () => out.end());
          data.file.on("error", reject);
          out.on("error", reject);
          out.on("finish", resolve);
        });
      } catch {
        await fs.promises.unlink(tempPath).catch(() => {});
        return reply
          .code(400)
          .send({ success: false, error: "Upload failed." });
      }

      // `truncated` is the multipart-level 25 MB ceiling; `written` is the
      // per-type cap (a 6 MB JPEG has to fail even though it is under 25 MB).
      if (data.file.truncated || written > policy.maxBytes) {
        await fs.promises.unlink(tempPath).catch(() => {});
        const mb = Math.floor(policy.maxBytes / (1024 * 1024));
        return reply.code(413).send({
          success: false,
          error: `${policy.kind === "video" ? "Video" : "Image"} is too large (max ${mb}MB).`,
        });
      }

      if (written === 0) {
        await fs.promises.unlink(tempPath).catch(() => {});
        return reply
          .code(400)
          .send({ success: false, error: "Empty file." });
      }

      if (!magicBytesMatch(mime as AllowedMime, head)) {
        await fs.promises.unlink(tempPath).catch(() => {});
        return reply.code(415).send({
          success: false,
          error: "File contents do not match its type.",
        });
      }

      try {
        await fs.promises.rename(tempPath, finalPath);
      } catch {
        await fs.promises.unlink(tempPath).catch(() => {});
        return reply
          .code(500)
          .send({ success: false, error: "Could not store the file." });
      }

      return reply.send({
        success: true,
        mediaUrl: `${REVIEW_MEDIA_URL_PREFIX}/${finalName}`,
        kind: policy.kind,
      });
    },
  );

  /* ---------------------------------------------------------------- */
  /*  DELETE /api/review-media/:filename                              */
  /* ---------------------------------------------------------------- */

  /**
   * Best-effort cleanup for an upload whose review never got created.
   *
   * Public, so it is deliberately narrow. A file is removed only when all
   * of the following hold:
   *
   *  1. the name is one of ours (uuid + allowed extension) — a traversal
   *     sequence fails this and never becomes a path;
   *  2. the resolved path is still inside uploads/reviews;
   *  3. NO product_review row references it — an approved review's media
   *     can never be deleted through this route;
   *  4. it is younger than an hour — so this cannot be walked backwards
   *     through older media.
   *
   * Worst case for an attacker who guesses a uuid v7: they remove a
   * stranger's not-yet-submitted upload. That is a nuisance, not data loss.
   */
  app.delete<{ Params: { filename: string } }>(
    "/:filename",
    {
      config: {
        rateLimit: { max: 20, timeWindow: "10 minutes" },
      },
    },
    async (req, reply) => {
      const { filename } = req.params;

      if (!REVIEW_MEDIA_FILENAME.test(filename)) {
        return reply
          .code(400)
          .send({ success: false, error: "Invalid filename." });
      }

      const target = path.resolve(reviewsDir, filename);
      // Defence in depth: the regex already excludes separators.
      if (path.dirname(target) !== path.resolve(reviewsDir)) {
        return reply
          .code(400)
          .send({ success: false, error: "Invalid filename." });
      }

      let stat: fs.Stats;
      try {
        stat = await fs.promises.stat(target);
      } catch {
        // Already gone — the caller's goal is satisfied either way.
        return reply.send({ success: true, deleted: false });
      }

      if (Date.now() - stat.mtimeMs > CLEANUP_MAX_AGE_MS) {
        return reply
          .code(409)
          .send({ success: false, error: "File is too old to clean up." });
      }

      // A referenced file is somebody's review — never remove it.
      try {
        const mediaUrl = `${REVIEW_MEDIA_URL_PREFIX}/${filename}`;
        const referenced = await db()
          .select({ id: productReview.id })
          .from(productReview)
          .where(eq(productReview.mediaUrl, mediaUrl))
          .limit(1)
          .execute();

        if (referenced.length > 0) {
          return reply
            .code(409)
            .send({ success: false, error: "File is in use." });
        }
      } catch {
        // If we cannot prove the file is unreferenced, we do not delete it.
        return reply
          .code(503)
          .send({ success: false, error: "Cleanup unavailable." });
      }

      try {
        await fs.promises.unlink(target);
      } catch {
        return reply
          .code(500)
          .send({ success: false, error: "Could not remove the file." });
      }

      return reply.send({ success: true, deleted: true });
    },
  );
};
