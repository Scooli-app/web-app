import type { DayKey, PreviewSlot } from "@/lib/timetable/planToTimetable";

const JS_DAY_TO_KEY: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function slotDayKey(slot: PreviewSlot): DayKey {
  return JS_DAY_TO_KEY[new Date(`${slot.date}T00:00:00`).getDay()];
}

/** Ids from `fromId` to `toId` (both included) in list order, for shift-click range selection. */
export function slotIdsBetween(slots: PreviewSlot[], fromId: string, toId: string): string[] {
  const from = slots.findIndex((s) => s.id === fromId);
  const to = slots.findIndex((s) => s.id === toId);
  if (from === -1 || to === -1) return [toId];
  const [start, end] = from < to ? [from, to] : [to, from];
  return slots.slice(start, end + 1).map((s) => s.id);
}

export function withSelection(selected: Set<string>, ids: string[], on: boolean): Set<string> {
  const next = new Set(selected);
  for (const id of ids) {
    if (on) next.add(id);
    else next.delete(id);
  }
  return next;
}

/** True when the group is non-empty and every id in it is selected. */
export function allSelected(selected: Set<string>, ids: string[]): boolean {
  return ids.length > 0 && ids.every((id) => selected.has(id));
}
