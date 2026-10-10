import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  BACKEND_API_URL,
} from "@/lib/serverAuth";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json(
      { detail: "Authentication required" },
      { status: 401 },
    );
  }

  try {
    const backendRes = await fetch(`${BACKEND_API_URL}/auth/verify`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (backendRes.status === 401) {
      const isProd = process.env.NODE_ENV === "production";
      const response = NextResponse.json(
        { detail: "Session expired or invalid" },
        { status: 401 },
      );
      response.cookies.set(AUTH_COOKIE_NAME, "", {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
        expires: new Date(0),
      });
      return response;
    }

    if (!backendRes.ok) {
      return NextResponse.json(
        { detail: "Auth verification unavailable" },
        { status: backendRes.status },
      );
    }

    const data = await backendRes.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("[Verify Route Error]", error);
    return NextResponse.json(
      { detail: "Cannot connect to backend" },
      { status: 502 },
    );
  }
}
