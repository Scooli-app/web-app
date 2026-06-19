"use client";

import { setApiTokenGetter } from "@/services/api/client";
import { useAuth, useUser } from "@clerk/nextjs";
import posthog from "posthog-js";
import { useEffect, useLayoutEffect, useRef } from "react";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { getToken, isLoaded } = useAuth();
  const { user } = useUser();

  // Use a ref so the API client always calls the latest getToken
  // without waiting for React effect cycles on re-renders.
  const getTokenRef = useRef(getToken);
  // undefined = effect hasn't run yet; null = was unauthenticated; string = previous user id
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useLayoutEffect(() => {
    if (!isLoaded) {
      setApiTokenGetter(null);
      return;
    }

    const template = process.env.NEXT_PUBLIC_CLERK_JWT_TEMPLATE;

    // This getter is stable — it always delegates to the latest
    // Clerk getToken via the ref, avoiding stale closures.
    const tokenGetter = async () => {
      try {
        return await getTokenRef.current(
          template ? { template, skipCache: true } : { skipCache: true },
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

  useEffect(() => {
    if (!isLoaded) return;
    if (user) {
      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName,
      });

      // Fire user_signed_up once per user per browser using localStorage as a
      // dedup guard. The 5-minute window tolerates slow hydration while still
      // catching genuinely new accounts; localStorage prevents re-firing on
      // refreshes within that window.
      const trackedKey = `scooli_signup_ev_${user.id}`;
      const alreadyTracked = localStorage.getItem(trackedKey);
      const isNewAccount =
        user.createdAt !== null &&
        Date.now() - user.createdAt.getTime() < 300_000;
      if (!alreadyTracked && isNewAccount) {
        localStorage.setItem(trackedKey, "1");
        posthog.capture("user_signed_up", {
          signup_method: user.externalAccounts.length > 0 ? "google" : "email",
        });
      }
    } else if (prevUserIdRef.current !== null) {
      // Only reset when transitioning from an authenticated user to null (sign-out).
      // Calling reset() for unauthenticated visitors (e.g. the sign-up page) would
      // destroy the anonymous distinct_id shared from the landing page, breaking the
      // marketing_cta_clicked → user_signed_up conversion funnel.
      posthog.reset();
    }
    prevUserIdRef.current = user?.id ?? null;
  }, [isLoaded, user]);

  return children;
}
