import type { User } from "@/lib/types";
import {
  AuthInitService,
  type AuthState as AuthStateData,
} from "@/services/api/auth-init.service";
import { AuthService } from "@/services/api/auth.service";
import {
  UserProfileService,
  type UserProfile,
} from "@/services/api/user-profile.service";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

interface AuthState {
  // State
  user: User | null;
  profile: UserProfile | null;
  session: unknown | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;

  // Actions
  initializeAuth: () => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  getUserProfile: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setSession: (session: unknown) => void;
  setAuthState: (state: AuthStateData) => void;
}

export const useAuthStore = create<AuthState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    user: null,
    profile: null,
    session: null,
    isLoading: false,
    error: null,
    isAuthenticated: false,
    isInitialized: false,

    // Actions
    initializeAuth: async () => {
      set({ isLoading: true });
      try {
        await AuthInitService.initializeAuth((state) => {
          set({
            user: state.user,
            profile: state.profile,
            session: state.session,
            isAuthenticated: state.isAuthenticated,
            isLoading: false,
            isInitialized: true,
          });
        });
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to initialize auth",
          isLoading: false,
          isInitialized: true,
        });
      }
    },

    signUp: async (email: string, password: string, name?: string) => {
      set({ isLoading: true, error: null });

      try {
        const result = await AuthService.signUp({ email, password, name });

        if (result.error) {
          set({ error: result.error, isLoading: false });
          return;
        }

        set({
          user: result.user,
          session: result.session,
          isAuthenticated: !!result.user,
          isLoading: false,
        });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : "Sign up failed",
          isLoading: false,
        });
      }
    },

    signIn: async (email: string, password: string) => {
      set({ isLoading: true, error: null });

      try {
        const result = await AuthService.signIn({ email, password });

        if (result.error) {
          set({ error: result.error, isLoading: false });
          return;
        }

        set({
          user: result.user,
          session: result.session,
          isAuthenticated: !!result.user,
          isLoading: false,
        });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : "Sign in failed",
          isLoading: false,
        });
      }
    },

    signOut: async () => {
      set({ isLoading: true, error: null });

      try {
        const result = await AuthService.signOut();

        if (result.error) {
          set({ error: result.error, isLoading: false });
          return;
        }

        set({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
        });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : "Sign out failed",
          isLoading: false,
        });
      }
    },

    getUserProfile: async () => {
      const { user } = get();
      if (!user) {
        set({ error: "No user logged in" });
        return;
      }

      set({ isLoading: true, error: null });

      try {
        const profile = await UserProfileService.getUserProfile(user.id);
        set({ profile, isLoading: false });
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to get user profile",
          isLoading: false,
        });
      }
    },

    updateProfile: async (updates: Partial<User>) => {
      const { user } = get();
      if (!user) {
        set({ error: "No user logged in" });
        return;
      }

      set({ isLoading: true, error: null });

      try {
        const result = await AuthService.updateProfile(user.id, updates);

        if (result.error) {
          set({ error: result.error, isLoading: false });
          return;
        }

        if (result.user) {
          set({
            user: result.user,
            isLoading: false,
          });
        }
      } catch (error) {
        set({
          error:
            error instanceof Error ? error.message : "Profile update failed",
          isLoading: false,
        });
      }
    },

    updateUserProfile: async (updates: Partial<UserProfile>) => {
      const { profile } = get();
      if (!profile) {
        set({ error: "No user profile found" });
        return;
      }

      set({ isLoading: true, error: null });

      try {
        const result = await UserProfileService.updateUserProfile(
          profile.id,
          updates
        );

        if (result.error) {
          set({ error: result.error, isLoading: false });
          return;
        }

        if (result.profile) {
          set({
            profile: result.profile,
            isLoading: false,
          });
        }
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : "User profile update failed",
          isLoading: false,
        });
      }
    },

    resetPassword: async (email: string) => {
      set({ isLoading: true, error: null });

      try {
        const result = await AuthService.resetPassword(email);

        if (result.error) {
          set({ error: result.error, isLoading: false });
          return;
        }

        set({ isLoading: false });
      } catch (error) {
        set({
          error:
            error instanceof Error ? error.message : "Password reset failed",
          isLoading: false,
        });
      }
    },

    clearError: () => {
      set({ error: null });
    },

    setUser: (user: User | null) => {
      set({
        user,
        isAuthenticated: !!user,
      });
    },

    setProfile: (profile: UserProfile | null) => {
      set({ profile });
    },

    setSession: (session: unknown) => {
      set({ session });
    },

    setAuthState: (state: AuthStateData) => {
      set({
        user: state.user,
        profile: state.profile,
        session: state.session,
        isAuthenticated: !!state.user,
        isInitialized: true,
      });
    },
  }))
);
