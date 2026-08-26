import { Effect } from "effect";
import { writeFile, mkdir } from "node:fs/promises";
import { v7 } from "uuid";
import sharp from "sharp";
import { existsSync } from "node:fs";

export interface UploadLayoutImageInput {
  buffer: Uint8Array;
  mimeType: string;
  /** "header-logo" | "footer-logo" */
  prefix: string;
}

export interface UploadLayoutImageResult {
  url: string;
  filename: string;
}

/**
 * Upload a layout image (header logo or footer logo).
 * - Validates image type (jpg, png, webp, svg)
 * - Validates size (max 2MB)
 * - Preserves aspect ratio, max 600px wide
 * - Saves to uploads/layout/
 */
export const uploadLayoutImage = ({
  buffer,
  mimeType,
  prefix,
}: UploadLayoutImageInput): Effect.Effect<UploadLayoutImageResult, Error> => {
  return Effect.gen(function* () {
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/svg+xml",
      "image/x-icon",
      "image/vnd.microsoft.icon",
    ];
    if (!allowedTypes.includes(mimeType.toLowerCase())) {
      yield* Effect.fail(
        new Error(
          "Invalid file type. Only JPG, PNG, WebP, and SVG are allowed.",
        ),
      );
    }

    const maxSize = 2 * 1024 * 1024;
    if (buffer.length > maxSize) {
      yield* Effect.fail(new Error("File too large. Maximum size is 2MB."));
    }

    const uploadsDir = "./uploads/layout";
    if (!existsSync(uploadsDir)) {
      yield* Effect.tryPromise({
        try: () => mkdir(uploadsDir, { recursive: true }),
        catch: (err) => new Error(`Failed to create uploads directory: ${err}`),
      });
    }

    const fileId = v7();

    // SVG and ICO files are stored as-is
    if (mimeType === "image/svg+xml") {
      const filename = `${prefix}-${fileId}.svg`;
      const filePath = `${uploadsDir}/${filename}`;

      yield* Effect.tryPromise({
        try: () => writeFile(filePath, Buffer.from(buffer)),
        catch: (err) => new Error(`Failed to save SVG: ${err}`),
      });

      return { url: `/uploads/layout/${filename}`, filename };
    }

    if (mimeType === "image/x-icon" || mimeType === "image/vnd.microsoft.icon") {
      const filename = `${prefix}-${fileId}.ico`;
      const filePath = `${uploadsDir}/${filename}`;

      yield* Effect.tryPromise({
        try: () => writeFile(filePath, Buffer.from(buffer)),
        catch: (err) => new Error(`Failed to save ICO: ${err}`),
      });

      return { url: `/uploads/layout/${filename}`, filename };
    }

    // Raster images are processed with sharp
    const filename = `${prefix}-${fileId}.webp`;
    const filePath = `${uploadsDir}/${filename}`;

    yield* Effect.tryPromise({
      try: async () => {
        await sharp(Buffer.from(buffer))
          .resize({
            width: 600,
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: 90, effort: 6 })
          .toFile(filePath);
      },
      catch: (err) => new Error(`Failed to process image: ${err}`),
    });

    return { url: `/uploads/layout/${filename}`, filename };
  });
};
