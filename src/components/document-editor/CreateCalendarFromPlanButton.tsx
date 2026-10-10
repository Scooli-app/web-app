"use client";
import { AiDisclaimer } from "@/components/ui/ai-disclaimer";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buildCreateTimetableParamsFromPlan,
  buildPlanAutoTitle,
} from "@/lib/timetable/planToTimetable";
import { AlreadyCoveredSection } from "@/components/document-creation/AlreadyCoveredSection";
import { ClassTopicsProgress } from "@/components/calendar/ClassTopicsProgress";
import { useCreateClassWithTopics } from "@/components/calendar/useCreateClassWithTopics";
import { getTimetablesByLinkedPlan } from "@/services/api/timetable.service";
import { clampPeriodToFreeWindow } from "@/lib/freePlanWindow";
import { isClassLimitReached, usePlanLimits } from "@/hooks/usePlanLimits";
import { useAppDispatch } from "@/store/hooks";
import { openUpgradeModalForReason } from "@/store/ui/uiSlice";
import { Routes } from "@/shared/types/routes";
import type { Document } from "@/shared/types/document";
import { CalendarPlus, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import posthog from "posthog-js";

interface CreateCalendarFromPlanButtonProps {
  plan: Document;
  disabled?: boolean;
  className?: string;
}

/**
 * One-click "Criar turma" for a finished term-plan (Planificação) document.
 * Confirms the turma's name (and optional class label) via a small dialog —
 * useful when a teacher already has another turma with the same subject/grade
 * — then runs the same create → wait-for-topics sequence as the calendar/novo
 * wizard (useCreateClassWithTopics), keeping the dialog open on its progress
 * until the calendar is ready — see lib/timetable/planToTimetable.ts for the
 * shared mapping logic.
 */
export default function CreateCalendarFromPlanButton({
  plan,
  disabled = false,
  className = "",
}: CreateCalendarFromPlanButtonProps) {
  const t = useTranslations("editor.calendarButton");
  const router = useRouter();
  const classCreation = useCreateClassWithTopics();
  const dispatch = useAppDispatch();
  const { limits } = usePlanLimits();
  const isCreating = classCreation.busy;
  // From "Criar turma" until the dialog closes, it shows the progress instead of the form.
  const showProgress = classCreation.phase !== "idle";
  const [existingTimetableId, setExistingTimetableId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [classLabel, setClassLabel] = useState("");
  const [alreadyCoveredNotes, setAlreadyCoveredNotes] = useState("");

  useEffect(() => {
    let cancelled = false;
    setChecking(true);
    getTimetablesByLinkedPlan(plan.id)
      .then((matches) => {
        if (!cancelled) setExistingTimetableId(matches[0]?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setExistingTimetableId(null);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [plan.id]);

  const openClass = (id: string | null) => {
    if (id) router.push(`${Routes.CALENDAR}/${id}`);
  };

  // Once created, the button becomes "Ver turma" — but not while the dialog is
  // still showing that turma's progress.
  if (existingTimetableId && !isCreating) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => router.push(`${Routes.CALENDAR}/${existingTimetableId}`)}
        className={`flex items-center gap-2 ${className}`}
      >
        <CalendarPlus className="h-4 w-4" />
        <span className="hidden sm:inline">{t("viewClass")}</span>
      </Button>
    );
  }

  const openNameDialog = () => {
    if (isClassLimitReached(limits)) {
      dispatch(openUpgradeModalForReason("free_class_limit"));
      return;
    }
    const params = buildCreateTimetableParamsFromPlan(plan);
    if (!params) {
      // Imported plan / no weekly schedule — deep-link into the wizard, pre-filled.
      router.push(`${Routes.CALENDAR_NEW}?planId=${plan.id}`);
      return;
    }
    setName(buildPlanAutoTitle(plan));
    setClassLabel("");
    setAlreadyCoveredNotes("");
    setIsNameDialogOpen(true);
  };

  const handleCreate = async () => {
    const params = buildCreateTimetableParamsFromPlan(plan);
    if (!params) return; // already validated in openNameDialog

    posthog.capture("calendar_created_from_plan_one_click", {
      document_id: plan.id,
      subject: plan.subject,
      grade_level: plan.gradeLevel,
    });

    // The dialog stays open on the progress until every lesson has its topic —
    // opening the calendar earlier showed empty lessons until a few refreshes.
    // Free plan: the one-click flow never asks for dates, so it fits the plan to the window.
    const period = clampPeriodToFreeWindow(limits, params.periodStart, params.periodEnd);
    const result = await classCreation.create({
      ...params,
      periodStart: period.start,
      periodEnd: period.end,
      holidays: params.holidays?.filter((d) => d >= period.start && d <= period.end),
      title: name.trim() || params.title,
      classLabel: classLabel.trim() || undefined,
      alreadyCoveredNotes: alreadyCoveredNotes.trim() || undefined,
    });
    if (!result.ok) {
      toast.error(result.error ?? t("createFailed"));
      return;
    }
    setExistingTimetableId(result.timetableId);
    if (result.topicsReady) openClass(result.timetableId);
  };

  const retryTopics = async () => {
    if (await classCreation.retryTopics()) openClass(classCreation.timetableId);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || checking || isCreating}
        onClick={openNameDialog}
        className={`flex items-center gap-2 ${className}`}
      >
        {isCreating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CalendarPlus className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">{isCreating ? t("creating") : t("createClass")}</span>
      </Button>

      <Dialog
        open={isNameDialogOpen}
        // Can't be dismissed while the turma and its topics are being created.
        onOpenChange={(open) => { if (!isCreating) setIsNameDialogOpen(open); }}
      >
        {showProgress ? (
          <DialogContent className="max-w-md px-6" hideCloseButton={isCreating}>
            <DialogHeader className="sr-only">
              <DialogTitle>{t("dialogTitle")}</DialogTitle>
            </DialogHeader>
            <ClassTopicsProgress
              phase={classCreation.phase}
              onRetry={() => void retryTopics()}
              onContinue={() => openClass(classCreation.timetableId)}
            />
          </DialogContent>
        ) : (
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("dialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("dialogDescription")}
            </DialogDescription>
          </DialogHeader>

          {/* Header and footer pad themselves (p-6); the body matches them. */}
          <div className="space-y-5 px-6 pb-2 pt-5">
            <div className="space-y-1.5">
              <Label>{t("nameLabel")}</Label>
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={buildPlanAutoTitle(plan)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("classLabel")}</Label>
              <Input
                placeholder={t("classPlaceholder")}
                value={classLabel}
                onChange={(e) => setClassLabel(e.target.value)}
              />
            </div>

            <AlreadyCoveredSection
              notes={alreadyCoveredNotes}
              onNotesChange={setAlreadyCoveredNotes}
            />
          </div>

          <DialogFooter className="pt-4 sm:flex-wrap">
            <AiDisclaimer className="sm:order-last sm:basis-full" />
            <Button variant="ghost" onClick={() => setIsNameDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={!name.trim()}>
              {t("createClass")}
            </Button>
          </DialogFooter>
        </DialogContent>
        )}
      </Dialog>
    </>
  );
}
