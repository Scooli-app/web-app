/**
 * The `sub` claim (the Clerk user id) of a JWT, read without verifying the
 * signature. The backend verifies tokens; this only tells which Clerk user a
 * token was issued for.
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
 * The Clerk user id behind an `Authorization: Bearer …` header value, or null
 * when the request went out without a bearer token.
 */
export function getBearerSubject(authorization: unknown): string | null {
  if (typeof authorization !== "string" || !authorization.startsWith("Bearer ")) {
    return null;
  }
  return getTokenSubject(authorization.slice("Bearer ".length));
}
