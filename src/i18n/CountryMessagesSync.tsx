"use client";

import { useLoadedCountry } from "@/hooks/useCountry";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { COUNTRY_COOKIE_MAX_AGE, COUNTRY_COOKIE_NAME } from "./regionalMessages";

function readCountryCookie(): string | null {
  const match = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${COUNTRY_COOKIE_NAME}=`));
  return match ? decodeURIComponent(match.split("=")[1] ?? "") : null;
}

/**
 * Mirrors the teacher's country into the `scooli-country` cookie, which the
 * server reads to pick a regional message overlay (Brazilian Portuguese for BR).
 * When the cookie changes, the page is re-rendered with the right messages.
 *
 * Only acts once the profile has loaded: writing the "PT" default first would
 * flash Portuguese wording at a Brazilian teacher on every visit. Renders nothing.
 */
export function CountryMessagesSync() {
  const { isSignedIn } = useAuth();
  // The profile request only makes sense with a session.
  return isSignedIn ? <SignedInCountrySync /> : null;
}

function SignedInCountrySync() {
  const country = useLoadedCountry();
  const router = useRouter();

  useEffect(() => {
    if (!country) return;
    if (readCountryCookie() === country) return;
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${COUNTRY_COOKIE_NAME}=${encodeURIComponent(country)}; Path=/; Max-Age=${COUNTRY_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
    router.refresh();
  }, [country, router]);

  return null;
}
