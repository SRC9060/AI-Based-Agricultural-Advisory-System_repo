/**
 * Client-side API client for AgriAdvisor.
 *
 * All client API calls route through the same-origin Next.js server proxy (/api/proxy).
 * Authentication is backed by an HttpOnly cookie and injected server-side.
 * Browser JavaScript never accesses or stores bearer tokens.
 */

export const API_URL = "/api/proxy";

export function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  let targetUrl: string;

  if (typeof input === "string") {
    targetUrl = input;
  } else if (input instanceof URL) {
    targetUrl = input.toString();
  } else if ("url" in input) {
    targetUrl = input.url;
  } else {
    targetUrl = String(input);
  }

  // Normalize URLs to route through the same-origin /api/proxy boundary
  // If targetUrl contains http(s)://... pointing to backend or localhost, strip backend origin
  if (/^https?:\/\//i.test(targetUrl)) {
    try {
      const parsed = new URL(targetUrl);
      // Route through local proxy path
      const pathname = parsed.pathname.startsWith("/api/proxy")
        ? parsed.pathname
        : `/api/proxy${parsed.pathname.startsWith("/") ? "" : "/"}${parsed.pathname}`;
      targetUrl = `${pathname}${parsed.search}`;
    } catch {
      // Keep as-is if parsing fails
    }
  } else if (!targetUrl.startsWith("/api/")) {
    targetUrl = `/api/proxy${targetUrl.startsWith("/") ? "" : "/"}${targetUrl}`;
  }

  const headers = new Headers(init.headers);
  if (!headers.has("X-Requested-With")) {
    headers.set("X-Requested-With", "XMLHttpRequest");
  }

  return fetch(targetUrl, {
    ...init,
    headers,
    credentials: "same-origin",
  });
}
