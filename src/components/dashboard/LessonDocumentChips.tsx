"use client";

import {
  companionTypesFor,
  isDocumentInProgress,
  visibleDocuments,
  type CompanionType,
} from "@/components/dashboard/weekWindow";
import { useAccountAccess } from "@/hooks/useAccountAccess";
import { ApiRequestError, UpgradeLimitError } from "@/services/api/client";
import { generateLesson, generateLessonDocument } from "@/services/api/timetable.service";
import { Routes } from "@/shared/types";
import type { MyWeekLesson, MyWeekLessonDocument } from "@/shared/types/my-week";
import { isUpgradeReason } from "@/shared/types/plan-limits";
import { cn } from "@/shared/utils/utils";
import { selectIsPresentationCreationEnabled, selectIsWorksheetCreationEnabled } from "@/store/features/selectors";
import { generationStore } from "@/store/generationStore";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { openUpgradeModalForReason, setUpgradeModalOpen } from "@/store/ui/uiSlice";
import type { AppDispatch } from "@/store/store";
import { useAuth } from "@clerk/nextjs";
import type { RunStates } from "@/components/dashboard/usePrepareLessonSet";
import { AlertCircle, Check, CircleDashed, Loader2, Lock, Plus, RotateCcw, Target } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import posthog from "posthog-js";
import { useState } from "react";
import { toast } from "sonner";

const DOCUMENT_ROUTES: Record<string, string> = {
  lessonPlan: Routes.LESSON_PLAN,
  worksheet: Routes.WORKSHEET,
  quiz: Routes.QUIZ,
  presentation: Routes.PRESENTATION,
  test: Routes.TEST,
};

type Translate = (key: string) => string;

/**
 * Starts a one-click document (anything but the lesson plan) and reports failures the same way
 * everywhere. "blocked" (plan limit, already there, already running) is not a failure: no retry to offer.
 */
export async function startCompanionDocument(
  timetableId: string,
  lessonId: string,
  type: Exclude<CompanionType, "lessonPlan">,
  t: Translate,
  dispatch: AppDispatch,
  outcomeIds?: string[],
  instruction?: string,
): Promise<"started" | "blocked" | "failed"> {
  try {
    await generateLessonDocument(timetableId, lessonId, type, outcomeIds, instruction);
    return "started";
  } catch (err) {
    if (err instanceof UpgradeLimitError) {
      // The API client already opened the upgrade modal (no credits / free-plan limit).
      return "blocked";
    }
    if (err instanceof ApiRequestError && err.status === 409) {
      toast.info(err.code === "ja_existe" ? t("companionExists") : t("companionInProgress"));
      return "blocked";
    }
    if (err instanceof ApiRequestError && err.status === 403) {
      // Presentations are Pro-only: say so, not "out of credits".
      dispatch(type === "presentation" ? openUpgradeModalForReason("presentation_pro") : setUpgradeModalOpen(true));
      return "blocked";
    }
    toast.error(t("companionError"));
    posthog.captureException(err);
    return "failed";
  }
}

/**
 * Writes a lesson's plan through the existing stream (with its free-week exemption from credits),
 * marking the lesson busy meanwhile. Failures are reported here.
 */
export async function writeLessonPlan(
  timetableId: string,
  lessonId: string,
  t: Translate,
  dispatch: AppDispatch,
  getToken: () => Promise<string | null>,
): Promise<void> {
  generationStore.start(lessonId);
  let failed = false;
  try {
    await generateLesson(
      timetableId,
      lessonId,
      undefined,
      {
        onDone: () => undefined,
        onFreeLimit: (code) => {
          failed = true;
          if (isUpgradeReason(code)) dispatch(openUpgradeModalForReason(code));
        },
        onQuotaExceeded: () => {
          failed = true;
          dispatch(setUpgradeModalOpen(true));
        },
        onError: () => {
          failed = true;
          toast.error(t("companionError"));
        },
      },
      getToken,
    );
  } catch (err) {
    if (!failed) toast.error(t("companionError"));
    posthog.captureException(err);
  } finally {
    generationStore.finish(lessonId);
  }
}

interface LessonDocumentChipsProps {
  timetableId: string;
  lesson: Pick<MyWeekLesson, "id" | "slotType" | "documents">;
  /** Called once a generation has started (or finished, for the lesson plan) so the caller can refetch. */
  onChanged: () => void;
  compact?: boolean;
  /** Types this surface already offers its own way. */
  omit?: CompanionType[];
  /**
   * The lesson pop-up writes the plan through its own stream (progress, then it closes): when
   * given, the plan chip is a plain "+ Plano de aula" chip that calls this instead.
   */
  onLessonPlan?: () => void;
  /** The surface shows its own main "Preparar …" button, so the plan is a plain chip here too. */
  planAsChip?: boolean;
  /** Where each document of a "Preparar …" run is before the server lists it (the plan "writing" too). */
  runStates?: RunStates;
  /** A test on an assessment: the outcomes it must assess (ENG-209). Left out, the server uses the whole scope. */
  testOutcomeIds?: string[];
  /** The lesson dialog's "Instrução adicional": sent with every document a chip starts, like with the lesson plan. */
  instruction?: string;
}

/**
 * A lesson's documents as chips: filled = it exists (opens it), "A preparar…" while it is being
 * written, dashed "+ Tipo" = create it now in one click from the lesson's data.
 */
export function LessonDocumentChips({
  timetableId,
  lesson,
  onChanged,
  compact = false,
  omit = [],
  onLessonPlan,
  planAsChip = false,
  runStates = {},
  testOutcomeIds,
  instruction,
}: LessonDocumentChipsProps) {
  const t = useTranslations("yourWeek");
  const tVersions = useTranslations("documentVersions");
  const dispatch = useAppDispatch();
  const { getToken } = useAuth();
  const { isLocked, guard } = useAccountAccess();
  const worksheet = useAppSelector(selectIsWorksheetCreationEnabled);
  const presentation = useAppSelector(selectIsPresentationCreationEnabled);
  // Types clicked here whose document the server hasn't reported yet: keeps the chip busy.
  const [starting, setStarting] = useState<Set<CompanionType>>(new Set());

  const addable = companionTypesFor(lesson.slotType, lesson.documents, { worksheet, presentation }).filter(
    (type) => !omit.includes(type),
  );

  const markStarting = (type: CompanionType, on: boolean) =>
    setStarting((prev) => {
      const next = new Set(prev);
      if (on) next.add(type);
      else next.delete(type);
      return next;
    });

  const handleAdd = async (type: CompanionType) => {
    if (starting.has(type)) return;
    if (!guard("generate")) return;
    markStarting(type, true);
    posthog.capture("your_week_companion_generate_clicked", { document_type: type });
    try {
      if (type === "lessonPlan") {
        if (onLessonPlan) {
          onLessonPlan();
          return;
        }
        await writeLessonPlan(timetableId, lesson.id, t, dispatch, getToken);
      } else {
        await startCompanionDocument(
          timetableId,
          lesson.id,
          type,
          t,
          dispatch,
          type === "test" ? testOutcomeIds : undefined,
          instruction,
        );
      }
      onChanged();
    } finally {
      markStarting(type, false);
    }
  };

  const size = compact ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-xs sm:text-sm";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visibleDocuments(lesson.documents).map((doc: MyWeekLessonDocument) =>
        isDocumentInProgress(doc.status) ? (
          <span
            key={doc.id}
            className={cn("inline-flex items-center gap-1.5 rounded-full bg-muted font-medium text-muted-foreground", size)}
          >
            <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" aria-hidden />
            {t(`types.${doc.role}`)} · {t("docState.generating")}
          </span>
        ) : (
          // A reinforcement worksheet (a worksheet made after a check-in) is its own chip, rose and with a target,
          // so it reads apart from the lesson's normal worksheet.
          <Link
            key={doc.id}
            href={`${DOCUMENT_ROUTES[doc.documentType] ?? DOCUMENT_ROUTES[doc.role] ?? Routes.DOCUMENTS}/${doc.id}`}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full font-semibold transition-colors",
              doc.role === "reinforcement"
                ? "bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 dark:text-rose-300"
                : "bg-primary/10 text-primary hover:bg-primary/20",
              size,
            )}
          >
            {doc.role === "reinforcement" ? (
              <Target className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Check className="h-3.5 w-3.5" aria-hidden />
            )}
            {t(`types.${doc.role}`)}
            {doc.hasPendingSuggestion && (
              <span
                role="img"
                aria-label={tVersions("chip.suggestionDot")}
                title={tVersions("chip.suggestionDot")}
                data-testid="pending-suggestion-dot"
                className="h-2 w-2 shrink-0 rounded-full bg-primary ring-2 ring-primary/20"
              />
            )}
          </Link>
        ),
      )}
      {addable.map((type) => {
        // A click here outranks a run's state; the last attempt failing (to start, or on the server) offers a retry.
        const lastFailed = lesson.documents.some((d) => d.role === type && d.status === "failed");
        const state = starting.has(type)
          ? type === "lessonPlan"
            ? "writing"
            : "generating"
          : (runStates[type] ?? (lastFailed ? "failed" : undefined));
        if (state && state !== "failed") {
          return (
            <span
              key={type}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full font-medium text-muted-foreground",
                state === "waiting" ? "border border-dashed border-border" : "bg-muted",
                size,
              )}
            >
              {state === "waiting" ? (
                <CircleDashed className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" aria-hidden />
              )}
              {t(`types.${type}`)} · {t(`docState.${state}`)}
            </span>
          );
        }
        if (state === "failed") {
          return (
            <span
              key={type}
              className={cn("inline-flex items-center gap-1.5 rounded-full border border-destructive/50 text-destructive", size)}
            >
              <AlertCircle className="h-3.5 w-3.5" aria-hidden />
              {t(`types.${type}`)} · {t("docState.failed")} ·
              <button
                type="button"
                onClick={() => void handleAdd(type)}
                className="inline-flex items-center gap-1 rounded font-semibold underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <RotateCcw className="h-3 w-3" aria-hidden />
                {t("docState.retry")}
              </button>
            </span>
          );
        }
        // The dashboard's plan chip is the card's main action; in the pop-up it is one chip among others.
        const isPlan = type === "lessonPlan" && !onLessonPlan && !planAsChip;
        return (
          <button
            key={type}
            type="button"
            onClick={() => void handleAdd(type)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full font-medium transition-colors",
              isPlan
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "border border-dashed border-primary/50 text-primary hover:bg-primary/10",
              size,
            )}
          >
            {isLocked ? <Lock className="h-3.5 w-3.5" aria-hidden /> : <Plus className="h-3.5 w-3.5" aria-hidden />}
            {isPlan ? t("preparePlan") : t(`types.${type}`)}
          </button>
        );
      })}
    </div>
  );
}
