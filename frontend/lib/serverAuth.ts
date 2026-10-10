import { NextRequest } from "next/server";

export const BACKEND_API_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

export const AUTH_COOKIE_NAME = "agriadvisor_auth";
export const LEGACY_SESSION_COOKIE = "agriadvisor_session";

export function getAuthCookieOptions(rememberMe: boolean = false) {
  const isProd = process.env.NODE_ENV === "production";
  return {
    name: AUTH_COOKIE_NAME,
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24, // 30 days if rememberMe, 24 hours otherwise
  };
}

export function verifyCsrf(request: NextRequest): boolean {
  const method = request.method.toUpperCase();
  // Safe methods do not mutate state
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return true;
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");

  if (origin) {
    try {
      const originUrl = new URL(origin);
      if (host && originUrl.host.toLowerCase() === host.toLowerCase()) {
        return true;
      }
    } catch {
      return false;
    }
  }

  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (host && refererUrl.host.toLowerCase() === host.toLowerCase()) {
        return true;
      }
    } catch {
      return false;
    }
  }

  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite === "same-origin" || secFetchSite === "same-site") {
    return true;
  }

  if (process.env.NODE_ENV === "development") {
    return true;
  }

  return false;
}
