/** True when the lesson slot has a non-blank topic title. */
export function hasTopic(slot: { topicTitle?: string | null }): boolean {
  return !!slot.topicTitle && slot.topicTitle.trim().length > 0;
}

/**
 * Whether a slot may be listed in the UI. Lessons without a topic are never shown;
 * holidays and assessments keep their own display (they have fallback labels).
 */
export function isListableSlot(slot: { slotType?: string; topicTitle?: string | null }): boolean {
  return slot.slotType === "HOLIDAY" || slot.slotType === "ASSESSMENT" || hasTopic(slot);
}
