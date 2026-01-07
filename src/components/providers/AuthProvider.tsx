"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { setApiAuthToken } from "@/services/api/client";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    const syncToken = async () => {
      if (isSignedIn) {
        const template = process.env.NEXT_PUBLIC_CLERK_JWT_TEMPLATE;
        const token = await getToken(template ? { template } : undefined);
        setApiAuthToken(token);
      } else {
        setApiAuthToken(null);
      }
    };

    syncToken();

    // Refresh token periodically (every 5 minutes)
    const interval = setInterval(syncToken, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [getToken, isSignedIn]);

  return children;
}

