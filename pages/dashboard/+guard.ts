import { redirect } from "vike/abort";
import { isSingleShopMode } from "#root/shared/config/app";

export async function guard(pageContext: Vike.PageContext) {
  if (!pageContext.clientSession) {
    throw redirect("/login");
  }

  // In single-shop mode, only admins can access dashboard
  if (isSingleShopMode() && pageContext.clientSession.role !== "admin") {
    throw redirect("/");
  }

  // In multi-vendor mode, redirect users with 'user' role to the homepage
  if (!isSingleShopMode() && pageContext.clientSession.role === "user") {
    throw redirect("/");
  }
}
