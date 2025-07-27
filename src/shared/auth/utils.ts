import type { APIProtectionConfig, UserProfile } from "@/lib/types/auth";
import {
  createServerComponentClient,
  type User,
} from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

/**
 * Check if user has specific permission
 */
export function userHasPermission(
  profile: UserProfile | null,
  permission: string
): boolean {
  if (!profile || !profile.is_active) {
    return false;
  }
  return profile.permissions?.includes(permission) ?? false;
}

/**
 * Check if user has any of the specified permissions
 */
export function userHasAnyPermission(
  profile: UserProfile | null,
  permissions: string[]
): boolean {
  if (!profile || !profile.is_active || !permissions.length) {
    return false;
  }
  return permissions.some((permission) =>
    profile.permissions?.includes(permission)
  );
}

/**
 * Check if user has all of the specified permissions
 */
export function userHasAllPermissions(
  profile: UserProfile | null,
  permissions: string[]
): boolean {
  if (!profile || !profile.is_active || !permissions.length) {
    return false;
  }
  return permissions.every((permission) =>
    profile.permissions?.includes(permission)
  );
}

/**
 * Check if user has specific role
 */
export function userHasRole(
  profile: UserProfile | null,
  role:
    | "teacher"
    | "curator"
    | "admin"
    | "super_admin"
    | ("teacher" | "curator" | "admin" | "super_admin")[]
): boolean {
  if (!profile || !profile.is_active) {
    return false;
  }

  const userRole = profile.role_name as
    | "teacher"
    | "curator"
    | "admin"
    | "super_admin";

  if (Array.isArray(role)) {
    return role.includes(userRole);
  }

  return userRole === role;
}

/**
 * Get user session and profile with permissions for server components
 */
export async function getServerAuth(): Promise<{
  user: User | null;
  profile: UserProfile | null;
}> {
  try {
    const supabase = createServerComponentClient({ cookies });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { user: null, profile: null };
    }

    // Get user profile with permissions using the view
    const { data: profile } = await supabase
      .from("user_with_permissions")
      .select("*")
      .eq("id", user.id)
      .single();

    return { user, profile: profile as UserProfile | null };
  } catch (error) {
    console.error("Error getting server auth:", error);
    return { user: null, profile: null };
  }
}

/**
 * Get user session for middleware
 */
export async function getMiddlewareAuth(req: NextRequest): Promise<{
  user: User | null;
  profile: UserProfile | null;
}> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get session from request headers/cookies
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("sb-access-token")?.value;

    if (!token) {
      return { user: null, profile: null };
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return { user: null, profile: null };
    }

    // Get user profile with permissions
    const { data: profile } = await supabase
      .from("user_with_permissions")
      .select("*")
      .eq("id", user.id)
      .single();

    return { user, profile: profile as UserProfile | null };
  } catch (error) {
    console.error("Error getting middleware auth:", error);
    return { user: null, profile: null };
  }
}

/**
 * Validate API access based on configuration
 */
export function validateAPIAccess(
  profile: UserProfile | null,
  config: APIProtectionConfig
): { allowed: boolean; reason?: string } {
  // Check if authentication is required
  if (config.requiresAuth && !profile) {
    return { allowed: false, reason: "Authentication required" };
  }

  // Check if user is active
  if (profile && !profile.is_active) {
    return { allowed: false, reason: "Account is not active" };
  }

  // Check specific email allowlist
  if (config.allowedEmails && config.allowedEmails.length > 0) {
    if (!profile || !config.allowedEmails.includes(profile.email)) {
      return { allowed: false, reason: "Email not in allowlist" };
    }
  }

  // Check required permissions
  if (
    config.requiredPermissions &&
    config.requiredPermissions.length > 0 &&
    profile
  ) {
    const requiresAll = config.requiresAllPermissions !== false; // Default true

    if (requiresAll) {
      // User must have ALL permissions
      if (
        !userHasAllPermissions(profile, Array.from(config.requiredPermissions))
      ) {
        const missingPermissions = config.requiredPermissions.filter(
          (perm) => !userHasPermission(profile, perm)
        );
        return {
          allowed: false,
          reason: `Missing permissions: ${missingPermissions.join(", ")}`,
        };
      }
    } else {
      // User must have ANY of the permissions
      if (
        !userHasAnyPermission(profile, Array.from(config.requiredPermissions))
      ) {
        return {
          allowed: false,
          reason: `Missing any of required permissions: ${config.requiredPermissions.join(
            ", "
          )}`,
        };
      }
    }
  }

  return { allowed: true };
}

/**
 * Fetch all permissions from database (for app initialization)
 */
export async function fetchAllPermissions() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase.rpc("get_all_permissions");

    if (error) {
      console.error("Error fetching permissions:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return [];
  }
}

/**
 * Common API protection configurations
 */
export const API_CONFIGS = {
  // Standard user operations
  USER_DOCUMENTS: {
    requiresAuth: true,
    requiredPermissions: ["documents.read"],
  },

  // Document creation
  CREATE_DOCUMENTS: {
    requiresAuth: true,
    requiredPermissions: ["documents.create"],
  },

  // Document editing
  EDIT_DOCUMENTS: {
    requiresAuth: true,
    requiredPermissions: ["documents.edit"],
  },

  // Document deletion
  DELETE_DOCUMENTS: {
    requiresAuth: true,
    requiredPermissions: ["documents.delete"],
  },

  // Admin operations
  ADMIN_ONLY: {
    requiresAuth: true,
    requiredPermissions: ["admin.access"],
  },

  // User management
  USER_MANAGEMENT: {
    requiresAuth: true,
    requiredPermissions: ["admin.users.edit"],
  },

  // Curriculum processing (super restricted)
  CURRICULUM_PROCESSING: {
    requiresAuth: true,
    requiredPermissions: ["curriculum.process"],
    allowedEmails: [
      "admin@scooli.app",
      // Add other specific emails that can process curriculum
    ],
  },

  // Community moderation
  COMMUNITY_MODERATION: {
    requiresAuth: true,
    requiredPermissions: ["community.moderate"],
  },

  // AI generation
  AI_GENERATION: {
    requiresAuth: true,
    requiredPermissions: ["ai.generate"],
  },

  // Advanced AI features
  AI_ADVANCED: {
    requiresAuth: true,
    requiredPermissions: ["ai.advanced"],
  },
} as const;
