import type { Locale } from "./locales";

/**
 * Asks the server to record `locale` as the language of this account's Clerk
 * transactional mail (verification codes, magic links, invitations).
 *
 * `publicMetadata` is not writable from the browser, so this goes through
 * `/api/clerk/locale`, which writes it with the secret key on behalf of the
 * signed-in caller.
 *
 * Callers must tie this to something the teacher *did* — choosing a language,
 * signing up — never to what a page happens to be rendering. Rendering follows a
 * per-browser cookie, so stamping from it makes two browsers on one account
 * overwrite each other, and makes every existing user cost two Clerk Backend API
 * calls on their first page view after a deploy.
 *
 * @param options.ifUnset write only when Clerk holds no value yet, decided
 *   server-side so a stale client-side copy of the user cannot overwrite a
 *   choice made a moment ago.
 * @returns whether the request succeeded. Never throws: the language of a
 *   verification email is not worth failing the action that triggered it.
 */
export async function stampClerkLocale(
  locale: Locale,
  options: { ifUnset?: boolean } = {},
): Promise<boolean> {
  try {
    const response = await fetch("/api/clerk/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale, ifUnset: options.ifUnset === true }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
