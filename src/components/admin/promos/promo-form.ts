import type { AdminTrialPromo } from "@/shared/types/trial-promo";

/** `<input type="date">` value (YYYY-MM-DD, local) to the end of that day as an ISO instant. */
export function endOfDayIso(date: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T23:59:59`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/** ISO instant to a local `<input type="date">` value; "" when absent. */
export function isoToDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "3" or "3/50" when the promo has a cap. */
export function formatRedemptions(promo: Pick<AdminTrialPromo, "redemptions" | "maxRedemptions">): string {
  return promo.maxRedemptions === null || promo.maxRedemptions === undefined ? String(promo.redemptions) : `${promo.redemptions}/${promo.maxRedemptions}`;
}

/** Blank → null (no value); a positive whole number → that number; anything else → undefined (invalid). */
export function parseOptionalPositiveInt(raw: string): number | null | undefined {
  const text = raw.trim();
  if (!text) return null;
  if (!/^\d+$/.test(text)) return undefined;
  const n = Number(text);
  return n >= 1 ? n : undefined;
}
