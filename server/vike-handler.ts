/// <reference lib="webworker" />
import { renderPage } from "vike/server";
import { createMiddleware } from "hono/factory";
import { getTemplateSelectionRaw } from "#root/backend/settings/get-template-selection-raw.js";
import { getLayoutSettingsRaw } from "#root/backend/layout/get-layout-settings-raw.js";
import { getLinkTreeConfigRaw } from "#root/backend/settings/get-link-tree-config.js";
import { getStoreOwnerId } from "#root/shared/config/store.js";

export const vikeHonoMiddleware = createMiddleware(
  async (c) => {
    // Fetch template selection for SSR to prevent hydration flicker
    const templateSelection = await getTemplateSelectionRaw(c.var.db);
    // Fetch layout settings for SSR to prevent navbar/footer flicker
    const activeLandingTemplate = templateSelection?.landing;
    const layoutSettingsData = await getLayoutSettingsRaw(
      c.var.db,
      getStoreOwnerId(),
      activeLandingTemplate,
    );
    // Fetch brand name from link-tree config for dynamic page titles
    const linkTreeConfig = await getLinkTreeConfigRaw(c.var.db);
    const brandName = linkTreeConfig.brandName || undefined;

    // Read locale from cookie for SSR (prevents EN→AR flicker)
    const cookieHeader = c.req.header("cookie") ?? "";
    const localeMatch = cookieHeader.match(/(?:^|;\s*)minimal-locale=(en|ar)/);
    const ssrLocale = (localeMatch?.[1] as "en" | "ar") ?? "en";

    const pageContextInit = {
      db: c.var.db,
      clientSession: c.var.clientSession,
      urlOriginal: c.req.url,
      headersOriginal: c.req.raw.headers,
      templateSelection,
      layoutSettingsData,
      brandName,
      ssrLocale,
    };
    const pageContext = await renderPage(pageContextInit);
    const response = pageContext.httpResponse;

    const { readable, writable } = new TransformStream();
    response.pipe(writable);

    return new Response(readable, {
      status: response.statusCode,
      headers: response.headers,
    });
  }
);
