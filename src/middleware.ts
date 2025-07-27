import { getRouteConfig, isProtectedRoute } from "@/shared/auth/routeConfig";
import { userHasAllPermissions, userHasPermission } from "@/shared/auth/utils";
import type { UserProfile } from "@/shared/types/auth";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { createClient, type Session } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

const CACHE_DURATION = 30 * 1000; // 30 seconds

// Updated cache to store session and profile together
const authCache = new Map<
  string,
  { session: Session | null; profile: UserProfile | null; timestamp: number }
>();

function getCacheKey(req: NextRequest): string {
  // Use a combination of user agent and IP to create a cache key
  const userAgent = req.headers.get("user-agent") || "";
  const forwardedFor = req.headers.get("x-forwarded-for") || "";
  const realIp = req.headers.get("x-real-ip") || "";
  return `${userAgent}-${forwardedFor}-${realIp}`;
}

function getCachedAuthData(req: NextRequest): {
  session: Session | null;
  profile: UserProfile | null;
} {
  const key = getCacheKey(req);
  const cached = authCache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { session: cached.session, profile: cached.profile };
  }

  return { session: null, profile: null };
}

function setCachedAuthData(
  req: NextRequest,
  session: Session | null,
  profile: UserProfile | null
) {
  const key = getCacheKey(req);
  authCache.set(key, { session, profile, timestamp: Date.now() });
}

export async function middleware(req: NextRequest) {
  // Handle root redirect FIRST
  if (req.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  const res = NextResponse.next();

  // Skip non-protected routes
  if (!isProtectedRoute(req.nextUrl.pathname)) {
    return res;
  }

  // Get route configuration
  const routeConfig = getRouteConfig(req.nextUrl.pathname);
  if (!routeConfig) {
    return res;
  }

  try {
    // Check cache for both session and profile
    let { session, profile } = getCachedAuthData(req);

    // If the session or profile is not cached, fetch from the source
    if (!session || !profile) {
      const supabase = createMiddlewareClient({ req, res });
      const {
        data: { session: newSession },
      } = await supabase.auth.getSession();
      session = newSession;

      // If a session exists, fetch the user profile
      if (session?.user) {
        try {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

          if (supabaseUrl && supabaseServiceKey) {
            const serviceSupabase = createClient(
              supabaseUrl,
              supabaseServiceKey
            );
            const { data: userProfileData, error } = await serviceSupabase.rpc(
              "get_user_profile_with_permissions",
              { user_id: session.user.id }
            );

            if (error) {
              console.error(
                "[Middleware] Error fetching user profile on cache miss:",
                error
              );
              profile = null;
            } else {
              profile = (userProfileData?.[0] as UserProfile | null) ?? null;
            }
          }
        } catch (error) {
          console.error(
            "[Middleware] Exception fetching user profile on cache miss:",
            error
          );
          profile = null;
        }
      } else {
        profile = null;
      }

      // Update the cache with the newly fetched data
      setCachedAuthData(req, session, profile);
    }

    // Check authentication requirement
    if (routeConfig.requiresAuth && !session) {
      const redirectUrl = routeConfig.redirectTo || "/login";
      return NextResponse.redirect(new URL(redirectUrl, req.url));
    }

    // If no session but route doesn't require auth, continue
    if (!session) {
      return res;
    }

    // No need to fetch profile again, it's already loaded from cache or source
    // Check if user is active
    if (profile && !profile.is_active) {
      return NextResponse.redirect(new URL("/account-disabled", req.url));
    }

    // Check permission requirements
    if (
      routeConfig.requiredPermissions &&
      routeConfig.requiredPermissions.length > 0
    ) {
      const requiresAll = routeConfig.requiresAllPermissions !== false; // Default true
      const hasPermissions = requiresAll
        ? userHasAllPermissions(profile, routeConfig.requiredPermissions)
        : routeConfig.requiredPermissions.some((perm) =>
            userHasPermission(profile, perm)
          );

      if (!hasPermissions) {
        const redirectUrl = routeConfig.redirectTo || "/dashboard";
        return NextResponse.redirect(new URL(redirectUrl, req.url));
      }
    }

    // For API routes, return JSON response instead of redirect
    if (req.nextUrl.pathname.startsWith("/api/")) {
      // Authentication required
      if (routeConfig.requiresAuth && !session) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }

      // User not active
      if (profile && !profile.is_active) {
        return NextResponse.json(
          { error: "Account is not active" },
          { status: 403 }
        );
      }

      // Permission checks
      if (
        routeConfig.requiredPermissions &&
        routeConfig.requiredPermissions.length > 0
      ) {
        const requiresAll = routeConfig.requiresAllPermissions !== false; // Default true
        const hasPermissions = requiresAll
          ? userHasAllPermissions(profile, routeConfig.requiredPermissions)
          : routeConfig.requiredPermissions.some((perm) =>
              userHasPermission(profile, perm)
            );

        if (!hasPermissions) {
          return NextResponse.json(
            { error: "Missing required permissions" },
            { status: 403 }
          );
        }
      }
    }

    return res;
  } catch (error) {
    console.error("Middleware error:", error);

    // For API routes, return JSON error
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }

    // For regular routes, redirect to login
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: [
    // Protected pages
    "/",
    "/dashboard",
    "/dashboard/:path*",
    "/documents/:path*",
    "/lesson-plan/:path*",
    "/assays/:path*",
    "/quiz/:path*",
    "/admin/:path*",
    "/community/:path*",

    // Protected API routes
    "/api/documents/:path*",
    "/api/process-curriculum/:path*",
    "/api/admin/:path*",
  ],
};
