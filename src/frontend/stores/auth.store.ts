import type { User } from "@/shared/types";
import type { UserProfile } from "@/shared/types/auth";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  session: unknown | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;

  initializeAuth: () => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setSession: (session: unknown) => void;
}

export const useAuthStore = create<AuthState>()(
  subscribeWithSelector((set, get) => ({
    user: null,
    profile: null,
    session: null,
    isLoading: false,
    error: null,
    isAuthenticated: false,
    isInitialized: false,

    initializeAuth: async () => {
      set({ isLoading: true });
      try {
        const response = await fetch("/api/auth/session");
        const data = await response.json();

        if (response.ok && data.user) {
          set({
            user: data.user,
            profile: data.profile,
            session: data.session,
            isAuthenticated: true,
            isLoading: false,
            isInitialized: true,
          });
        } else {
          set({
            user: null,
            profile: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
            isInitialized: true,
          });
        }
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
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });

        const data = await response.json();

        if (!response.ok) {
          set({ error: data.error || "Sign up failed", isLoading: false });
          return;
        }

        set({
          user: data.user,
          session: data.session,
          isAuthenticated: !!data.user,
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
        const response = await fetch("/api/auth/signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          set({ error: data.error || "Sign in failed", isLoading: false });
          return;
        }

        await get().initializeAuth();
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
        const response = await fetch("/api/auth/signout", {
          method: "POST",
        });

        if (!response.ok) {
          const data = await response.json();
          set({ error: data.error || "Sign out failed", isLoading: false });
          return;
        }

        set({
          user: null,
          profile: null,
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
  }))
);
