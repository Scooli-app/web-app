import type { User } from "@supabase/auth-helpers-nextjs";

/**
 * Permission - granular actions users can perform
 */
export interface Permission {
  id: number;
  name: string;
  description?: string;
  category: string;
}

/**
 * Role - collection of permissions
 */
export interface Role {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  is_system_role: boolean;
  hierarchy_level: number;
  permissions?: string[]; // Array of permission names
}

/**
 * Extended user profile with role and permissions
 */
export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role_id: number;
  credits_remaining: number;
  xp_points: number;
  is_pro: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Extended fields from views/joins
  role_name?: string;
  role_display_name?: string;
  hierarchy_level?: number;
  permissions?: string[];
}

/**
 * Auth context data
 */
export interface AuthContext {
  user: User | null;
  profile: UserProfile | null;
  permissions: string[];
  loading: boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  isAuthenticated: boolean;
}

/**
 * Route protection configuration
 */
export interface RouteConfig {
  path: string;
  requiresAuth?: boolean;
  requiredPermissions?: string[]; // Array of permission names
  requiresAllPermissions?: boolean; // Default true - requires ALL permissions
  redirectTo?: string;
}

/**
 * API protection configuration
 */
export interface APIProtectionConfig {
  requiresAuth?: boolean;
  requiredPermissions?: readonly string[];
  requiresAllPermissions?: boolean; // Default true
  allowedEmails?: readonly string[]; // For specific account access
}

/**
 * Permission categories for organization
 */
export type PermissionCategory =
  | "documents"
  | "community"
  | "admin"
  | "curriculum"
  | "ai"
  | "general";

/**
 * Common permission groups for easy reference
 */
export const PERMISSION_GROUPS = {
  DOCUMENTS_BASIC: ["documents.read", "documents.create", "documents.edit"],
  DOCUMENTS_FULL: [
    "documents.read",
    "documents.create",
    "documents.edit",
    "documents.delete",
    "documents.share",
  ],
  COMMUNITY_BASIC: ["community.access", "community.post", "community.comment"],
  COMMUNITY_MODERATE: [
    "community.access",
    "community.post",
    "community.comment",
    "community.moderate",
    "community.curate",
  ],
  ADMIN_BASIC: ["admin.access", "admin.users.view"],
  ADMIN_FULL: [
    "admin.access",
    "admin.users.view",
    "admin.users.edit",
    "admin.users.roles",
    "admin.analytics",
    "admin.system",
  ],
  AI_BASIC: ["ai.generate"],
  AI_ADVANCED: ["ai.generate", "ai.advanced", "ai.unlimited"],
} as const;
