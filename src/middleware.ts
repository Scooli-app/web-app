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

const CACHE_DURATION = 10 * 60 * 1000; // Increased to 10 minutes
const PROFILE_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes for profiles

const sessionCache = new Map<
  string,
  { session: Session | null; timestamp: number }
>();
const profileCache = new Map<
  string,
  { profile: UserProfile | null; timestamp: number }
>();

function getSessionCacheKey(req: NextRequest): string {
  const sessionToken = req.cookies.get("sb-access-token")?.value || "anonymous";
  return `session-${sessionToken}`;
}

function getProfileCacheKey(userId: string): string {
  return `profile-${userId}`;
}

function getCachedSession(req: NextRequest): Session | null {
  const key = getSessionCacheKey(req);
  const cached = sessionCache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.session;
  }
  return null;
}

function setCachedSession(req: NextRequest, session: Session | null) {
  const key = getSessionCacheKey(req);
  sessionCache.set(key, { session, timestamp: Date.now() });
}

function getCachedProfile(userId: string): UserProfile | null {
  const key = getProfileCacheKey(userId);
  const cached = profileCache.get(key);

  if (cached && Date.now() - cached.timestamp < PROFILE_CACHE_DURATION) {
    return cached.profile;
  }
  return null;
}

function setCachedProfile(userId: string, profile: UserProfile | null) {
  const key = getProfileCacheKey(userId);
  profileCache.set(key, { profile, timestamp: Date.now() });
}

async function fetchSession(
  req: NextRequest,
  res: NextResponse
): Promise<Session | null> {
  const cacheKey = getSessionCacheKey(req);

  const requestPromise = async (): Promise<Session | null> => {
    const supabase = createMiddlewareClient({ req, res });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session;
    } catch (authError: unknown) {
      if (isRefreshTokenError(authError)) {
        sessionCache.delete(cacheKey);
        clearAuthCookies(res);
        return null;
      }
      throw authError;
    }
  };

  const promise = requestPromise();
  return await promise;
}

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return null;
    }

    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: userProfileData, error } = await serviceSupabase.rpc(
      "get_user_profile_with_permissions",
      { user_id: userId }
    );

    if (error) {
      return null;
    }

    return (userProfileData?.[0] as UserProfile | null) ?? null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  const res = NextResponse.next();

  if (!isProtectedRoute(req.nextUrl.pathname)) {
    return res;
  }

  const routeConfig = getRouteConfig(req.nextUrl.pathname);
  if (!routeConfig) {
    return res;
  }

  try {
    let session = getCachedSession(req);

    if (!session) {
      session = await fetchSession(req, res);
      if (session) {
        setCachedSession(req, session);
      }
    }

    if (routeConfig.requiresAuth && !session) {
      const redirectUrl = routeConfig.redirectTo || "/login";
      return NextResponse.redirect(new URL(redirectUrl, req.url));
    }

    if (!session) {
      return res;
    }

    let profile: UserProfile | null = null;

    if (
      routeConfig.requiredPermissions?.length ||
      req.nextUrl.pathname.startsWith("/api/")
    ) {
      profile = getCachedProfile(session.user.id);

      if (!profile) {
        profile = await fetchProfile(session.user.id);
        if (profile) {
          setCachedProfile(session.user.id, profile);
        }
      }

      if (profile && !profile.is_active) {
        return req.nextUrl.pathname.startsWith("/api/")
          ? NextResponse.json(
              { error: "Account is not active" },
              { status: 403 }
            )
          : NextResponse.redirect(new URL("/account-disabled", req.url));
      }

      if (routeConfig.requiredPermissions?.length) {
        const requiresAll = routeConfig.requiresAllPermissions !== false;
        const hasPermissions = requiresAll
          ? userHasAllPermissions(profile, routeConfig.requiredPermissions)
          : routeConfig.requiredPermissions.some((perm) =>
              userHasPermission(profile, perm)
            );

        if (!hasPermissions) {
          const redirectUrl = routeConfig.redirectTo || "/dashboard";
          return req.nextUrl.pathname.startsWith("/api/")
            ? NextResponse.json(
                { error: "Missing required permissions" },
                { status: 403 }
              )
            : NextResponse.redirect(new URL(redirectUrl, req.url));
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

  for (const [key, cached] of sessionCache.entries()) {
    if (now - cached.timestamp > CACHE_DURATION) {
      sessionCache.delete(key);
    }
  }

  for (const [key, cached] of profileCache.entries()) {
    if (now - cached.timestamp > PROFILE_CACHE_DURATION) {
      profileCache.delete(key);
    }
  }
}, CACHE_DURATION);

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
    "/api/process-curriculum/:path*",
    "/api/admin/:path*",
  ],
};
