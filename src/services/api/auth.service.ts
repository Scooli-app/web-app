import { supabase, createAuthClient } from "./client";
import type { User } from "@/types";

export interface AuthResponse {
  user: User | null;
  session: unknown;
  error?: string;
}

export interface SignUpData {
  email: string;
  password: string;
  name?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export class AuthService {
  // Sign up with email and password
  static async signUp(data: SignUpData): Promise<AuthResponse> {
    try {
      const authClient = createAuthClient();
      const { data: authData, error } = await authClient.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
          },
        },
      });

      if (error) {
        throw error;
      }

      return {
        user: authData.user
          ? await this.transformUser(
              authData.user as unknown as Record<string, unknown>
            )
          : null,
        session: authData.session,
      };
    } catch (error) {
      return {
        user: null,
        session: null,
        error: error instanceof Error ? error.message : "Sign up failed",
      };
    }
  }

  // Sign in with email and password
  static async signIn(data: SignInData): Promise<AuthResponse> {
    try {
      const authClient = createAuthClient();
      const { data: authData, error } =
        await authClient.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

      if (error) {
        throw error;
      }

      return {
        user: authData.user
          ? await this.transformUser(
              authData.user as unknown as Record<string, unknown>
            )
          : null,
        session: authData.session,
      };
    } catch (error) {
      return {
        user: null,
        session: null,
        error: error instanceof Error ? error.message : "Sign in failed",
      };
    }
  }

  // Sign out
  static async signOut(): Promise<{ error?: string }> {
    try {
      const authClient = createAuthClient();
      const { error } = await authClient.auth.signOut();
      if (error) {
        throw error;
      }
      return {};
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Sign out failed",
      };
    }
  }

  // Get current user
  static async getCurrentUser(): Promise<User | null> {
    try {
      const authClient = createAuthClient();
      const {
        data: { user },
        error,
      } = await authClient.auth.getUser();
      if (error) {
        throw error;
      }
      return user
        ? await this.transformUser(user as unknown as Record<string, unknown>)
        : null;
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  }

  // Get current session
  static async getCurrentSession() {
    try {
      const authClient = createAuthClient();
      const {
        data: { session },
        error,
      } = await authClient.auth.getSession();
      if (error) {
        throw error;
      }
      return session;
    } catch (error) {
      console.error("Error getting current session:", error);
      return null;
    }
  }

  // Reset password
  static async resetPassword(email: string): Promise<{ error?: string }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        throw error;
      }
      return {};
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Password reset failed",
      };
    }
  }

  // Update user profile
  static async updateProfile(
    userId: string,
    updates: Partial<User>
  ): Promise<{ user?: User; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("users")
        .update(updates as Record<string, unknown>)
        .eq("id", userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return { user: data as User };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Profile update failed",
      };
    }
  }

  // Initialize auth state and listen for changes
  static async initializeAuth(
    onAuthChange: (user: User | null, session: unknown) => void
  ) {
    const authClient = createAuthClient();

    // Get initial session
    const {
      data: { session },
    } = await authClient.auth.getSession();
    if (session?.user) {
      const user = await this.transformUser(
        session.user as unknown as Record<string, unknown>
      );
      onAuthChange(user, session);
    } else {
      onAuthChange(null, null);
    }

    // Listen for auth changes
    const {
      data: { subscription },
    } = authClient.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user = await this.transformUser(
          session.user as unknown as Record<string, unknown>
        );
        onAuthChange(user, session);
      } else {
        onAuthChange(null, null);
      }
    });

    return subscription;
  }

  // Transform Supabase user to our User type
  private static async transformUser(
    supabaseUser: Record<string, unknown>
  ): Promise<User> {
    try {
      // Fetch user profile from the database
      const { data: profile, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", supabaseUser.id as string)
        .single();

      if (error || !profile) {
        // Fallback to metadata if profile doesn't exist
        const userMetadata =
          (supabaseUser.user_metadata as Record<string, unknown>) || {};

        return {
          id: supabaseUser.id as string,
          email: supabaseUser.email as string,
          name: (userMetadata.name as string) || undefined,
          avatar_url: (userMetadata.avatar_url as string) || undefined,
          role: "teacher",
          credits: 0,
          created_at: supabaseUser.created_at as string,
          updated_at: supabaseUser.updated_at as string,
        };
      }

      return {
        id: profile.id,
        email: profile.email,
        name: profile.full_name || undefined,
        avatar_url: undefined, // Not stored in user_profiles
        role: profile.role as "teacher" | "admin",
        credits: profile.credits_remaining,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      };
    } catch (error) {
      console.error("Error fetching user profile:", error);

      // Fallback to metadata
      const userMetadata =
        (supabaseUser.user_metadata as Record<string, unknown>) || {};

      return {
        id: supabaseUser.id as string,
        email: supabaseUser.email as string,
        name: (userMetadata.name as string) || undefined,
        avatar_url: (userMetadata.avatar_url as string) || undefined,
        role: "teacher",
        credits: 0,
        created_at: supabaseUser.created_at as string,
        updated_at: supabaseUser.updated_at as string,
      };
    }
  }
}
