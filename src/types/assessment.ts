/** TS mirror of chalkboard's assessment.schema.json (schemaVersion 1). Nullable = optional in the schema. */

export type AssessmentDocumentType = "test" | "worksheet" | "quiz";

export type ExerciseType =
  | "multiple_choice" | "true_false" | "fill_gaps" | "matching" | "ordering" | "short_answer"
  | "long_answer" | "calculation" | "table_completion" | "classify" | "wordsearch" | "label_image";

export type HeaderField = "name" | "number" | "class" | "date" | "duration" | "grade" | "teacher" | "guardian";

export interface AssessmentHeader {
  school: string | null;
  gradeClass: string | null;
  /** Minutes. */
  duration: number | null;
  showFields: HeaderField[];
}

export interface AssessmentOption {
  id: string;
  text: string;
  /** Matching only. */
  side: "left" | "right" | null;
}

export interface AssessmentAnswer {
  optionIds: string[] | null;
  text: string | null;
  /** [leftId, rightId] */
  pairs: [string, string][] | null;
  order: string[] | null;
  truth: { statementId: string; value: boolean; correction: string | null }[] | null;
  /** fill_gaps: correct word per blank. */
  gaps: string[] | null;
  /** label_image: the answer for each numbered target. */
  labels: { labelId: string; text: string }[] | null;
  /** table_completion: the answer for each "___" cell (row/col from 0, header row excluded). */
  cells: { row: number; col: number; text: string }[] | null;
  /** classify: the category of each item (option). */
  classes: { optionId: string; categoryId: string }[] | null;
}

/** label_image target. `x`/`y` (0–1 of the image) place its numbered pin; null when not placed. */
export interface AssessmentLabel {
  id: string;
  n: number;
  /** Clue printed for the student; never the answer. */
  hint: string | null;
  x: number | null;
  y: number | null;
}

export interface AssessmentCriterion {
  level: string;
  points: number;
  descriptor: string;
}

export interface AssessmentMedia {
  imageRef: string | null;
  placeholder: { query: string; alt: string } | null;
}

export interface AssessmentExercise {
  id: string;
  kind: "exercise";
  type: ExerciseType;
  prompt: string;
  options: AssessmentOption[] | null;
  answer: AssessmentAnswer;
  explanation: string | null;
  points: number | null;
  answerSpace: { kind: "lines" | "box" | "none"; count: number | null };
  media: AssessmentMedia | null;
  /** Candidate codes from generation; cleared to [] once resolved to aeOutcomeIds. */
  aeCodes: string[];
  aeOutcomeIds: string[];
  criteria: AssessmentCriterion[] | null;
  /** label_image only. */
  labels: AssessmentLabel[] | null;
  /** wordsearch only: the words to find, spelled normally. */
  words: string[] | null;
  /** wordsearch only: built by the server from `words` on save (never edited by hand). */
  grid: WordGrid | null;
  /** table_completion only: one cell per header in every row; a "___" cell is a blank the student fills in. */
  table: { headers: string[]; rows: string[][] } | null;
  /** classify only: the boxes the items (options) go into. */
  categories: { id: string; label: string }[] | null;
}

/** Plain A–Z rows (accents folded); each placement spells one grid word from (row, col). */
export interface WordGrid {
  size: number;
  rows: string[];
  placements: { word: string; row: number; col: number; dir: "right" | "down" | "diagonal" }[];
}

export interface AssessmentReadingBox {
  id: string;
  kind: "reading";
  title: string | null;
  body: string;
  media: AssessmentMedia | null;
}

export type AssessmentItem = AssessmentExercise | AssessmentReadingBox;

export interface AssessmentSection {
  id: string;
  title: string;
  instructions: string | null;
  items: AssessmentItem[];
}

export interface AssessmentDocument {
  schemaVersion: 1;
  documentType: AssessmentDocumentType;
  title: string | null;
  header: AssessmentHeader;
  /** Null = no points at all. */
  targetTotal: number | null;
  sections: AssessmentSection[];
}

export interface ExportFile {
  variant: "student" | "teacher";
  filename: string;
  contentType: string;
  url: string;
}

export interface AeOutcome {
  id: string;
  topicLeaf: string;
  text: string;
  retired: boolean;
}
