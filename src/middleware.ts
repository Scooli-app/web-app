import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { isClerkOrganizationAdminRole } from "@/shared/utils/clerkOrganizationRole";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/forgot-password(.*)",
  "/signup",
  "/",
  "/checkout/cancel",
  "/webhooks/stripe",
  "/.well-known/(.*)",
]);
const TOKEN_COOKIE_NAME = "scooli_token";

function getSafeRedirectPath(redirectUrl: string | null): string | null {
  if (
    !redirectUrl ||
    !redirectUrl.startsWith("/") ||
    redirectUrl.startsWith("//")
  ) {
    return null;
  }

  return redirectUrl;
}

export default clerkMiddleware(async (auth, req) => {
  // Early return for webhook routes - skip all authentication
  if (req.nextUrl.pathname === "/webhooks/stripe") {
    return NextResponse.next();
  }

  const authObj = await auth();

  const setTokenCookie = async (res: NextResponse) => {
    try {
      if (!authObj.userId) {
        res.cookies.delete(TOKEN_COOKIE_NAME);
        return;
      }

      const template = process.env.CLERK_JWT_TEMPLATE;
      const token = await authObj.getToken(template ? { template } : undefined);

      if (!token) {
        res.cookies.delete(TOKEN_COOKIE_NAME);
        return;
      }

      res.cookies.set(TOKEN_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        domain: process.env.AUTH_COOKIE_DOMAIN || undefined,
        maxAge: 60 * 15, // 15 minutes; refreshed on navigation
      });
    } catch {
      // keep middleware resilient; auth cookie will simply not be set
    }
  };

  // Redirect authenticated users away from auth pages
  if (
    authObj.userId &&
    (req.nextUrl.pathname.startsWith("/sign-in") ||
      req.nextUrl.pathname.startsWith("/sign-up") ||
      req.nextUrl.pathname.startsWith("/forgot-password"))
  ) {
    const redirectPath = getSafeRedirectPath(
      req.nextUrl.searchParams.get("redirect_url"),
    );
    const redirectUrl = redirectPath
      ? new URL(redirectPath, req.url)
      : new URL("/dashboard", req.url);

    if (!redirectPath) {
      redirectUrl.search = req.nextUrl.search;
    }

    const res = NextResponse.redirect(redirectUrl);
    await setTokenCookie(res);
    return res;
  }

  if (req.nextUrl.pathname === "/") {
    const dashboardUrl = new URL("/dashboard", req.url);
    dashboardUrl.search = req.nextUrl.search;
    const res = NextResponse.redirect(dashboardUrl);
    await setTokenCookie(res);
    return res;
  }

  if (!authObj.userId && req.nextUrl.pathname === "/checkout") {
    const signUpUrl = new URL("/sign-up", req.url);
    const returnUrl = `${req.nextUrl.pathname}${req.nextUrl.search}`;
    signUpUrl.searchParams.set("redirect_url", returnUrl);
    return NextResponse.redirect(signUpUrl);
  }

  if (!isPublicRoute(req)) {
    await auth.protect({
      unauthenticatedUrl: new URL("/sign-in", req.url).toString(),
    });
  }

  // Admin route protection
  if (req.nextUrl.pathname.startsWith("/admin")) {
    const { sessionClaims } = authObj;
    // Check for role in public_metadata (mapped to sessionClaims)
    const publicMetadata = sessionClaims?.public_metadata as
      | Record<string, unknown>
      | undefined;
    const isAdmin = publicMetadata?.role === "admin";

    if (!isAdmin) {
      const dashboardUrl = new URL("/dashboard", req.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  if (req.nextUrl.pathname.startsWith("/school")) {
    const activeOrgId = authObj.orgId;
    const activeOrgRole = authObj.orgRole;
    const isOrganizationAdmin = isClerkOrganizationAdminRole(activeOrgRole);

    if (activeOrgId && !isOrganizationAdmin) {
      const dashboardUrl = new URL("/dashboard", req.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  const res = NextResponse.next();
  await setTokenCookie(res);
  return res;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes and webhooks
    "/(api|trpc|webhooks)(.*)",
  ],
};
