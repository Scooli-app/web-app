import { NextResponse, type NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard",
    "/dashboard/:path*",
    "/documents/:path*",
    "/lesson-plan/:path*",
    "/assays/:path*",
    "/quiz/:path*",
    "/admin/:path*",
    "/community/:path*",
    "/api/documents/:path*",
    "/api/admin/:path*",
  ],
};
