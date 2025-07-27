"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/frontend/stores/auth.store";

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const { initializeAuth, isInitialized } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      initializeAuth();
    }
  }, [initializeAuth, isInitialized]);

  return children;
} 