import { Routes } from "@/shared/types";
import {
  selectIsCurriculumPlanEnabled,
  selectIsPresentationCreationEnabled,
  selectIsWorksheetCreationEnabled,
} from "@/store/features/selectors";
import { useAppSelector } from "@/store/hooks";
import {
  FileText,
  GanttChart,
  HelpCircle,
  MonitorPlay,
  NotebookPen,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";

/** Key under `enums.documentType` in the message bundles. */
export type DocTypeActionId =
  | "lessonPlan"
  | "test"
  | "worksheet"
  | "quiz"
  | "presentation"
  | "curriculumPlan";

export interface DocTypeAction {
  id: DocTypeActionId;
  route: string;
  icon: LucideIcon;
  gate?: "worksheet" | "presentation" | "curriculumPlan";
}

/** Every document a teacher can start from scratch, in menu order. */
export const DOC_TYPE_ACTIONS: readonly DocTypeAction[] = [
  { id: "lessonPlan", route: Routes.LESSON_PLAN, icon: FileText },
  { id: "test", route: Routes.TEST, icon: NotebookPen },
  { id: "worksheet", route: Routes.WORKSHEET, icon: ScrollText, gate: "worksheet" },
  { id: "quiz", route: Routes.QUIZ, icon: HelpCircle },
  { id: "presentation", route: Routes.PRESENTATION, icon: MonitorPlay, gate: "presentation" },
  { id: "curriculumPlan", route: Routes.CURRICULUM_PLAN, icon: GanttChart, gate: "curriculumPlan" },
];

/** The document types this teacher can create right now (feature flags applied). */
export function useVisibleDocTypeActions(): DocTypeAction[] {
  const isWorksheetEnabled = useAppSelector(selectIsWorksheetCreationEnabled);
  const isPresentationEnabled = useAppSelector(selectIsPresentationCreationEnabled);
  const isCurriculumPlanEnabled = useAppSelector(selectIsCurriculumPlanEnabled);

  return useMemo(
    () =>
      DOC_TYPE_ACTIONS.filter((action) => {
        if (action.gate === "worksheet") return isWorksheetEnabled;
        if (action.gate === "presentation") return isPresentationEnabled;
        if (action.gate === "curriculumPlan") return isCurriculumPlanEnabled;
        return true;
      }),
    [isWorksheetEnabled, isPresentationEnabled, isCurriculumPlanEnabled],
  );
}
