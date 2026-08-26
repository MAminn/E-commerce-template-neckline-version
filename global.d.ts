import type { ClientSession } from "./backend/auth/shared/entities";
import type { DatabaseClient } from "./shared/database/drizzle/db";
import type { LayoutSettings } from "./shared/types/layout-settings";

declare global {
  namespace Vike {
    interface PageContext {
      db: DatabaseClient;
      clientSession?: ClientSession;
      templateSelection?: Record<string, string>;
      layoutSettingsData?: LayoutSettings;
      brandName?: string;
      ssrLocale?: "en" | "ar";
    }
  }

  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

// biome-ignore lint/complexity/noUselessEmptyExport: ensure that the file is considered as a module
export {};
