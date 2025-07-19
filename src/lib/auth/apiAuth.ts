import type { APIProtectionConfig, UserProfile } from "@/lib/types/auth";
import { validateAPIAccess } from "@/lib/auth/utils";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Validate API request manually (for existing API routes)
 */
export async function validateAPIRequest(
  req: NextRequest,
  config: APIProtectionConfig
): Promise<{
  success: boolean;
  user?: unknown;
  profile?: UserProfile | null;
  error?: { message: string; status: number };
}> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return {
        success: false,
        error: { message: "Server configuration error", status: 500 },
      };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    let user: unknown = null;
    let profile: UserProfile | null = null;

    // Extract token from Authorization header or cookies
    const authHeader = req.headers.get("authorization");
    let token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    // If no Bearer token, try to get from cookies (common cookie names)
    if (!token) {
      const cookieNames = [
        "sb-access-token",
        "supabase-auth-token",
        "sb-ifccsbjbihklwhlpwcnh-auth-token", // Your specific project token
      ];

      for (const cookieName of cookieNames) {
        const cookieValue = req.cookies.get(cookieName)?.value;
        if (cookieValue) {
          token = cookieValue;
          break;
        }
      }
    }

    if (token) {
      const {
        data: { user: authUser },
        error,
      } = await supabase.auth.getUser(token);

      if (!error && authUser) {
        user = authUser;

        // Use the get_user_profile_with_permissions function directly
        // (the view uses auth.uid() which doesn't work with service role tokens)
        const { data: userProfileData, error: profileError } =
          await supabase.rpc("get_user_profile_with_permissions", {
            user_id: authUser.id,
          });

        if (!profileError) {
          profile = userProfileData?.[0] as UserProfile | null;
        }
      }
    }

    const validation = validateAPIAccess(profile, config);

    if (!validation.allowed) {
      return {
        success: false,
        error: {
          message: validation.reason || "Access denied",
          status: validation.reason === "Authentication required" ? 401 : 403,
        },
      };
    }

    return { success: true, user: user || undefined, profile };
  } catch (error) {
    console.error("API validation error:", error);
    return {
      success: false,
      error: { message: "Internal server error", status: 500 },
    };
  }
}

/**
 * Quick helper to check if request is from authenticated user
 */
export async function requireAuth(req: NextRequest) {
  return validateAPIRequest(req, { requiresAuth: true });
}

/**
 * Quick helper to check if request is from admin
 */
export async function requireAdmin(req: NextRequest) {
  return validateAPIRequest(req, {
    requiresAuth: true,
    requiredPermissions: ["admin.access"],
  });
}

/**
 * Quick helper to check if request is from super admin
 */
export async function requireSuperAdmin(req: NextRequest) {
  return validateAPIRequest(req, {
    requiresAuth: true,
    requiredPermissions: ["admin.access"],
  });
}

/**
 * Create API response helper
 */
export function createAPIResponse(
  validation: Awaited<ReturnType<typeof validateAPIRequest>>
) {
  if (!validation.success && validation.error) {
    return NextResponse.json(
      { error: validation.error.message },
      { status: validation.error.status }
    );
  }
  return null;
}
