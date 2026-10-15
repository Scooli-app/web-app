/**
 * The middleware mirrors the Clerk session token into the `scooli_token`
 * cookie, but only refreshes it on requests it handles, and a failed refresh
 * leaves the old value in place. After a sign-out → sign-in or a Clerk account
 * switch in the same browser, the cookie can therefore still carry the
 * previous user's token for a while.
 */
export const BACKEND_TOKEN_COOKIE = "scooli_token";

/**
 * The `sub` claim of a JWT, read without verifying the signature. The backend
 * verifies the token; this only tells which Clerk user it was issued for.
 */
export function getTokenSubject(token: string): string | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const claims = JSON.parse(atob(padded)) as { sub?: unknown };
    return typeof claims.sub === "string" ? claims.sub : null;
  } catch {
    return null;
  }
}

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
