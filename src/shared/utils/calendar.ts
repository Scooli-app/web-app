/** Shared date/calendar utilities used across calendar pages and components. */

/**
 * Format a Date as YYYY-MM-DD using local timezone components.
 * Never use `toISOString().slice(0,10)` — it converts to UTC which shifts
 * the date for users in UTC+ timezones (e.g. Portugal WEST = UTC+1 in summer).
 */
export function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Returns the Monday of the week containing `date` (local time). */
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatWeekLabel(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("pt-PT", { day: "numeric", month: "short" });
  return `${fmt(weekStart)} – ${fmt(end)}`;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m || m.length < 3) return null;
  return {
    r: parseInt(m[0], 16),
    g: parseInt(m[1], 16),
    b: parseInt(m[2], 16),
  };
}

/** Mon–Sun abbreviated day labels in Portuguese. */
export const DAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;
