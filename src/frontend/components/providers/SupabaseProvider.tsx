"use client";

import {
  createClientComponentClient,
  type User,
} from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";

interface SupabaseContextType {
  user: User | null;
  loading: boolean;
}

const SupabaseContext = createContext<SupabaseContextType>({
  user: null,
  loading: true,
});

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error("useSupabase must be used within a SupabaseProvider");
  }
  return context;
};

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClientComponentClient();
  const initRef = useRef(false);

  useEffect(() => {
    // Prevent multiple initializations
    if (initRef.current) {
      return;
    }
    initRef.current = true;

    let mounted = true;

    const getUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (mounted) {
          setUser(user);
        }
      } catch (error: unknown) {
        // Handle refresh token errors
        const authError = error as { code?: string; message?: string };
        if (
          authError?.code === "refresh_token_not_found" ||
          authError?.message?.includes("refresh_token_not_found") ||
          authError?.message?.includes("Invalid Refresh Token")
        ) {
          console.log(
            "[SupabaseProvider] Invalid refresh token detected, clearing session"
          );

          // Sign out to clear invalid session
          try {
            await supabase.auth.signOut();
          } catch (signOutError) {
            console.error(
              "[SupabaseProvider] Error signing out:",
              signOutError
            );
          }

          if (mounted) {
            setUser(null);
          }
        } else {
          console.error("[SupabaseProvider] Auth error:", authError);
          if (mounted) {
            setUser(null);
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) {
        return;
      }

      console.log("[SupabaseProvider] Auth state change:", event);

      setUser(session?.user ?? null);
      setLoading(false);

      if (event === "SIGNED_OUT") {
        router.push("/login");
      }

      // Handle token refresh errors
      if (event === "TOKEN_REFRESHED" && !session) {
        console.log(
          "[SupabaseProvider] Token refresh failed, clearing session"
        );
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          console.error(
            "[SupabaseProvider] Error signing out after failed refresh:",
            signOutError
          );
        }
        setUser(null);
        router.push("/login");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      initRef.current = false;
    };
  }, [supabase, router]);

  return (
    <SupabaseContext.Provider value={{ user, loading }}>
      {children}
    </SupabaseContext.Provider>
  );
}
