import { NextRequest, NextResponse } from "next/server";
import { BACKEND_API_URL, verifyCsrf } from "@/lib/serverAuth";

export async function POST(request: NextRequest) {
  if (!verifyCsrf(request)) {
    return NextResponse.json(
      { detail: "CSRF verification failed" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();

    const backendRes = await fetch(`${BACKEND_API_URL}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await backendRes.json();

    return NextResponse.json(data, {
      status: backendRes.status,
    });
  } catch (error) {
    console.error("[Register Route Error]", error);
    return NextResponse.json(
      { detail: "Cannot connect to backend" },
      { status: 502 },
    );
  }
}
