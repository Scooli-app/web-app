import { Routes } from "@/shared/types";
import { SUBJECTS, SUBJECTS_BY_GRADE } from "./constants";

export type QuickCreateDocumentType =
  | "lessonPlan"
  | "quiz"
  | "test"
  | "worksheet";

export interface QuickCreateParse {
  documentType: QuickCreateDocumentType;
  /** Full original text — used as the Tema field, never mangled */
  topic: string;
  schoolYear?: number;
  subjectId?: string;
}

const CREATION_ROUTES: Record<QuickCreateDocumentType, string> = {
  lessonPlan: Routes.LESSON_PLAN,
  quiz: Routes.QUIZ,
  test: Routes.TEST,
  worksheet: Routes.WORKSHEET,
};

const TYPE_KEYWORDS: { type: QuickCreateDocumentType; keywords: string[] }[] = [
  { type: "lessonPlan", keywords: ["plano de aula", "plano"] },
  { type: "worksheet", keywords: ["ficha de trabalho", "ficha"] },
  { type: "test", keywords: ["teste"] },
  { type: "quiz", keywords: ["quiz"] },
];

/** Lowercase + strip accents so "Matemática" matches "matematica" */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Word-boundary-aware index of a normalized keyword in normalized text.
 * Tolerates a plural suffix ("planos", "fichas", "testes").
 */
function indexOfKeyword(haystack: string, keyword: string): number {
  const re = new RegExp(
    `(?<![a-z0-9])${escapeRegExp(keyword)}(?:e?s)?(?![a-z0-9])`,
  );
  const match = re.exec(haystack);
  return match ? match.index : -1;
}

// Longest labels first so "matematica a" wins over "matematica" when both apply
const SUBJECTS_BY_LABEL_LENGTH = [...SUBJECTS].sort(
  (a, b) => b.label.length - a.label.length,
);

/**
 * Best-effort extraction of document type, school year and subject from a
 * teacher's free-text request (e.g. "plano de aula sobre frações para o 3.º ano").
 *
 * Vague inputs like "frações" are fine: the type falls back to lesson plan and
 * year/subject stay undefined — the creation form asks for whatever is missing.
 */
export function parseQuickCreate(input: string): QuickCreateParse {
  const topic = input.trim();
  const norm = normalize(topic);

  // Document type: earliest keyword occurrence wins
  let documentType: QuickCreateDocumentType = "lessonPlan";
  let bestIndex = Number.POSITIVE_INFINITY;
  for (const { type, keywords } of TYPE_KEYWORDS) {
    for (const keyword of keywords) {
      const index = indexOfKeyword(norm, keyword);
      if (index !== -1 && index < bestIndex) {
        bestIndex = index;
        documentType = type;
      }
    }
  }

  // School year: "3.º ano", "3º ano", "3o ano", "3 ano"
  let schoolYear: number | undefined;
  const yearMatch = norm.match(/\b(\d{1,2})\s*(?:\.\s*)?(?:[ºo°]\s*)?ano\b/);
  if (yearMatch) {
    const year = Number(yearMatch[1]);
    if (year >= 1 && year <= 12) {
      schoolYear = year;
    }
  }

  // Subject: explicit mention of a known subject label
  let subjectId: string | undefined;
  for (const subject of SUBJECTS_BY_LABEL_LENGTH) {
    if (indexOfKeyword(norm, normalize(subject.label)) !== -1) {
      subjectId = subject.id;
      break;
    }
  }

  // Drop the subject if it doesn't exist for the detected year (e.g.
  // "matemática" in the 10.º ano, where only Matemática A/B exist) —
  // the form would reset it anyway.
  if (subjectId && schoolYear) {
    const validSubjects = SUBJECTS_BY_GRADE[String(schoolYear)];
    if (validSubjects && !validSubjects.includes(subjectId)) {
      subjectId = undefined;
    }
  }

  return { documentType, topic, schoolYear, subjectId };
}

/** Build the creation-page URL with prefill query params */
export function buildQuickCreateUrl(parse: QuickCreateParse): string {
  const params = new URLSearchParams();
  params.set("topic", parse.topic);
  if (parse.schoolYear) params.set("year", String(parse.schoolYear));
  if (parse.subjectId) params.set("subject", parse.subjectId);
  return `${CREATION_ROUTES[parse.documentType]}?${params.toString()}`;
}
