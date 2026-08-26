import { getLayoutSettings } from "#root/backend/layout/get-layout-settings/index";
import { getStoreOwnerId } from "#root/shared/config/store";
import { STORE_NAME, STORE_CURRENCY } from "#root/shared/config/branding";
import { readFile, existsSync } from "node:fs";
import { resolve, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const readFileAsync = promisify(readFile);

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

/** Resolve the repo root (works both from source and from build output). */
function getRepoRoot(): string {
  const dir = dirname(fileURLToPath(import.meta.url));
  // source: backend/emails/ → two levels up to root
  // build:  build/backend/emails/ → three levels up to root
  const isBuild = dir.includes("build");
  return resolve(dir, isBuild ? "../../.." : "../..");
}

/** Reads an uploaded image from disk and returns a base64 data URI. */
async function logoToDataUri(filename: string): Promise<string | undefined> {
  try {
    // Strip any leading /uploads/ prefix that may have been stored
    const bare = filename.replace(/^\/?uploads\//, "");
    const filePath = resolve(getRepoRoot(), "uploads", bare);
    if (!existsSync(filePath)) return undefined;
    const buf = await readFileAsync(filePath);
    const ext = extname(filePath).toLowerCase();
    const mime = MIME[ext] ?? "image/jpeg";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return undefined;
  }
}

export interface EmailBranding {
  storeName: string;
  logoUrl: string | undefined;
  contactEmail: string | undefined;
  currency: string;
  isMinimal: boolean;
}

/**
 * Resolves branding values for email templates from layout settings.
 * Returns store name (from siteTitle or STORE_NAME env), logo URL, contact
 * email, currency, and whether the minimal template is active.
 */
export async function getEmailBranding(): Promise<EmailBranding> {
  try {
    const settings = await getLayoutSettings(getStoreOwnerId(), "landing-minimal");
    const isMinimal = settings.header.navbarStyle === "minimal";
    const storeName = settings.siteTitle || STORE_NAME || "Store";

    let logoUrl: string | undefined;
    if (settings.header.logoUrl) {
      const raw = settings.header.logoUrl;
      if (raw.startsWith("data:")) {
        // Already a data URI
        logoUrl = raw;
      } else if (raw.startsWith("http")) {
        // Absolute external URL — use as-is
        logoUrl = raw;
      } else {
        // Local upload — read from disk and embed as base64
        const bare = raw.startsWith("/uploads/") ? raw.slice("/uploads/".length) : raw;
        logoUrl = await logoToDataUri(bare);
      }
    }

    return {
      storeName,
      logoUrl,
      contactEmail: settings.header.contactEmail || undefined,
      currency: STORE_CURRENCY,
      isMinimal,
    };
  } catch {
    return {
      storeName: STORE_NAME || "Store",
      logoUrl: undefined,
      contactEmail: undefined,
      currency: STORE_CURRENCY,
      isMinimal: false,
    };
  }
}
