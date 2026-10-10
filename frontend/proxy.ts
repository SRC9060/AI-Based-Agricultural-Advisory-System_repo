import { NextRequest, NextResponse } from "next/server";

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

function buildContentSecurityPolicy(nonce: string) {
  const isDevelopment = process.env.NODE_ENV === "development";
  const connectSrc = isDevelopment
    ? "'self' https: wss: http://localhost:* http://127.0.0.1:*"
    : "'self' https: wss:";

  const scriptSrc = [
    "'self'",
    "'nonce-" + nonce + "'",
    ...(isDevelopment ? ["'unsafe-eval'"] : []),
    "https://va.vercel-scripts.com",
  ].join(" ");

  return [
    "default-src 'self'",
    "script-src " + scriptSrc,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src " + connectSrc,
    "media-src 'self' blob: data: https:",
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const isProtected = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  const hasAuthCookie =
    Boolean(request.cookies.get("agriadvisor_auth")?.value) ||
    Boolean(request.cookies.get("agriadvisor_session")?.value);

  if (isProtected && !hasAuthCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const contentSecurityPolicy = buildContentSecurityPolicy(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set("Content-Security-Policy", contentSecurityPolicy);

  return response;
}

export const config = {
  matcher: [
    {
      source:
        "/((?!api|_next/static|_next/image|images|favicon.ico|sw.js|manifest.webmanifest).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};