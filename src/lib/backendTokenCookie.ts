import { getTokenSubject } from "./tokenSubject";

/**
 * The middleware mirrors the Clerk session token into the `scooli_token`
 * cookie, but only refreshes it on requests it handles, and a failed refresh
 * used to leave the old value in place. After a sign-out → sign-in or a Clerk
 * account switch in the same browser, the cookie can therefore still carry
 * the previous user's token for a while.
 */
export const BACKEND_TOKEN_COOKIE = "scooli_token";

/**
 * The cookie token when it was issued for `userId` (the Clerk user signed in
 * on this request), otherwise null so the caller asks Clerk for a fresh token.
 */
export function cookieTokenForUser(
  token: string | undefined,
  userId: string | null | undefined,
): string | null {
  if (!token || !userId) return null;
  return getTokenSubject(token) === userId ? token : null;
}
