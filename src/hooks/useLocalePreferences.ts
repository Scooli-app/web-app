"use client";

import {
  writeStoredContentPreference,
  writeStoredInterfacePreference,
} from "@/i18n/clientLocale";
import { detectBrowserLocale, type Locale } from "@/i18n/locales";
import {
  contentPreferenceToApi,
  interfacePreferenceToApi,
  resolveContentLanguage,
  type ContentLanguagePreference,
  type InterfaceLocalePreference,
} from "@/i18n/preferences";
import { userService } from "@/services/api/user.service";
import { useAppDispatch } from "@/store/hooks";
import type { RootState } from "@/store/store";
import { setContentLanguage, setInterfaceLocale } from "@/store/ui/uiSlice";
import { useLocale } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";

interface UseLocalePreferencesResult {
  /** The teacher's choice, including the "follow the browser" sentinel. */
  interfacePreference: InterfaceLocalePreference;
  /** The teacher's choice, including the "same as interface" sentinel. */
  contentPreference: ContentLanguagePreference;
  /** The locale the interface is currently rendered in. */
  interfaceLocale: Locale;
  /** The locale documents will actually be generated in. */
  contentLocale: Locale;
  /**
   * Both setters apply the change locally first and persist in the background.
   * They reject only if the caller wants to surface a save failure — the local
   * change is never rolled back, because the teacher's click did take effect in
   * this browser even when the backend call did not land.
   */
  changeInterfacePreference: (
    preference: InterfaceLocalePreference,
  ) => Promise<void>;
  changeContentPreference: (
    preference: ContentLanguagePreference,
  ) => Promise<void>;
}

/**
 * The single place the two language preferences are changed from. Both the
 * settings page and the onboarding go through it so they cannot drift.
 */
export function useLocalePreferences(): UseLocalePreferencesResult {
  const dispatch = useAppDispatch();
  const interfaceLocale = useLocale() as Locale;

  const interfacePreference = useSelector(
    (state: RootState) => state.ui.interfaceLocale,
  );
  const contentPreference = useSelector(
    (state: RootState) => state.ui.contentLanguage,
  );

  const changeInterfacePreference = useCallback(
    async (preference: InterfaceLocalePreference) => {
      // Storage first: LocaleProvider reads it back to tell "chose to follow the
      // browser" apart from "never expressed a preference".
      writeStoredInterfacePreference(preference);
      dispatch(setInterfaceLocale(preference));
      await userService.updateLocalePreferences({
        preferredLocale: interfacePreferenceToApi(preference),
      });
    },
    [dispatch],
  );

  const changeContentPreference = useCallback(
    async (preference: ContentLanguagePreference) => {
      writeStoredContentPreference(preference);
      dispatch(setContentLanguage(preference));
      await userService.updateLocalePreferences({
        contentLanguage: contentPreferenceToApi(preference),
      });
    },
    [dispatch],
  );

  return {
    interfacePreference,
    contentPreference,
    interfaceLocale,
    contentLocale: resolveContentLanguage(contentPreference, interfaceLocale),
    changeInterfacePreference,
    changeContentPreference,
  };
}

/**
 * What "follow my browser" resolves to right now, for the hint shown under the
 * control. Resolved after mount rather than during render: the server has no
 * browser to ask, and returning a different answer on each side would be a
 * hydration mismatch.
 */
export function useDetectedBrowserLocale(): Locale | null {
  const [detected, setDetected] = useState<Locale | null>(null);
  useEffect(() => {
    setDetected(detectBrowserLocale());
  }, []);
  return detected;
}
