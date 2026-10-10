import { NextRequest, NextResponse } from "next/server";
import {
  BACKEND_API_URL,
  getAuthCookieOptions,
  verifyCsrf,
} from "@/lib/serverAuth";

export async function POST(request: NextRequest) {
  if (!verifyCsrf(request)) {
    return NextResponse.json(
      { detail: "CSRF verification failed" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const { email, password, rememberMe } = body;

    const backendRes = await fetch(`${BACKEND_API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await backendRes.json();

    if (!backendRes.ok || !data.access_token) {
      return NextResponse.json(
        {
          detail: data.detail || data.message || "Invalid Credentials",
        },
        { status: backendRes.status || 401 },
      );
    }

    const { access_token, user } = data;
    const cookieOptions = getAuthCookieOptions(Boolean(rememberMe));

    // Exclude access_token from response payload returned to browser
    const response = NextResponse.json(
      {
        message: data.message || "Login Successful",
        user,
      },
      { status: 200 },
    );

    response.cookies.set(cookieOptions.name, access_token, {
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      path: cookieOptions.path,
      maxAge: cookieOptions.maxAge,
    });

    return response;
  } catch (error) {
    console.error("[Login Route Error]", error);
    return NextResponse.json(
      { detail: "Cannot Connect to Backend" },
      { status: 502 },
    );
  }
}
