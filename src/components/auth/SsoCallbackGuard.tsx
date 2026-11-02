"use client";

import { useAuth } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

const SEEN_KEY = "scooli_sso_callback_seen";

/**
 * Wraps Clerk's sign-in / sign-up so Back doesn't loop after Google or Microsoft sign-in.
 *
 * Clerk leaves `/sign-up/sso-callback` in the history. Back from the dashboard re-opens it, Clerk sees a
 * finished sign-in and pushes the teacher forward again, so every Back lands on the dashboard (14% of
 * SSO sign-ups in Sept-Oct 2026). A callback this tab already finished is replaced by the dashboard instead.
 *
 * "Already finished" = this tab opened a callback since it last showed the sign-in or sign-up form, which
 * every new SSO attempt starts from. A fresh callback is never touched, so Clerk's own redirect
 * (e.g. back to checkout) still applies.
 */
export function SsoCallbackGuard({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const onCallback = pathname.endsWith("/sso-callback");
  const decided = useRef(false);
  const [revisit, setRevisit] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoaded || decided.current) return;
    decided.current = true;

    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
      if (onCallback) sessionStorage.setItem(SEEN_KEY, "1");
      else sessionStorage.removeItem(SEEN_KEY);
    } catch {
      // Storage blocked: Clerk's own callback still works, only the Back fix is lost.
    }

    const back = onCallback && seen && Boolean(isSignedIn);
    setRevisit(back);
    if (back) router.replace("/dashboard");
  }, [isLoaded, isSignedIn, onCallback, router]);

  if (onCallback && revisit !== false) return null;
  return children;
}
