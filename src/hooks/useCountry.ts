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
let failedAttempts = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

/** Retries after a failed profile load: 1s, 2s, 4s, 8s, 16s. */
const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 16000];
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

/**
 * Loads the country from the profile once. On a full page load the first request
 * can run before the auth session is ready and fail, so a failure is retried with
 * backoff instead of leaving a Brazilian teacher on the Portuguese lists for the
 * rest of the page. While nothing has loaded, the current value (default "PT") stays.
 */
export function hydrateCountryFromProfile(): Promise<void> {
  if (hydrated) return Promise.resolve();
  if (!hydrating) {
    hydrating = userService
      .getCurrentUser()
      .then((profile) => {
        hydrated = true;
        failedAttempts = 0;
        if (isCountryCode(profile.countryCode)) setCountryCode(profile.countryCode);
      })
      .catch(() => {
        scheduleRetry();
      })
      .finally(() => {
        hydrating = null;
      });
  }
  return hydrating;
}

function scheduleRetry(): void {
  if (retryTimer || failedAttempts >= RETRY_DELAYS_MS.length) return;
  const delay = RETRY_DELAYS_MS[failedAttempts];
  failedAttempts += 1;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void hydrateCountryFromProfile();
  }, delay);
}

/** Test-only: resets the module store. */
export function resetCountryStoreForTests(): void {
  currentCountry = DEFAULT_COUNTRY_CODE;
  hydrated = false;
  hydrating = null;
  failedAttempts = 0;
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  listeners.clear();
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
