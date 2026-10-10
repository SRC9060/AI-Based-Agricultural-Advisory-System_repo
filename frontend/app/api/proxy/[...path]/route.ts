import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  BACKEND_API_URL,
  verifyCsrf,
} from "@/lib/serverAuth";

interface RouteParams {
  params: Promise<{
    path: string[];
  }>;
}

async function handleProxy(request: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  const targetPath = path.join("/");

  if (!verifyCsrf(request)) {
    return NextResponse.json(
      { detail: "CSRF verification failed" },
      { status: 403 },
    );
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const search = request.nextUrl.search;
  const targetUrl = `${BACKEND_API_URL}/${targetPath}${search}`;

  const forwardHeaders = new Headers();

  // Forward incoming headers, skipping hop-by-hop headers
  const skippedHeaders = new Set([
    "host",
    "cookie",
    "connection",
    "keep-alive",
    "content-length",
    "transfer-encoding",
  ]);

  request.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (!skippedHeaders.has(lowerKey)) {
      forwardHeaders.set(key, value);
    }
  });

  // Inject backend bearer token from HttpOnly cookie if present
  if (token) {
    forwardHeaders.set("Authorization", `Bearer ${token}`);
  }

  const method = request.method.toUpperCase();
  const init: RequestInit = {
    method,
    headers: forwardHeaders,
    cache: "no-store",
  };

  if (method !== "GET" && method !== "HEAD") {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      // For file/image uploads, read arrayBuffer to preserve boundaries
      const buffer = await request.arrayBuffer();
      init.body = buffer;
    } else {
      init.body = await request.text();
    }
  }

  try {
    const backendRes = await fetch(targetUrl, init);

    const responseHeaders = new Headers();
    backendRes.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (!skippedHeaders.has(lowerKey) && lowerKey !== "set-cookie") {
        responseHeaders.set(key, value);
      }
    });

    const response = new Response(backendRes.body, {
      status: backendRes.status,
      statusText: backendRes.statusText,
      headers: responseHeaders,
    });

    // If session is expired on backend, clear the client cookie
    if (backendRes.status === 401 && token) {
      const isProd = process.env.NODE_ENV === "production";
      response.headers.append(
        "Set-Cookie",
        `${AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${
          isProd ? "; Secure" : ""
        }`,
      );
    }

    return response;
  } catch (error) {
    console.error(`[Proxy Error ${method} ${targetUrl}]`, error);
    return NextResponse.json(
      { detail: "Backend Service Unavailable" },
      { status: 502 },
    );
  }
}

export async function GET(request: NextRequest, context: RouteParams) {
  return handleProxy(request, context);
}

export async function POST(request: NextRequest, context: RouteParams) {
  return handleProxy(request, context);
}

export async function PUT(request: NextRequest, context: RouteParams) {
  return handleProxy(request, context);
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  return handleProxy(request, context);
}

export async function PATCH(request: NextRequest, context: RouteParams) {
  return handleProxy(request, context);
}

export async function HEAD(request: NextRequest, context: RouteParams) {
  return handleProxy(request, context);
}
