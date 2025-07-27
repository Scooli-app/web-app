"use client";

import {
  createClientComponentClient,
  type User,
} from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";

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

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === "SIGNED_OUT") {
        router.push("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, router]);

  return (
    <SupabaseContext.Provider value={{ user, loading }}>
      {children}
    </SupabaseContext.Provider>
  );
}
