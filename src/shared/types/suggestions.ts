/** "O que fazer a seguir" (ENG-208). Contract: chalkboard PR 287 (GET /suggestions, GET /timetable/{id}/suggestions). */

export type SuggestionKind = "prepare_next" | "replan_not_held" | "reinforce" | "check_in";

export interface Suggestion {
  kind: SuggestionKind;
  /** Null for check_in, which is about all turmas. */
  timetableId: string | null;
  turmaTitle: string | null;
  /** The lesson the step is about. Null for check_in. */
  slotId: string | null;
  /** YYYY-MM-DD. Null for check_in. */
  slotDate: string | null;
  topicTitle: string | null;
  outcomeIds: string[];
  outcomeTexts: string[];
  /** Pending check-ins. Set only for check_in. */
  count: number | null;
}
