import { getRouteConfig, isProtectedRoute } from "@/shared/auth/routeConfig";
import {
  clearAuthCookies,
  isRefreshTokenError,
  userHasAllPermissions,
  userHasPermission,
} from "@/shared/auth/utils";
import type { UserProfile } from "@/shared/types/auth";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { createClient, type Session } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

const CACHE_DURATION = 5 * 60 * 1000;

const authCache = new Map<
  string,
  { session: Session | null; profile: UserProfile | null; timestamp: number }
>();

const pendingRequests = new Map<
  string,
  Promise<{ session: Session | null; profile: UserProfile | null }>
>();

function getCacheKey(req: NextRequest): string {
  const sessionToken =
    req.cookies.get("sb-access-token")?.value ||
    req.cookies.get("supabase-auth-token")?.value ||
    "anonymous";
  const pathname = req.nextUrl.pathname;

  return `${sessionToken}-${pathname}`;
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

async function fetchAuthData(
  req: NextRequest,
  res: NextResponse
): Promise<{
  session: Session | null;
  profile: UserProfile | null;
}> {
  const cacheKey = getCacheKey(req);

  if (pendingRequests.has(cacheKey)) {
    return await pendingRequests.get(cacheKey)!;
  }

  const requestPromise = async (): Promise<{
    session: Session | null;
    profile: UserProfile | null;
  }> => {
    let session: Session | null = null;
    let profile: UserProfile | null = null;

    try {
      const supabase = createMiddlewareClient({ req, res });

      try {
        const {
          data: { session: newSession },
        } = await supabase.auth.getSession();
        session = newSession;
      } catch (authError: unknown) {
        if (isRefreshTokenError(authError)) {
          authCache.delete(cacheKey);
          session = null;
          profile = null;
          clearAuthCookies(res);

          return { session, profile };
        } else {
          throw authError;
        }
      }

      // If a session exists, fetch the user profile (with reduced frequency)
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
              profile = null;
            } else {
              profile = (userProfileData?.[0] as UserProfile | null) ?? null;
            }
          }
        } catch {
          profile = null;
        }
      }

      return { session, profile };
    } finally {
      // Remove from pending requests
      pendingRequests.delete(cacheKey);
    }
  };

  // Store the promise and execute it
  const promise = requestPromise();
  pendingRequests.set(cacheKey, promise);

  return await promise;
}

export async function middleware(req: NextRequest) {
  // Handle root redirect FIRST
  if (req.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  const res = NextResponse.next();

  // Skip non-protected routes early to avoid unnecessary processing
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
    if (!session && !profile) {
      const authData = await fetchAuthData(req, res);
      session = authData.session;
      profile = authData.profile;

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
  } catch {
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }

    return NextResponse.redirect(new URL("/login", req.url));
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [key, cached] of authCache.entries()) {
    if (now - cached.timestamp > CACHE_DURATION) {
      authCache.delete(key);
    }
  }
}, CACHE_DURATION);

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
