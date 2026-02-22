"use client";

import { setApiTokenGetter } from "@/services/api/client";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { getToken, isLoaded } = useAuth();

  // Use a ref so the API client always calls the latest getToken
  // without waiting for React effect cycles on re-renders.
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) return;

    const template = process.env.NEXT_PUBLIC_CLERK_JWT_TEMPLATE;

    // This getter is stable — it always delegates to the latest
    // Clerk getToken via the ref, avoiding stale closures.
    const tokenGetter = async () => {
      try {
        return await getTokenRef.current(
          template ? { template } : undefined
        );
      } catch {
        // Clerk may throw if session is expired or being refreshed;
        // return null so the API call proceeds without a token
        // (the backend will return 401 and the interceptor can handle it).
        return null;
      }
    };

    setApiTokenGetter(tokenGetter);
    return () => setApiTokenGetter(null);
  }, [isLoaded]);

  return children;
}

