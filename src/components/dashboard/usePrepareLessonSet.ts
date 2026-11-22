"use client";

import { startCompanionDocument } from "@/components/dashboard/LessonDocumentChips";
import { preparationCost, suggestedDocuments } from "@/components/dashboard/lessonSuggestions";
import { companionTypesFor, type CompanionType } from "@/components/dashboard/weekWindow";
import { useAccountAccess } from "@/hooks/useAccountAccess";
import { invalidatePlanLimits, usePlanLimits } from "@/hooks/usePlanLimits";
import type { MyWeekLessonDocument } from "@/shared/types/my-week";
import { selectIsPresentationCreationEnabled, selectIsWorksheetCreationEnabled } from "@/store/features/selectors";
import { selectHasEffectivePro } from "@/store/entitlements/selectors";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import posthog from "posthog-js";
import { useTranslations } from "next-intl";
import { useState } from "react";

/**
 * Where a document of a "Preparar …" run is before the server lists it: the plan being written, a companion waiting
 * for the plan (it is written from the plan's text), started and generating, or failed to start.
 */
export type RunState = "writing" | "waiting" | "generating" | "failed";
export type RunStates = Partial<Record<CompanionType, RunState>>;

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
  /** The lesson dialog's "Instrução adicional": goes with every document of the set, not only the lesson plan. */
  instruction?: string;
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
  instruction,
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
  const { guard, hasCredits } = useAccountAccess();
  const [preparing, setPreparing] = useState(false);
  // Each document of this run until the server lists it; kept per lesson, as the pop-up reuses this hook across lessons.
  const [run, setRun] = useState<{ lessonId: string; states: RunStates }>({
    lessonId,
    states: {},
  });
  const runStates = run.lessonId === lessonId ? run.states : {};
  const setState = (type: CompanionType, state: RunState | null) =>
    setRun((prev) => {
      const states = { ...(prev.lessonId === lessonId ? prev.states : {}) };
      if (state) states[type] = state;
      else delete states[type];
      return { lessonId, states };
    });

  const suggested: CompanionType[] = ready
    ? suggestedDocuments(slotType, subject, documents, { worksheet, presentation }).filter(
        (type) => !(type === "test" && testBlocked),
      )
    : [];
  // Every document the lesson still lacks, for the "all documents" choice of the prepare menu.
  const allMissing: CompanionType[] = ready
    ? companionTypesFor(slotType, documents, { worksheet, presentation }).filter(
        (type) => !(type === "test" && testBlocked),
      )
    : [];
  // Only old free accounts still run on credits: nobody else sees a cost.
  const labelFor = (types: CompanionType[]) => {
    const setCost = hasCredits ? preparationCost([{ slotDate, types }], limits) : null;
    return [
      t("prepareSet", { items: types.map((type) => t(`shortTypes.${type}`)).join(" + ") }),
      setCost === null ? null : t("cost", { count: setCost }),
    ]
      .filter(Boolean)
      .join(" · ");
  };
  const label = labelFor(suggested);
  // The sets the prepare menu offers: the suggestion first, then every missing document, then the plan alone.
  const sets = [suggested, allMissing, allMissing.includes("lessonPlan") ? (["lessonPlan"] as CompanionType[]) : []]
    .filter((set, i, all) => set.length > 0 && all.findIndex((other) => other.join() === set.join()) === i)
    .map((types) => ({ types, label: labelFor(types) }));

  const prepare = async (types: CompanionType[] = suggested) => {
    if (preparing || types.length === 0) return;
    if (!guard("generate")) return;
    posthog.capture("lesson_prepare_set_clicked", { surface, types, slot_type: slotType });
    setPreparing(true);
    const withPlan = types.includes("lessonPlan");
    const failed: CompanionType[] = [];
    const states: RunStates = {};
    for (const type of types) states[type] = type === "lessonPlan" ? "writing" : withPlan ? "waiting" : "generating";
    setRun({ lessonId, states });
    try {
      if (withPlan) {
        await generatePlan();
        invalidatePlanLimits(); // the first plan claims the free week
        for (const type of types) if (type !== "lessonPlan") setState(type, "generating");
        setState("lessonPlan", null);
        onDone();
      }
      for (const type of types) {
        if (type === "lessonPlan") continue;
        const started = await startCompanionDocument(
          timetableId,
          lessonId,
          type,
          tWeek,
          dispatch,
          type === "test" ? testOutcomeIds : undefined,
          instruction,
        );
        // Started: the server lists it as generating from now on.
        if (!started) failed.push(type);
        setState(type, started ? null : "failed");
        onDone(); // the started document shows as written now, not when the whole set is through
      }
    } finally {
      // Only a failure stays, with its "Tentar de novo"; the rest is on the server's list by now.
      const left: RunStates = {};
      for (const type of failed) left[type] = "failed";
      setRun({ lessonId, states: left });
      setPreparing(false);
      onDone();
    }
  };

  return { suggested, sets, label, preparing, prepare, runStates };
}
