/**
 * localStorage marker for a running plan generation. It lets a later page load (any
 * onboarding mode) finish an interrupted plan, and doubles as a cross-tab lease so two
 * tabs never generate the same plan at once.
 */
export interface PlanGenMarker {
  timetableId: string;
  weekStart: string;
  startedAt: number;
  leaseOwner?: string;
  leaseUntil?: number;
}

const PREFIX = "scooli:plan-gen:";
const TTL_MS = 48 * 60 * 60 * 1000;
const LEASE_MS = 60_000;
const RENEW_MS = 20_000;

export const TAB_ID =
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Math.random()).slice(2);

let renewTimer: ReturnType<typeof setInterval> | null = null;

export const markerKey = (userId: string) => PREFIX + userId;

export function readMarker(userId: string | null | undefined): PlanGenMarker | null {
  if (!userId) return null;
  try {
    const raw = window.localStorage.getItem(markerKey(userId));
    if (!raw) return null;
    const marker = JSON.parse(raw) as PlanGenMarker;
    if (!marker.timetableId || Date.now() - marker.startedAt > TTL_MS) {
      window.localStorage.removeItem(markerKey(userId));
      return null;
    }
    return marker;
  } catch {
    return null;
  }
}

function writeMarker(userId: string, marker: PlanGenMarker) {
  try {
    window.localStorage.setItem(markerKey(userId), JSON.stringify(marker));
  } catch {
    // Best effort.
  }
}

export function stopLeaseRenewal() {
  if (renewTimer) clearInterval(renewTimer);
  renewTimer = null;
}

export function clearMarker(userId: string | null | undefined) {
  stopLeaseRenewal();
  if (!userId) return;
  try {
    window.localStorage.removeItem(markerKey(userId));
  } catch {
    // Best effort.
  }
}

/** Takes the lease (and writes the marker) unless another live tab holds it. */
export function claimLease(
  userId: string | null | undefined,
  base: { timetableId: string; weekStart: string },
): boolean {
  if (!userId) return true;
  const existing = readMarker(userId);
  const sameClass = existing?.timetableId === base.timetableId;
  if (
    existing &&
    sameClass &&
    existing.leaseOwner &&
    existing.leaseOwner !== TAB_ID &&
    (existing.leaseUntil ?? 0) > Date.now()
  ) {
    return false;
  }
  writeMarker(userId, {
    ...base,
    startedAt: existing && sameClass ? existing.startedAt : Date.now(),
    leaseOwner: TAB_ID,
    leaseUntil: Date.now() + LEASE_MS,
  });
  stopLeaseRenewal();
  renewTimer = setInterval(() => {
    const current = readMarker(userId);
    if (!current) return stopLeaseRenewal();
    if (current.leaseOwner && current.leaseOwner !== TAB_ID) return;
    writeMarker(userId, { ...current, leaseOwner: TAB_ID, leaseUntil: Date.now() + LEASE_MS });
  }, RENEW_MS);
  return true;
}

/** Stops renewing and expires our lease, keeping the marker so a later load can retry. */
export function releaseLease(userId: string | null | undefined) {
  stopLeaseRenewal();
  if (!userId) return;
  const current = readMarker(userId);
  if (current?.leaseOwner === TAB_ID) writeMarker(userId, { ...current, leaseUntil: 0 });
}
