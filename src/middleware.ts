import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)", "/", "/.well-known/(.*)"]);
const TOKEN_COOKIE_NAME = "scooli_token";

export default clerkMiddleware(async (auth, req) => {
  const setTokenCookie = async (res: NextResponse) => {
    try {
      const authObj = await auth();
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

  if (req.nextUrl.pathname === "/") {
    const res = NextResponse.redirect(new URL("/dashboard", req.url));
    await setTokenCookie(res);
    return res;
  }

  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  const res = NextResponse.next();
  await setTokenCookie(res);
  return res;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|\\.well-known|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
