import { getRouteConfig, isProtectedRoute } from "@/lib/auth/routeConfig";
import { userHasPermission, userHasAllPermissions } from "@/lib/auth/utils";
import type { UserProfile } from "@/lib/types/auth";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function middleware(req: NextRequest) {
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

  // Handle root redirect
  if (req.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  try {
    // Get user session
    const supabase = createMiddlewareClient({ req, res });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Check authentication requirement
    if (routeConfig.requiresAuth && !session) {
      const redirectUrl = routeConfig.redirectTo || "/login";
      return NextResponse.redirect(new URL(redirectUrl, req.url));
    }

    // If no session but route doesn't require auth, continue
    if (!session) {
      return res;
    }

    // Get user profile with permissions using service role
    let profile: UserProfile | null = null;
    if (session.user) {
      try {
        // Use service role to call the function directly
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (supabaseUrl && supabaseServiceKey) {
          const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);
          const { data: userProfileData, error } = await serviceSupabase.rpc(
            "get_user_profile_with_permissions",
            { user_id: session.user.id }
          );

          if (error) {
            console.error("[Middleware] Error fetching user profile:", error);
          } else {
            profile = userProfileData?.[0] as UserProfile | null;
          }
        }
      } catch (error) {
        console.error("[Middleware] Error getting user profile:", error);
      }
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
    "/dashboard/:path*",
    "/documents/:path*",
    "/lesson-plan/:path*",
    "/admin/:path*",
    "/community/:path*",

    // Protected API routes
    "/api/documents/:path*",
    "/api/process-curriculum/:path*",
    "/api/admin/:path*",
  ],
};
