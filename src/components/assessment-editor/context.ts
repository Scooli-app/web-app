"use client";

import type { AeOutcome } from "@/types/assessment";
import { createContext, useContext } from "react";

export interface AssessmentEditorContextValue {
  studentView: boolean;
  /** Below 768 px: single column, editing in bottom sheets, no drag. */
  phone: boolean;
  /** id → outcome; null = unknown id; missing key = still loading. */
  aeLookup: Record<string, AeOutcome | null>;
  /** False for an English document: the AE outcomes exist only in Portuguese, so no chips, count or picker. */
  showAe: boolean;
  /** Null when the document has no subject/year to search by. */
  searchAe: ((q: string) => Promise<AeOutcome[]>) | null;
  rememberAe: (outcome: AeOutcome) => void;
  /** Opens the image picker; the editor calls `onPicked` with the chosen image URL. */
  requestImage: (onPicked: (url: string) => void) => void;
  /** Exercise id → why its answer key needs a look (the server's maths check). Editor only. */
  answerChecks?: Record<string, string>;
  /** "Está correto": the teacher confirmed a flagged exercise. */
  confirmCheck?: (exerciseId: string) => void;
  /** The document's language, for what is printed on the page (as in its files). Unknown: the interface's. */
  english?: boolean;
}

/** Below md, every button, input and menu/select item inside gets a 44 px touch target and 16 px text (no iOS focus zoom); textareas grow with their text instead of clipping it
 * (field-sizing: where unsupported, e.g. older Safari, they keep their rows and scroll). */
export const PHONE_TOUCH =
  "max-md:[&_button:not([role=switch]):not([role=checkbox])]:min-h-11 max-md:[&_button:not([role=switch]):not([role=checkbox])]:min-w-11 max-md:[&_input]:min-h-11 max-md:[&_input]:text-base max-md:[&_textarea]:text-base max-md:[&_textarea]:min-h-11 max-md:[&_textarea]:[field-sizing:content] max-md:[&_textarea]:max-h-72 max-md:[&_[role=menuitem]]:min-h-11 max-md:[&_[role=option]]:min-h-11";

export const AssessmentEditorContext = createContext<AssessmentEditorContextValue | null>(null);

export function useAssessmentEditor() {
  const ctx = useContext(AssessmentEditorContext);
  if (!ctx) throw new Error("useAssessmentEditor outside AssessmentEditorContext");
  return ctx;
}
