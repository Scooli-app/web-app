import type { UserProfile, UserRole } from "@/lib/types/auth";
import { createClient } from "@supabase/supabase-js";

/**
 * Role management utilities
 */
export class RoleManager {
  private supabase;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration for RoleManager");
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Update user role
   */
  async updateUserRole(
    userId: string,
    newRole: UserRole
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from("user_profiles")
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq("id", userId);

      if (error) {
        console.error("Error updating user role:", error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error("Error updating user role:", error);
      return { success: false, error: "Failed to update user role" };
    }
  }

  /**
   * Activate/deactivate user account
   */
  async setUserActive(
    userId: string,
    isActive: boolean
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from("user_profiles")
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq("id", userId);

      if (error) {
        console.error("Error updating user status:", error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error("Error updating user status:", error);
      return { success: false, error: "Failed to update user status" };
    }
  }

  /**
   * Get all users with their roles
   */
  async getAllUsers(): Promise<{
    success: boolean;
    users?: UserProfile[];
    error?: string;
  }> {
    try {
      const { data: users, error } = await this.supabase
        .from("user_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching users:", error);
        return { success: false, error: error.message };
      }

      return { success: true, users: users as UserProfile[] };
    } catch (error) {
      console.error("Error fetching users:", error);
      return { success: false, error: "Failed to fetch users" };
    }
  }

  /**
   * Get users by role
   */
  async getUsersByRole(
    role: UserRole
  ): Promise<{ success: boolean; users?: UserProfile[]; error?: string }> {
    try {
      const { data: users, error } = await this.supabase
        .from("user_profiles")
        .select("*")
        .eq("role", role)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching users by role:", error);
        return { success: false, error: error.message };
      }

      return { success: true, users: users as UserProfile[] };
    } catch (error) {
      console.error("Error fetching users by role:", error);
      return { success: false, error: "Failed to fetch users by role" };
    }
  }

  /**
   * Promote user to curator (requires admin+)
   */
  async promoteToGenerator(
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.updateUserRole(userId, "curator");
  }

  /**
   * Demote curator to teacher
   */
  async demoteToTeacher(
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.updateUserRole(userId, "teacher");
  }

  /**
   * Grant admin privileges
   */
  async grantAdminRole(
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.updateUserRole(userId, "admin");
  }

  /**
   * Revoke admin privileges (downgrade to teacher)
   */
  async revokeAdminRole(
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.updateUserRole(userId, "teacher");
  }

  /**
   * Create initial admin user (should only be called during setup)
   */
  async createInitialAdmin(
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Update their profile to admin
      const { error } = await this.supabase
        .from("user_profiles")
        .update({
          role: "super_admin",
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) {
        console.error("Error creating initial admin:", error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error("Error creating initial admin:", error);
      return { success: false, error: "Failed to create initial admin" };
    }
  }

  /**
   * Check if user can perform role management actions
   */
  canManageRoles(currentUserRole: UserRole, targetRole: UserRole): boolean {
    const roleHierarchy: Record<UserRole, number> = {
      teacher: 1,
      curator: 2,
      admin: 3,
      super_admin: 4,
    };

    const currentLevel = roleHierarchy[currentUserRole];
    const targetLevel = roleHierarchy[targetRole];

    // Can only manage users with lower or equal hierarchy level
    // Super admins can manage everyone
    return currentUserRole === "super_admin" || currentLevel > targetLevel;
  }
}

/**
 * Singleton instance
 */
export const roleManager = new RoleManager();
