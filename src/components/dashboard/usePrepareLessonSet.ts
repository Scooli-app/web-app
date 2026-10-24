"use client";

import { startCompanionDocument } from "@/components/dashboard/LessonDocumentChips";
import { preparationCost, suggestedDocuments } from "@/components/dashboard/lessonSuggestions";
import type { CompanionType } from "@/components/dashboard/weekWindow";
import { invalidatePlanLimits, usePlanLimits } from "@/hooks/usePlanLimits";
import type { MyWeekLessonDocument } from "@/shared/types/my-week";
import { selectIsPresentationCreationEnabled, selectIsWorksheetCreationEnabled } from "@/store/features/selectors";
import { selectHasEffectivePro } from "@/store/entitlements/selectors";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import posthog from "posthog-js";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface PrepareLessonSetArgs {
  timetableId: string;
  lessonId: string;
  slotDate: string;
  slotType: string;
  /** The turma's subject (its stored value, e.g. "History"). */
  subject: string | null | undefined;
  documents: MyWeekLessonDocument[];
  /** False while documents load or the plan is being written: nothing is suggested then. */
  ready: boolean;
  /** Writes the lesson plan through the caller's own stream; resolves when it has ended. */
  generatePlan: () => void | Promise<void>;
  /** After everything has started (the caller refetches). */
  onDone: () => void;
  /** Where the click came from, for analytics. */
  surface: "dashboard" | "lesson_popup";
  /** A test's outcomes, ticked under "Vai avaliar" (ENG-209); undefined lets the backend use the whole scope. */
  testOutcomeIds?: string[];
  /** Nothing is ticked under "Vai avaliar": no test is suggested, as the lesson's test chip is hidden too. */
  testBlocked?: boolean;
}

/**
 * The one "prepare what this lesson needs" action, shared by the dashboard card and the lesson
 * pop-up so both always suggest the same set: the plan first (the rest build on it), then the
 * other documents. Only what's missing is suggested, and the label carries its cost.
 */
export function usePrepareLessonSet({
  timetableId,
  lessonId,
  slotDate,
  slotType,
  subject,
  documents,
  ready,
  generatePlan,
  onDone,
  surface,
  testOutcomeIds,
  testBlocked = false,
}: PrepareLessonSetArgs) {
  const t = useTranslations("calendar.slotDialog");
  const tWeek = useTranslations("yourWeek");
  const dispatch = useAppDispatch();
  const worksheet = useAppSelector(selectIsWorksheetCreationEnabled);
  // Presentations are Pro-only on the server: never suggest one a free teacher would be refused.
  const presentationFlag = useAppSelector(selectIsPresentationCreationEnabled);
  const isPro = useAppSelector(selectHasEffectivePro);
  const presentation = presentationFlag && isPro;
  const { limits } = usePlanLimits();
  const [preparing, setPreparing] = useState(false);
  // Types of this run that haven't started on the server yet: shown as "A preparar…" right away.
  const [inFlight, setInFlight] = useState<CompanionType[]>([]);

  const suggested: CompanionType[] = ready
    ? suggestedDocuments(slotType, subject, documents, { worksheet, presentation }).filter(
        (type) => !(type === "test" && testBlocked),
      )
    : [];
  const cost = preparationCost([{ slotDate, types: suggested }], limits);
  const label = [
    t("prepareSet", { items: suggested.map((type) => t(`shortTypes.${type}`)).join(" + ") }),
    cost === null ? null : t("cost", { count: cost }),
  ]
    .filter(Boolean)
    .join(" · ");

  const prepare = async () => {
    if (preparing || suggested.length === 0) return;
    const types = suggested;
    posthog.capture("lesson_prepare_set_clicked", { surface, types, slot_type: slotType });
    setPreparing(true);
    setInFlight(types);
    try {
      if (types.includes("lessonPlan")) {
        await generatePlan();
        invalidatePlanLimits(); // the first plan claims the free week
        setInFlight((prev) => prev.filter((x) => x !== "lessonPlan"));
        onDone();
      }
      for (const type of types) {
        if (type === "lessonPlan") continue;
        await startCompanionDocument(timetableId, lessonId, type, tWeek, dispatch, type === "test" ? testOutcomeIds : undefined);
        setInFlight((prev) => prev.filter((x) => x !== type));
        onDone(); // the started document shows as written now, not when the whole set is through
      }
    } finally {
      setInFlight([]);
      setPreparing(false);
      onDone();
    }
  };

  return { suggested, label, preparing, prepare, inFlight };
}
