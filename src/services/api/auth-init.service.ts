import { AuthService } from "./auth.service";
import { UserProfileService, type UserProfile } from "./user-profile.service";
import type { User } from "@/types";

export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  session: unknown | null;
  isAuthenticated: boolean;
}

export class AuthInitService {
  private static authSubscription: { unsubscribe: () => void } | null = null;

  // Initialize auth state and listen for changes
  static async initializeAuth(
    onAuthChange: (state: AuthState) => void
  ): Promise<void> {
    try {
      // Initialize auth and get subscription
      const subscription = await AuthService.initializeAuth(
        async (user: User | null, session: unknown) => {
          let profile: UserProfile | null = null;

          if (user) {
            // Fetch user profile
            profile = await UserProfileService.getUserProfile(user.id);
            // If profile doesn't exist, we'll continue with null profile
            // The user will still be authenticated but without profile data
          }

          const state: AuthState = {
            user,
            profile,
            session,
            isAuthenticated: !!user,
          };

          onAuthChange(state);
        }
      );

      this.authSubscription = subscription;
    } catch (error) {
      console.error("Error initializing auth:", error);
      onAuthChange({
        user: null,
        profile: null,
        session: null,
        isAuthenticated: false,
      });
    }
  }

  // Cleanup auth subscription
  static cleanup(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
      this.authSubscription = null;
    }
  }

  // Refresh user profile
  static async refreshUserProfile(userId: string): Promise<UserProfile | null> {
    return await UserProfileService.getUserProfile(userId);
  }
}
