import { auth } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN_COOKIE_NAME = "scooli_token";

function getBackendBaseUrl() {
  return process.env.BASE_API_URL || process.env.NEXT_PUBLIC_BASE_API_URL || "";
}

function getCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    domain: process.env.AUTH_COOKIE_DOMAIN || undefined,
    maxAge: 60 * 15,
  };
}

async function getBackendToken(req: NextRequest): Promise<string | null> {
  const cookieToken = req.cookies.get(TOKEN_COOKIE_NAME)?.value;
  if (cookieToken) {
    return cookieToken;
  }

  const authObj = await auth();
  if (!authObj.userId) {
    return null;
  }
  const template = process.env.CLERK_JWT_TEMPLATE;
  return await authObj.getToken(template ? { template } : undefined);
}

async function proxy(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const baseUrl = getBackendBaseUrl();
  if (!baseUrl) {
    return NextResponse.json(
      { message: "BASE_API_URL / NEXT_PUBLIC_BASE_API_URL is not configured" },
      { status: 500 }
    );
  }

  const { path } = await ctx.params;
  const incomingUrl = new URL(req.url);
  const targetUrl = new URL(
    path.join("/"),
    baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
  );
  targetUrl.search = incomingUrl.search;

  const token = await getBackendToken(req);
  if (!token) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("cookie");
  headers.set("authorization", `Bearer ${token}`);

  const upstreamResponse = await fetch(targetUrl, {
    method: req.method,
    headers,
    body: req.method === "GET" || req.method === "HEAD" ? undefined : req.body,
    redirect: "manual",
    cache: "no-store",
  });

  const responseHeaders = new Headers(upstreamResponse.headers);
  responseHeaders.delete("set-cookie");

  const res = new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });

  // Refresh token cookie on every proxied request (keeps it alive between sessions)
  res.cookies.set(TOKEN_COOKIE_NAME, token, getCookieOptions());

  return res;
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
