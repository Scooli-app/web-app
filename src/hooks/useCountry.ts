"use client";

import {
  DEFAULT_COUNTRY_CODE,
  isCountryCode,
  type CountryCode,
} from "@/lib/curriculum/countryCatalog";
import { userService } from "@/services/api/user.service";
import { useEffect, useSyncExternalStore } from "react";

/*
 * Module-level store: one profile fetch per page load, shared by every picker
 * on the page. Without a signed-in profile the country stays "PT".
 */
let currentCountry: CountryCode = DEFAULT_COUNTRY_CODE;
let hydrated = false;
let hydrating: Promise<void> | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Sets the country locally. Used after the teacher saves a new one. */
export function setCountryCode(next: CountryCode): void {
  if (next === currentCountry) return;
  currentCountry = next;
  listeners.forEach((listener) => listener());
}

/** Loads the country from the profile once. Failures keep the current value. */
export function hydrateCountryFromProfile(): Promise<void> {
  if (hydrated) return Promise.resolve();
  if (!hydrating) {
    hydrating = userService
      .getCurrentUser()
      .then((profile) => {
        hydrated = true;
        if (isCountryCode(profile.countryCode)) setCountryCode(profile.countryCode);
      })
      .catch(() => {
        // A profile that will not load keeps the default; the pickers still work.
      })
      .finally(() => {
        hydrating = null;
      });
  }
  return hydrating;
}

/** The teacher's country (`countryCode` on the profile). Defaults to "PT". */
export function useCountry(): CountryCode {
  useEffect(() => {
    void hydrateCountryFromProfile();
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => currentCountry,
    () => DEFAULT_COUNTRY_CODE,
  );
}
