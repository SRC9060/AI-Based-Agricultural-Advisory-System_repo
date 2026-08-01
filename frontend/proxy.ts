import { createProxy } from "next-i18next/proxy";
import { NextRequest, NextResponse } from "next/server";
import i18nConfig from "./i18n.config";

const i18nProxy = createProxy(i18nConfig);
const protectedRoutes = [
  "/dashboard",
  "/weather",
  "/market-prices",
  "/schemes",
  "/chat",
  "/profile",
  "/feedback",
  "/queries",
  "/settings",
];

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtected = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (isProtected && !request.cookies.get("agriadvisor_session")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return i18nProxy(request);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|images|favicon.ico|sw.js|manifest.webmanifest).*)"],
};
