/** A required creation-form field, in the order the form asks for them. */
export type MissingField = "topic" | "schoolYear" | "subject" | "template" | "worksheetVariant";

export interface MissingFieldState {
  topic?: string;
  schoolYear?: number | null;
  subject?: string | null;
  templateId?: string | null;
  worksheetVariant?: string | null;
}

/** Every required field still empty, in form order, so the disabled Create button can say what's missing. */
export function getMissingFields(
  state: MissingFieldState,
  opts: { needsTemplate: boolean; needsWorksheetVariant: boolean },
): MissingField[] {
  const missing: MissingField[] = [];
  if (!state.topic?.trim()) missing.push("topic");
  if (!state.schoolYear) missing.push("schoolYear");
  if (!state.subject) missing.push("subject");
  if (opts.needsTemplate && !state.templateId) missing.push("template");
  if (opts.needsWorksheetVariant && !state.worksheetVariant) missing.push("worksheetVariant");
  return missing;
}
