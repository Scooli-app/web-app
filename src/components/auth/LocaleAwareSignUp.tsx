"use client";

import {
  readStoredInterfacePreference,
  resolveHandoverLocale,
  writeLocaleCookie,
  writeStoredInterfacePreference,
} from "@/i18n/clientLocale";
import { defaultLocale, type Locale } from "@/i18n/locales";
import { SignUp } from "@clerk/nextjs";
import { useEffect, useState } from "react";

/**
 * `<SignUp />` with the visitor's locale attached.
 *
 * Two things happen here, and they cover different windows of time:
 *
 *  1. `unsafeMetadata.locale` rides along on the sign-up attempt itself. It is
 *     the only metadata a not-yet-existing user can carry, and it is set before
 *     Clerk sends the first verification email — so the backend webhook has a
 *     language to read at the one moment `publicMetadata` cannot exist yet.
 *  2. `ClerkLocaleStamp` (mounted app-wide) copies the same value into
 *     `publicMetadata.locale` as soon as a session exists, which is what the
 *     backend reads for every later email.
 *
 * The locale itself comes from `?locale=` if the landing page passed one, then
 * the shared `NEXT_LOCALE` cookie, then the browser. Choosing it here rather
 * than in the app is deliberate: sign-up is the one moment where there is no
 * existing Portuguese user to disturb, so the browser's language is a safe
 * signal instead of a risky one.
 */
export function LocaleAwareSignUp() {
  // Resolved after mount: query string and cookies are browser state, and
  // guessing during SSR would just produce a hydration mismatch.
  const [locale, setLocale] = useState<Locale | null>(null);

  useEffect(() => {
    const resolved = resolveHandoverLocale() ?? defaultLocale;
    setLocale(resolved);

    // Record it as an expressed preference so the app the teacher lands in after
    // verification is already in the right language, rather than snapping to it
    // a moment later.
    //
    // A preference already stored in this browser is left alone: someone who
    // signed out and wandered back to /sign-up has already chosen, and a browser
    // set to English is not a reason to overrule them.
    if (readStoredInterfacePreference() === null) {
      writeStoredInterfacePreference(resolved);
      writeLocaleCookie(resolved);
    }
  }, []);

  // Render Clerk's form only once the locale is known, so the sign-up attempt is
  // never created without it. The wait is a single effect tick.
  if (!locale) {
    return <div className="min-h-[28rem]" aria-hidden="true" />;
  }

  return <SignUp unsafeMetadata={{ locale }} />;
}
