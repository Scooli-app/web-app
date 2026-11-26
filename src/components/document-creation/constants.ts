import { translate } from "@/i18n/translate";
import { TeachingMethod } from "@/shared/types";
import { BookOpen, Heart, Monitor, Users, Zap } from "lucide-react";
import {
  AMBIGUOUS_COMPONENTS_SUBJECTS,
  GRADE_GROUPS,
  SUBJECT_CATEGORY_ORDER,
  SUBJECTS,
  SUBJECTS_BY_GRADE,
  type GradeGroup,
  type Subject,
} from "@/lib/curriculum/countryCatalog";

// The Portuguese catalog lives in lib/curriculum/countryCatalog.ts. These
// re-exports keep the existing PT-only call sites working unchanged.
export {
  AMBIGUOUS_COMPONENTS_SUBJECTS,
  GRADE_GROUPS,
  SUBJECT_CATEGORY_ORDER,
  SUBJECTS,
  SUBJECTS_BY_GRADE,
  type GradeGroup,
  type Subject,
};


/** Localized display label for a grade-group header (e.g. "1º Ciclo" / "1st Cycle"). */
export function translateGradeGroupLabel(groupId: string): string {
  return translate(`documentCreation.options.gradeGroups.${groupId}`);
}

/** Localized display label for a single grade (e.g. "5.º ano" / "Year 5"), keyed by its numeric id. */
export function translateGradeLabel(gradeId: string): string {
  return translate("documentCreation.options.gradeLabel", { grade: gradeId });
}

/** Shared palette for turma/timetable color-coding — used by both the creation wizard and the edit dialog. */
export const TIMETABLE_COLORS = [
  "#7F77DD", "#2BB5A0", "#E27060", "#4A90D9",
  "#F5A623", "#5CB85C", "#E91E8C", "#9E9E9E",
] as const;

export const LESSON_TIMES = [
  { id: "30", label: "30 min", value: 30 },
  { id: "45", label: "45 min", value: 45 },
  { id: "60", label: "60 min", value: 60 },
  { id: "90", label: "90 min", value: 90 },
] as const;

// Display label/description for each method live in the `documentCreation.teachingMethods.<id>`
// catalogue keys (see TeachingMethodSection.tsx) — kept out of this data so they aren't
// duplicated and frozen at module load.
export const TEACHING_METHODS = [
  {
    id: TeachingMethod.ACTIVE,
    icon: Users,
    color: "from-blue-500 to-cyan-400",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    iconBg: "bg-blue-100",
  },
  {
    id: TeachingMethod.LECTURE,
    icon: BookOpen,
    color: "from-purple-500 to-violet-400",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    iconBg: "bg-purple-100",
  },
  {
    id: TeachingMethod.PRACTICAL,
    icon: Zap,
    color: "from-amber-500 to-orange-400",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    iconBg: "bg-amber-100",
  },
  {
    id: TeachingMethod.SOCIAL_EMOTIONAL,
    icon: Heart,
    color: "from-rose-500 to-pink-400",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
    iconBg: "bg-rose-100",
  },
  {
    id: TeachingMethod.INTERACTIVE,
    icon: Monitor,
    color: "from-emerald-500 to-teal-400",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    iconBg: "bg-emerald-100",
  },
] as const;

export type LessonTime = (typeof LESSON_TIMES)[number];
export type TeachingMethodConfig = (typeof TEACHING_METHODS)[number];

/** Translates an English backend subject value to its localized display label. */
export function translateSubject(englishValue: string): string {
  const subject = SUBJECTS.find((s) => s.value === englishValue);
  return subject ? translateSubjectLabel(subject.id) : englishValue;
}

/**
 * Localized display label for a subject, keyed by its stable id. Brazilian
 * subjects use their pt-BR display name as id, so an id outside the Portuguese
 * catalog is already its label.
 */
export function translateSubjectLabel(id: string): string {
  return SUBJECTS.some((s) => s.id === id) ? translate(`documentCreation.options.subjects.${id}`) : id;
}

/** Maps a subject's Portuguese `category` grouping key to a stable slug used for translation. */
const SUBJECT_CATEGORY_SLUGS: Record<string, string> = {
  "Disciplinas Gerais": "general",
  "Ciências": "sciences",
  "Ciências Sociais e Humanas": "socialSciences",
  "Línguas": "languages",
  "Artes": "arts",
  "Literatura": "literature",
  "Educação Física": "physicalEducation",
  "Tecnologia": "technology",
  "Cidadania": "citizenship",
  "Religião": "religion",
};

/** Localized display label for a subject category (the `category` field on `SUBJECTS`). */
export function translateSubjectCategory(category: string): string {
  const slug = SUBJECT_CATEGORY_SLUGS[category];
  return slug ? translate(`documentCreation.options.subjectCategories.${slug}`) : category;
}


/** Subjects available for the given grade level (SUBJECTS_BY_GRADE id, e.g. "5"), or all subjects if no grade is chosen yet. */
export function getSubjectsForGrade(gradeLevel: string): Subject[] {
  const ids = gradeLevel ? (SUBJECTS_BY_GRADE[gradeLevel] ?? []) : SUBJECTS.map((s) => s.id);
  return SUBJECTS.filter((s) => ids.includes(s.id));
}

/** Groups subjects by category, in SUBJECT_CATEGORY_ORDER order, dropping empty categories. */
export function groupSubjectsByCategory(subjects: Subject[]): { category: string; subjects: Subject[] }[] {
  const byCategory = subjects.reduce<Record<string, Subject[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});
  // Categories outside SUBJECT_CATEGORY_ORDER (e.g. Brazil's) are appended so they are not dropped.
  const extra = Object.keys(byCategory).filter((c) => !SUBJECT_CATEGORY_ORDER.includes(c));
  return [...SUBJECT_CATEGORY_ORDER, ...extra]
    .map((category) => ({ category, subjects: byCategory[category] ?? [] }))
    .filter((g) => g.subjects.length > 0);
}

