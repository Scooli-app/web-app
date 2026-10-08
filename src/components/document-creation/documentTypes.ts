import { Routes } from "@/shared/types";
import type { DocumentTypeConfig } from "./types";

// Display strings (title/description/placeholder) come from the
// `documentCreation.types.<id>` and `enums.documentType.<id>` catalogue keys —
// see FormHeader.tsx and FormActions.tsx. Kept out of this data so they aren't
// duplicated and frozen at module load.
export const documentTypes: Record<string, DocumentTypeConfig> = {
  lessonPlan: {
    id: "lessonPlan",
    redirectPath: Routes.LESSON_PLAN_EDITOR,
  },
  quiz: {
    id: "quiz",
    redirectPath: Routes.QUIZ_EDITOR,
  },
  test: {
    id: "test",
    redirectPath: Routes.TEST_EDITOR,
  },
  worksheet: {
    id: "worksheet",
    redirectPath: Routes.WORKSHEET_EDITOR,
  },
  presentation: {
    id: "presentation",
    redirectPath: Routes.PRESENTATION_EDITOR,
  },
};
