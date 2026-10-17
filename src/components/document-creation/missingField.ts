/** A required creation-form field, in the order the form asks for them. */
export type MissingField = "topic" | "schoolYear" | "subject" | "template" | "worksheetVariant";

export interface MissingFieldState {
  topic?: string;
  schoolYear?: number | null;
  subject?: string | null;
  templateId?: string | null;
  worksheetVariant?: string | null;
}

/** The first required field still empty, so the disabled Create button can say what's missing. */
export function getMissingField(
  state: MissingFieldState,
  opts: { needsTemplate: boolean; needsWorksheetVariant: boolean },
): MissingField | null {
  if (!state.topic?.trim()) return "topic";
  if (!state.schoolYear) return "schoolYear";
  if (!state.subject) return "subject";
  if (opts.needsTemplate && !state.templateId) return "template";
  if (opts.needsWorksheetVariant && !state.worksheetVariant) return "worksheetVariant";
  return null;
}
