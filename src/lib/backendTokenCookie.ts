import { getTokenExpiry, getTokenSubject } from "./tokenSubject";

/**
 * The middleware mirrors the Clerk session token into the `scooli_token`
 * cookie, but only refreshes it on requests it handles, and a failed refresh
 * used to leave the old value in place. After a sign-out → sign-in or a Clerk
 * account switch in the same browser, the cookie can therefore still carry
 * the previous user's token for a while.
 */
export const BACKEND_TOKEN_COOKIE = "scooli_token";

/** A token this close to `exp` could expire before the backend reads it. */
const EXPIRY_MARGIN_MS = 5_000;

/**
 * The cookie token when it was issued for `userId` (the Clerk user signed in
 * on this request) and has not expired, otherwise null so the caller asks
 * Clerk for a fresh token. Clerk session tokens last about a minute but the
 * cookie lives 15: an expired one gets a 401, which the download route reads
 * as "not Pro, not locked".
 */
export function cookieTokenForUser(
  token: string | undefined,
  userId: string | null | undefined,
  now: number = Date.now(),
): string | null {
  if (!token || !userId || getTokenSubject(token) !== userId) return null;
  const exp = getTokenExpiry(token);
  return exp === null || exp * 1000 > now + EXPIRY_MARGIN_MS ? token : null;
}
