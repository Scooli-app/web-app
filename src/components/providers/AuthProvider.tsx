"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useCallback } from "react";
import { setApiTokenGetter } from "@/services/api/client";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { getToken, isSignedIn } = useAuth();

  const tokenGetter = useCallback(async () => {
    if (!isSignedIn) {return null;}
    const template = process.env.NEXT_PUBLIC_CLERK_JWT_TEMPLATE;
    return getToken(template ? { template } : undefined);
  }, [getToken, isSignedIn]);

  useEffect(() => {
    setApiTokenGetter(tokenGetter);
    return () => setApiTokenGetter(null);
  }, [tokenGetter]);

  return children;
}

