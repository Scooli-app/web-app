import type { RouteConfig } from "@/shared/types/auth";
import { APIRoutes, Routes } from "../types/routes";

/**
 * Route protection configuration
 * Define all protected routes and their requirements here
 */
export const ROUTE_CONFIGS: RouteConfig[] = [
  // Authentication required routes
  {
    path: Routes.DASHBOARD,
    requiresAuth: true,
    redirectTo: Routes.LOGIN,
  },
  {
    path: Routes.DOCUMENTS,
    requiresAuth: true,
    requiredPermissions: ["documents.read"],
    redirectTo: Routes.LOGIN,
  },
  {
    path: Routes.LESSON_PLAN,
    requiresAuth: true,
    requiredPermissions: ["documents.create", "documents.edit"],
    redirectTo: Routes.LOGIN,
  },
  {
    path: Routes.ASSAYS,
    requiresAuth: true,
    requiredPermissions: ["documents.create", "documents.edit"],
    redirectTo: Routes.LOGIN,
  },
  {
    path: Routes.QUIZ,
    requiresAuth: true,
    requiredPermissions: ["documents.create", "documents.edit"],
    redirectTo: Routes.LOGIN,
  },

  // Admin routes
  {
    path: Routes.ADMIN,
    requiresAuth: true,
    requiredPermissions: ["admin.access"],
    redirectTo: Routes.DASHBOARD,
  },

  // Community moderation routes
  {
    path: Routes.COMMUNITY_MODERATE,
    requiresAuth: true,
    requiredPermissions: ["community.moderate"],
    redirectTo: Routes.DASHBOARD,
  },

  // API routes protection
  {
    path: APIRoutes.DOCUMENTS,
    requiresAuth: true,
    requiredPermissions: ["documents.read"],
  },
  {
    path: APIRoutes.PROCESS_CURRICULUM,
    requiresAuth: true,
    requiredPermissions: ["admin.access"],
  },
  {
    path: APIRoutes.ADMIN,
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
  return config?.redirectTo || Routes.LOGIN;
}
