"use client";

import {
  companionTypesFor,
  isDocumentInProgress,
  visibleDocuments,
  type CompanionType,
} from "@/components/dashboard/weekWindow";
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
import { Check, Loader2, Plus } from "lucide-react";
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
 * everywhere. Returns false when it didn't start.
 */
export async function startCompanionDocument(
  timetableId: string,
  lessonId: string,
  type: Exclude<CompanionType, "lessonPlan">,
  t: Translate,
  dispatch: AppDispatch,
  outcomeIds?: string[],
): Promise<boolean> {
  try {
    await generateLessonDocument(timetableId, lessonId, type, outcomeIds);
    return true;
  } catch (err) {
    if (err instanceof UpgradeLimitError) {
      // The API client already opened the upgrade modal (no credits / free-plan limit).
    } else if (err instanceof ApiRequestError && err.status === 409) {
      toast.info(err.code === "ja_existe" ? t("companionExists") : t("companionInProgress"));
    } else if (err instanceof ApiRequestError && err.status === 403) {
      // Presentations are Pro-only: say so, not "out of credits".
      dispatch(type === "presentation" ? openUpgradeModalForReason("presentation_pro") : setUpgradeModalOpen(true));
    } else {
      toast.error(t("companionError"));
      posthog.captureException(err);
    }
    return false;
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
  /** The plan is being written by the surface that owns `onLessonPlan`. */
  lessonPlanBusy?: boolean;
  /** The surface shows its own main "Preparar …" button, so the plan is a plain chip here too. */
  planAsChip?: boolean;
  /** Types a "Preparar …" run will start: shown as busy before the server reports them. */
  busyTypes?: CompanionType[];
  /** A test on an assessment: the outcomes it must assess (ENG-209). Left out, the server uses the whole scope. */
  testOutcomeIds?: string[];
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
  lessonPlanBusy = false,
  planAsChip = false,
  busyTypes = [],
  testOutcomeIds,
}: LessonDocumentChipsProps) {
  const t = useTranslations("yourWeek");
  const dispatch = useAppDispatch();
  const { getToken } = useAuth();
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
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            {t(`types.${doc.role}`)} · {t("documentGenerating")}
          </span>
        ) : (
          <Link
            key={doc.id}
            href={`${DOCUMENT_ROUTES[doc.documentType] ?? DOCUMENT_ROUTES[doc.role] ?? Routes.DOCUMENTS}/${doc.id}`}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full bg-primary/10 font-semibold text-primary transition-colors hover:bg-primary/20",
              size,
            )}
          >
            <Check className="h-3.5 w-3.5" aria-hidden />
            {t(`types.${doc.role}`)}
          </Link>
        ),
      )}
      {addable.map((type) => {
        const busy = starting.has(type) || busyTypes.includes(type) || (type === "lessonPlan" && lessonPlanBusy);
        // The dashboard's plan chip is the card's main action; in the pop-up it is one chip among others.
        const isPlan = type === "lessonPlan" && !onLessonPlan && !planAsChip;
        return (
          <button
            key={type}
            type="button"
            disabled={busy}
            onClick={() => void handleAdd(type)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full font-medium transition-colors disabled:cursor-wait disabled:opacity-70",
              isPlan
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "border border-dashed border-primary/50 text-primary hover:bg-primary/10",
              size,
            )}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Plus className="h-3.5 w-3.5" aria-hidden />}
            {busy ? t("documentGenerating") : isPlan ? t("preparePlan") : t(`types.${type}`)}
          </button>
        );
      })}
    </div>
  );
}
