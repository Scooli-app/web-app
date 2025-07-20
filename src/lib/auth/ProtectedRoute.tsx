"use client";

import { userHasPermission, userHasRole } from "@/lib/auth/utils";
import type { UserProfile, UserRole } from "@/lib/types/auth";
import {
  createClientComponentClient,
  type User,
} from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  requiresAuth?: boolean;
  requiredRole?: UserRole | UserRole[];
  requiredPermissions?: string[];
  redirectTo?: string;
  fallback?: ReactNode;
  showFallback?: boolean;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

export function ProtectedRoute({
  children,
  requiresAuth = true,
  requiredRole,
  requiredPermissions,
  redirectTo = "/login",
  fallback,
  showFallback = false,
}: ProtectedRouteProps) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
  });
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const getAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setAuthState({ user: null, profile: null, loading: false });
          return;
        }

        // Get user profile
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        setAuthState({
          user,
          profile: profile as UserProfile | null,
          loading: false,
        });
      } catch (error) {
        console.error("Error fetching auth state:", error);
        setAuthState({ user: null, profile: null, loading: false });
      }
    };

    getAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        setAuthState({ user: null, profile: null, loading: false });
      } else if (event === "SIGNED_IN" && session?.user) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        setAuthState({
          user: session.user,
          profile: profile as UserProfile | null,
          loading: false,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Loading state
  if (authState.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-[#6753FF] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#6C6F80]">A verificar autenticação...</p>
        </div>
      </div>
    );
  }

  // Check authentication requirement
  if (requiresAuth && !authState.user) {
    if (showFallback && fallback) {
      return fallback;
    }
    router.replace(redirectTo);
    return null;
  }

  // Check if user is active
  if (authState.profile && !authState.profile.is_active) {
    if (showFallback && fallback) {
      return fallback;
    }
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md mx-auto text-center p-6">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-[#0B0D17] mb-2">
            Conta Desativada
          </h1>
          <p className="text-[#6C6F80] mb-4">
            A sua conta foi desativada. Entre em contacto com o suporte se
            precisar de ajuda.
          </p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="bg-[#6753FF] text-white px-4 py-2 rounded-xl hover:bg-[#4E3BC0] transition-colors"
          >
            Terminar Sessão
          </button>
        </div>
      </div>
    );
  }

  // Check role requirements
  if (requiredRole && !userHasRole(authState.profile, requiredRole)) {
    if (showFallback && fallback) {
      return fallback;
    }
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md mx-auto text-center p-6">
          <div className="text-6xl mb-4">⛔</div>
          <h1 className="text-2xl font-bold text-[#0B0D17] mb-2">
            Acesso Negado
          </h1>
          <p className="text-[#6C6F80] mb-4">
            Não tem permissões suficientes para aceder a esta página.
          </p>
          <button
            onClick={() => router.back()}
            className="bg-[#6753FF] text-white px-4 py-2 rounded-xl hover:bg-[#4E3BC0] transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  // Check permission requirements
  if (requiredPermissions) {
    for (const permission of requiredPermissions) {
      if (!userHasPermission(authState.profile, permission)) {
        if (showFallback && fallback) {
          return fallback;
        }
        return (
          <div className="flex items-center justify-center min-h-screen">
            <div className="max-w-md mx-auto text-center p-6">
              <div className="text-6xl mb-4">🔒</div>
              <h1 className="text-2xl font-bold text-[#0B0D17] mb-2">
                Permissão Insuficiente
              </h1>
              <p className="text-[#6C6F80] mb-4">
                Não tem a permissão &quot;{permission}&quot; necessária para
                esta página.
              </p>
              <button
                onClick={() => router.back()}
                className="bg-[#6753FF] text-white px-4 py-2 rounded-xl hover:bg-[#4E3BC0] transition-colors"
              >
                Voltar
              </button>
            </div>
          </div>
        );
      }
    }
  }

  // All checks passed, render children
  return children;
}

/**
 * Hook to get current auth state
 */
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
  });
  const supabase = createClientComponentClient();

  useEffect(() => {
    const getAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setAuthState({ user: null, profile: null, loading: false });
          return;
        }

        const { data: profile } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        setAuthState({
          user,
          profile: profile as UserProfile | null,
          loading: false,
        });
      } catch (error) {
        console.error("Error fetching auth state:", error);
        setAuthState({ user: null, profile: null, loading: false });
      }
    };

    getAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        setAuthState({ user: null, profile: null, loading: false });
      } else if (event === "SIGNED_IN" && session?.user) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        setAuthState({
          user: session.user,
          profile: profile as UserProfile | null,
          loading: false,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  return {
    ...authState,
    isAuthenticated: !!authState.user,
    hasPermission: (permission: string) =>
      userHasPermission(authState.profile, permission),
    hasRole: (role: UserRole | UserRole[]) =>
      userHasRole(authState.profile, role),
  };
}
