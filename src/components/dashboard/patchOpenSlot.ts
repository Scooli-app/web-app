/**
 * Apply a status/field change from a generation stream to the open pop-up,
 * but only if the pop-up still shows the lesson that stream belongs to — the
 * teacher may have closed it and opened another lesson meanwhile.
 */
export function patchOpenSlot<T extends { id: string }>(
  open: T | null,
  slotId: string,
  patch: Partial<T>,
): T | null {
  if (!open || open.id !== slotId) return open;
  return { ...open, ...patch };
}
