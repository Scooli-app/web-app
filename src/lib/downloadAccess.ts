/**
 * Who may export from `/api/download` (PDF/DOCX built on the Next side, so this is the only
 * server-side gate for them). One `GET /users/me/plan-limits` answers both questions: Pro (DOCX)
 * and the read-only lock (ENG-321). Its `isPro` is the backend's effective Pro access, the same
 * value `/entitlements/current` returns.
 *
 * Fails closed: when the account cannot be read the export is refused (503), except where the
 * route already had a fallback: no backend configured (local dev), no token, or a 401.
 */
export type DownloadAccess =
  | { kind: "allowed"; isPro: boolean }
  | { kind: "locked"; reason: string | null }
  | { kind: "unavailable" };

export async function resolveDownloadAccess({
  baseUrl,
  token,
  isOrganizationMember,
  fetchImpl = fetch,
}: {
  /** Backend base URL, already normalised; empty when none is configured. */
  baseUrl: string | null | undefined;
  token: string | null;
  /** Clerk's active organization: Pro through the school even when the backend can't say. */
  isOrganizationMember: boolean;
  fetchImpl?: typeof fetch;
}): Promise<DownloadAccess> {
  // No backend configured (local dev): no lock, as before.
  if (!baseUrl) return { kind: "allowed", isPro: false };
  // Today's fallbacks when the backend cannot identify the caller.
  if (!token) return { kind: "allowed", isPro: isOrganizationMember };

  let response: Response;
  try {
    response = await fetchImpl(`${baseUrl}/users/me/plan-limits`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    return { kind: "unavailable" };
  }
  if (response.status === 401) return { kind: "allowed", isPro: isOrganizationMember };
  if (!response.ok) return { kind: "unavailable" };

  let limits: { isPro?: unknown; status?: unknown; lockReason?: unknown } | null;
  try {
    limits = await response.json();
  } catch {
    return { kind: "unavailable" };
  }
  if (!limits || typeof limits !== "object") return { kind: "unavailable" };

  // An older backend sends no `status`: never locked.
  if (limits.status === "LOCKED") {
    return { kind: "locked", reason: typeof limits.lockReason === "string" ? limits.lockReason : null };
  }
  return { kind: "allowed", isPro: limits.isPro === true || isOrganizationMember };
}

/** The refusal for an export the account may not make, or null when it may. */
export function downloadAccessDenial(
  access: DownloadAccess,
  messages: { locked: string; unavailable: string },
): { status: number; body: Record<string, unknown> } | null {
  if (access.kind === "locked") {
    return {
      status: 403,
      body: { code: "account_locked", reason: access.reason, action: "export", error: messages.locked },
    };
  }
  if (access.kind === "unavailable") {
    return { status: 503, body: { code: "account_status_unavailable", error: messages.unavailable } };
  }
  return null;
}
