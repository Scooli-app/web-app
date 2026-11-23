import { SUBJECTS } from "@/components/document-creation/constants";
import { SCHOOL_SOURCE_SUBJECTS_MAX, SOURCE_NAME_MAX } from "@/shared/types/sources";

// Edge-case content for source lists: the longest name the API takes (200 code points), no spaces, accents and emoji.
const CHUNK = "Critérios_de_avaliação_📚_Matemática_";
export const LONG_NAME = Array.from(CHUNK.repeat(10)).slice(0, SOURCE_NAME_MAX).join("");
export const ALL_YEARS = Array.from({ length: 12 }, (_, i) => i + 1);
/** The most subjects a school source can carry. */
export const MAX_SUBJECTS = [...new Set(SUBJECTS.map((s) => s.value))].slice(0, SCHOOL_SOURCE_SUBJECTS_MAX);
