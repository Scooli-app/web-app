"use client";

import { stampClerkLocale } from "@/i18n/clerkLocale";
import { isSupportedLocale } from "@/i18n/locales";
import { useUser } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

/**
 * Carries the language chosen at sign-up over to Clerk's `public_metadata.locale`,
 * once, as soon as a session exists.
 *
 * `LocaleAwareSignUp` can only set `unsafeMetadata` — a user that does not exist
 * yet has no `publicMetadata` to write — and the backend's Clerk webhook prefers
 * `public_metadata.locale` for every email after the first. This is the hop
 * between the two.
 *
 * It deliberately does *not* keep `public_metadata.locale` in step with what the
 * page renders. An earlier version did, and it had two costs: every existing
 * user has no stamp yet, so each one made two Clerk Backend API calls on their
 * first page view after deploy, all bunched together; and rendering follows a
 * per-browser cookie, so one account open in two browsers overwrote the stamp
 * back and forth. Later changes are stamped where they are made instead —
 * `useLocalePreferences.changeInterfacePreference` — so a write always
 * corresponds to something the teacher chose.
 *
 * Existing accounts carry no `unsafeMetadata.locale`, so for them this effect
 * returns immediately and makes no request at all.
 */
export function ClerkLocaleStamp() {
  const { isLoaded, isSignedIn, user } = useUser();

  // Guards against a second POST while the first is still in flight, and against
  // repeating one that already landed.
  const inFlightRef = useRef(false);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    if (doneRef.current || inFlightRef.current) return;

    // Already stamped — at an earlier sign-in, or by an explicit language change.
    // Never overwritten from here.
    if (user.publicMetadata?.locale) return;

    const signUpLocale = user.unsafeMetadata?.locale;
    if (!isSupportedLocale(signUpLocale)) return;

    inFlightRef.current = true;
    void (async () => {
      try {
        // `ifUnset` is enforced by the server too: this component's copy of the
        // user can be stale, and must not win over a choice made a moment ago.
        if (await stampClerkLocale(signUpLocale, { ifUnset: true })) {
          doneRef.current = true;
          // Pull the fresh publicMetadata into the Clerk client so the guard
          // above sees it on the next render.
          await user.reload();
        }
      } catch {
        // Transactional email language is not worth interrupting the app for.
        // A later navigation retries.
      } finally {
        inFlightRef.current = false;
      }
    })();
  }, [isLoaded, isSignedIn, user]);

  return null;
}
