/**
 * Basic user type for the application
 */
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  role: "teacher" | "curator" | "admin" | "super_admin";
  credits: number;
  created_at: string;
  updated_at: string;
}

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
 * User role type for role checking
 */
export type UserRole = "teacher" | "curator" | "admin" | "super_admin";

/**
 * Extended user profile with role and permissions
 */
export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role_name: string;
  role_id?: string;
  credits_remaining: number;
  xp_points: number;
  is_pro: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  permissions?: string[];
}

/**
 * Auth context data
 */
export interface AuthContext {
  user: User | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
}

/**
 * Route protection configuration
 */
export interface RouteConfig {
  path: string;
  requiresAuth: boolean;
  requiredPermissions?: string[];
  redirectTo?: string;
  requiresAllPermissions?: boolean;
}

/**
 * API protection configuration
 */
export interface APIProtectionConfig {
  requiresAuth: boolean;
  allowedEmails?: string[];
  requiredPermissions?: string[];
  requiresAllPermissions?: boolean;
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
  USERS_BASIC: ["users.read"],
  USERS_FULL: ["users.read", "users.edit", "users.roles", "users.delete"],
} as const;
