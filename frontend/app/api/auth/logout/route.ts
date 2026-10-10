import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  LEGACY_SESSION_COOKIE,
  verifyCsrf,
} from "@/lib/serverAuth";

export async function POST(request: NextRequest) {
  if (!verifyCsrf(request)) {
    return NextResponse.json(
      { detail: "CSRF verification failed" },
      { status: 403 },
    );
  }

  const response = NextResponse.json(
    { message: "Logged out successfully" },
    { status: 200 },
  );

  const isProd = process.env.NODE_ENV === "production";

  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });

  response.cookies.set(LEGACY_SESSION_COOKIE, "", {
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}
