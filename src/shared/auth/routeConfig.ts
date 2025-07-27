import type { RouteConfig } from "@/shared/types/auth";

/**
 * Route protection configuration
 * Define all protected routes and their requirements here
 */
export const ROUTE_CONFIGS: RouteConfig[] = [
  // Authentication required routes
  {
    path: "/dashboard",
    requiresAuth: true,
    redirectTo: "/login",
  },
  {
    path: "/documents",
    requiresAuth: true,
    requiredPermissions: ["documents.read"],
    redirectTo: "/login",
  },
  {
    path: "/lesson-plan",
    requiresAuth: true,
    requiredPermissions: ["documents.create", "documents.edit"],
    redirectTo: "/login",
  },
  {
    path: "/test",
    requiresAuth: true,
    requiredPermissions: ["documents.create", "documents.edit"],
    redirectTo: "/login",
  },
  {
    path: "/quiz",
    requiresAuth: true,
    requiredPermissions: ["documents.create", "documents.edit"],
    redirectTo: "/login",
  },

  // Admin routes
  {
    path: "/admin",
    requiresAuth: true,
    requiredPermissions: ["admin.access"],
    redirectTo: "/dashboard",
  },

  // Community moderation routes
  {
    path: "/community/moderate",
    requiresAuth: true,
    requiredPermissions: ["community.moderate"],
    redirectTo: "/dashboard",
  },

  // API routes protection
  {
    path: "/api/documents",
    requiresAuth: true,
    requiredPermissions: ["documents.read"],
  },
  {
    path: "/api/process-curriculum",
    requiresAuth: true,
    requiredPermissions: ["admin.access"],
  },
  {
    path: "/api/admin",
    requiresAuth: true,
    requiredPermissions: ["admin.access"],
  },
];

/**
 * Get route configuration for a given path
 */
export function getRouteConfig(pathname: string): RouteConfig | null {
  // Find exact match first
  const exactMatch = ROUTE_CONFIGS.find((config) => config.path === pathname);
  if (exactMatch) {
    return exactMatch;
  }

  // Find prefix match for dynamic routes
  const prefixMatch = ROUTE_CONFIGS.find(
    (config) =>
      pathname.startsWith(config.path) &&
      (config.path.endsWith("/") || pathname.charAt(config.path.length) === "/")
  );

  return prefixMatch || null;
}

/**
 * Check if a path requires protection
 */
export function isProtectedRoute(pathname: string): boolean {
  return getRouteConfig(pathname) !== null;
}

/**
 * Get redirect URL for a protected route
 */
export function getRedirectUrl(pathname: string): string {
  const config = getRouteConfig(pathname);
  return config?.redirectTo || "/login";
}
