import type { UserProfile as SharedUserProfile } from "@/shared/types/auth";
import { createAuthClient } from "../client";

// Extend the shared UserProfile type with any service-specific fields
export interface UserProfile extends Omit<SharedUserProfile, "role_id"> {
  // The role_id field will be added by the database trigger
  // Include all required fields from SharedUserProfile except role_id
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  credits_remaining: number;
  xp_points: number;
  is_pro: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class UserProfileService {
  // Get user profile by ID
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const supabase = createAuthClient();
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        // If profile doesn't exist, return null instead of throwing
        if (error.code === "PGRST116") {
          console.log(`User profile not found for user: ${userId}`);
          return null;
        }
        console.error("Error fetching user profile:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  }

  // Update user profile
  static async updateUserProfile(
    userId: string,
    updates: Partial<UserProfile>
  ): Promise<{ profile?: UserProfile; error?: string }> {
    try {
      const supabase = createAuthClient();
      const { data, error } = await supabase
        .from("user_profiles")
        .update(updates)
        .eq("id", userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return { profile: data };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Profile update failed",
      };
    }
  }

  // Update credits
  static async updateCredits(
    userId: string,
    credits: number
  ): Promise<{ profile?: UserProfile; error?: string }> {
    return this.updateUserProfile(userId, { credits_remaining: credits });
  }

  // Update XP points
  static async updateXP(
    userId: string,
    xp: number
  ): Promise<{ profile?: UserProfile; error?: string }> {
    return this.updateUserProfile(userId, { xp_points: xp });
  }
}
