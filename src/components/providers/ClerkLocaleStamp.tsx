"use client";

import { isSupportedLocale, type Locale } from "@/i18n/locales";
import { useUser } from "@clerk/nextjs";
import { useLocale } from "next-intl";
import { useEffect, useRef } from "react";

/**
 * Keeps Clerk's `public_metadata.locale` in step with the language the teacher
 * is actually using.
 *
 * The backend's Clerk webhook reads that field to decide what language to send
 * verification codes, magic links and organization invitations in. Nothing else
 * writes it, so without this every piece of Clerk transactional mail stays
 * Portuguese no matter what the account says.
 *
 * It runs on every authenticated page rather than only after sign-up, because
 * the value has to follow later changes too — a teacher who switches to English
 * in Settings should get English invitations from then on. The write is skipped
 * whenever the stamp already matches, so the steady state costs nothing.
 */
export function ClerkLocaleStamp() {
  const { isLoaded, isSignedIn, user } = useUser();
  const locale = useLocale() as Locale;

  // Guards against a second POST while the first is still in flight, and against
  // re-posting a value this session already wrote.
  const inFlightRef = useRef(false);
  const lastStampedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    if (!isSupportedLocale(locale)) return;

    const current = user.publicMetadata?.locale;
    if (current === locale || lastStampedRef.current === locale) return;
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    void (async () => {
      try {
        const response = await fetch("/api/clerk/locale", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale }),
        });
        if (response.ok) {
          lastStampedRef.current = locale;
          // Pull the fresh publicMetadata into the Clerk client so the effect
          // does not fire again on the next render.
          await user.reload();
        }
      } catch {
        // Transactional email language is not worth interrupting the app for.
        // The next navigation retries.
      } finally {
        inFlightRef.current = false;
      }
    })();
  }, [isLoaded, isSignedIn, locale, user]);

  return null;
}
