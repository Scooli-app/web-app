import { createAuthClient } from "./client";

export interface CreditCheckResult {
  canGenerate: boolean;
  reason?: string;
  creditsRequired?: number;
  creditsRemaining?: number;
  isPro?: boolean;
}

export interface CreditDeductionResult {
  success: boolean;
  error?: string;
  newCreditsRemaining?: number;
}

export interface CreditStatus {
  creditsRemaining: number;
  isPro: boolean;
  hasUnlimitedGeneration: boolean;
}

export class CreditService {
  /**
   * Check if user can generate content and deduct credits if needed
   * Uses database function for atomic operation
   */
  static async checkAndDeductCredits(
    userId: string,
    creditsRequired: number = 1
  ): Promise<CreditCheckResult> {
    try {
      const supabase = createAuthClient();
      const { data, error } = await supabase.rpc("check_and_deduct_credits", {
        user_id: userId,
        credits_required: creditsRequired,
      });

      if (error) {
        console.error("Error checking/deducting credits:", error);
        return {
          canGenerate: false,
          reason: "Database error",
        };
      }

      if (!data || data.length === 0) {
        return {
          canGenerate: false,
          reason: "No data returned",
        };
      }

      const result = data[0];
      return {
        canGenerate: result.can_generate,
        reason: result.reason,
        creditsRequired,
        creditsRemaining: result.credits_remaining,
        isPro: result.is_pro,
      };
    } catch (error) {
      console.error("Error in checkAndDeductCredits:", error);
      return {
        canGenerate: false,
        reason: "Service error",
      };
    }
  }

  /**
   * Add credits to user (for community contributions)
   */
  static async addCredits(
    userId: string,
    creditsToAdd: number
  ): Promise<CreditDeductionResult> {
    try {
      const supabase = createAuthClient();
      const { data, error } = await supabase.rpc("add_user_credits", {
        user_id: userId,
        credits_to_add: creditsToAdd,
      });

      if (error) {
        console.error("Error adding credits:", error);
        return {
          success: false,
          error: "Database error",
        };
      }

      if (!data || data.length === 0) {
        return {
          success: false,
          error: "No data returned",
        };
      }

      const result = data[0];
      return {
        success: result.success,
        error: result.error_message || undefined,
        newCreditsRemaining: result.new_credits_remaining,
      };
    } catch (error) {
      console.error("Error in addCredits:", error);
      return {
        success: false,
        error: "Service error",
      };
    }
  }

  /**
   * Get user's credit status and Pro information
   */
  static async getCreditStatus(userId: string): Promise<CreditStatus | null> {
    try {
      const supabase = createAuthClient();
      const { data, error } = await supabase.rpc("get_user_credit_status", {
        user_id: userId,
      });

      if (error) {
        console.error("Error getting credit status:", error);
        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

      const result = data[0];
      return {
        creditsRemaining: result.credits_remaining,
        isPro: result.is_pro,
        hasUnlimitedGeneration: result.has_unlimited_generation,
      };
    } catch (error) {
      console.error("Error in getCreditStatus:", error);
      return null;
    }
  }

  /**
   * Update user's Pro status (for subscription management)
   */
  static async updateProStatus(
    userId: string,
    isPro: boolean
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createAuthClient();
      const { data, error } = await supabase.rpc("update_user_pro_status", {
        user_id: userId,
        is_pro: isPro,
      });

      if (error) {
        console.error("Error updating Pro status:", error);
        return {
          success: false,
          error: "Database error",
        };
      }

      if (!data || data.length === 0) {
        return {
          success: false,
          error: "No data returned",
        };
      }

      const result = data[0];
      return {
        success: result.success,
        error: result.error_message || undefined,
      };
    } catch (error) {
      console.error("Error in updateProStatus:", error);
      return {
        success: false,
        error: "Service error",
      };
    }
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use checkAndDeductCredits instead
   */
  static async canGenerateContent(
    userId: string,
    creditsRequired: number = 1
  ): Promise<CreditCheckResult> {
    return this.checkAndDeductCredits(userId, creditsRequired);
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use checkAndDeductCredits instead
   */
  static async deductCredits(
    userId: string,
    creditsToDeduct: number = 1
  ): Promise<CreditDeductionResult> {
    const result = await this.checkAndDeductCredits(userId, creditsToDeduct);

    return {
      success: result.canGenerate,
      error: result.canGenerate ? undefined : result.reason,
      newCreditsRemaining: result.creditsRemaining,
    };
  }
}
