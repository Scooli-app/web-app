"use client";

import {
  readStoredContentPreference,
  readStoredInterfacePreference,
  resolveEffectiveInterfaceLocale,
  writeLocaleCookie,
  writeStoredContentPreference,
  writeStoredInterfacePreference,
} from "@/i18n/clientLocale";
import { type Locale } from "@/i18n/locales";
import {
  contentPreferenceFromApi,
  interfacePreferenceFromApi,
} from "@/i18n/preferences";
import { userService } from "@/services/api/user.service";
import { useAppDispatch } from "@/store/hooks";
import type { RootState } from "@/store/store";
import { setContentLanguage, setInterfaceLocale } from "@/store/ui/uiSlice";
import { useAuth } from "@clerk/nextjs";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";

/**
 * Keeps the interface locale in sync across the four places it lives: Redux (for
 * the settings UI), localStorage (so it survives a reload before the profile
 * request lands), the `NEXT_LOCALE` cookie (which the server reads to choose the
 * message bundle) and the user row on the backend (so it follows the teacher to
 * another device).
 *
 * Mirrors `ThemeProvider`, with one difference that matters: the theme is applied
 * by toggling a class, while the locale decides which messages the *server*
 * rendered. Changing it therefore needs a `router.refresh()` rather than a
 * DOM tweak.
 *
 * ── Why an unset preference resolves to pt-PT rather than the browser ──
 * The default preference is "follow my browser", but browser detection only
 * kicks in once the teacher has actually expressed that preference (or arrived
 * with a locale handed over from the landing page or sign-up). A large share of
 * Portuguese teachers run English-language browsers — the landing page repo
 * disables Accept-Language redirects for exactly this reason — so silently
 * reading `navigator.language` for the existing user base would flip thousands
 * of Portuguese interfaces to English overnight. An account that has never
 * expressed a preference stays on pt-PT and looks identical to today.
 *
 * That gate lives in `resolveEffectiveInterfaceLocale` (`@/i18n/clientLocale`),
 * not inline here, so anything else that needs "the locale to actually use
 * right now" — a generation request's `contentLanguage`, say — applies the
 * exact same rule instead of re-deriving it and getting it wrong.
 */
export default function LocaleProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();

  // What the server actually rendered this page with.
  const renderedLocale = useLocale() as Locale;

  // Only the interface locale is read here — it is the one that decides what the
  // server renders. The content language is hydrated below but never affects
  // this component's output.
  const interfacePreference = useSelector(
    (state: RootState) => state.ui.interfaceLocale,
  );

  const hasHydratedFromServerRef = useRef(false);

  // Load whatever this browser already knows, before any network call.
  useEffect(() => {
    const storedInterface = readStoredInterfacePreference();
    if (storedInterface) {
      dispatch(setInterfaceLocale(storedInterface));
    }

    const storedContent = readStoredContentPreference();
    if (storedContent) {
      dispatch(setContentLanguage(storedContent));
    }
  }, [dispatch]);

  // The account is the cross-device source of truth, so it wins over this
  // browser's localStorage once it arrives. Runs once per sign-in.
  useEffect(() => {
    if (!isLoaded || !isSignedIn || hasHydratedFromServerRef.current) return;
    hasHydratedFromServerRef.current = true;

    let cancelled = false;
    void (async () => {
      try {
        const profile = await userService.getCurrentUser();
        if (cancelled) return;

        if (profile.preferredLocale) {
          const preference = interfacePreferenceFromApi(profile.preferredLocale);
          writeStoredInterfacePreference(preference);
          dispatch(setInterfaceLocale(preference));
        }
        if (profile.contentLanguage) {
          const preference = contentPreferenceFromApi(profile.contentLanguage);
          writeStoredContentPreference(preference);
          dispatch(setContentLanguage(preference));
        }
      } catch {
        // A profile that will not load is not a reason to break the app: the
        // locale simply stays whatever this browser already resolved.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dispatch, isLoaded, isSignedIn]);

  // Reset the hydration guard on sign-out so the next user is not left with the
  // previous one's language.
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      hasHydratedFromServerRef.current = false;
    }
  }, [isLoaded, isSignedIn]);

  // Push the resolved locale out to the cookie and, when it disagrees with what
  // the server rendered, re-render the tree with the right messages.
  useEffect(() => {
    // Read back from storage rather than tracking a ref: the settings page and
    // the onboarding both write there, and localStorage is the one place all of
    // them agree on.
    const hasExpressedPreference = readStoredInterfacePreference() !== null;
    const effective = resolveEffectiveInterfaceLocale(interfacePreference);

    if (hasExpressedPreference) {
      writeLocaleCookie(effective);
    }

    if (document.documentElement.lang !== effective) {
      document.documentElement.lang = effective;
    }

    if (effective !== renderedLocale) {
      router.refresh();
    }
  }, [interfacePreference, renderedLocale, router]);

  return children;
}
