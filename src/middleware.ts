import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Redirect root to dashboard
  if (req.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Protect dashboard routes
  if (req.nextUrl.pathname.startsWith("/dashboard")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // Protect lesson plan routes
  if (req.nextUrl.pathname.startsWith("/lesson-plan")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // Protect API routes that require authentication
  if (req.nextUrl.pathname.startsWith("/api/documents")) {
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/lesson-plan/:path*",
    "/api/documents/:path*",
  ],
};
