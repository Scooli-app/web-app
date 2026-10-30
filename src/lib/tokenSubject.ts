/**
 * The `sub` claim (the Clerk user id) of a JWT, read without verifying the
 * signature. The backend verifies tokens; this only tells which Clerk user a
 * token was issued for.
 */
export function getTokenSubject(token: string): string | null {
  const claims = readClaims(token);
  return typeof claims?.sub === "string" ? claims.sub : null;
}

/** The active organization (`org_id`, or `o.id` in v2 tokens) a JWT was issued for. */
export function getTokenOrgId(token: string): string | null {
  const claims = readClaims(token);
  const orgId = claims?.org_id ?? (claims?.o as { id?: unknown } | undefined)?.id;
  return typeof orgId === "string" ? orgId : null;
}

function readClaims(token: string): Record<string, unknown> | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const claims = JSON.parse(atob(padded)) as unknown;
    return claims && typeof claims === "object" ? (claims as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
