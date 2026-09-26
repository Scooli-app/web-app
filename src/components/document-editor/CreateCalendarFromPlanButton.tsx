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
  parsePlanGradeLevel,
  resolvePlanSubjectId,
} from "@/lib/timetable/planToTimetable";
import { AlreadyCoveredSection } from "@/components/document-creation/AlreadyCoveredSection";
import { getTimetablesByLinkedPlan } from "@/services/api/timetable.service";
import { Routes } from "@/shared/types/routes";
import type { Document } from "@/shared/types/document";
import { useAppDispatch } from "@/store/hooks";
import { createTimetable, generateTopics } from "@/store/timetable/timetableSlice";
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
 * — then reuses the same createTimetable → generateTopics sequence the
 * calendar/novo wizard's "from_plan" flow already uses — see
 * lib/timetable/planToTimetable.ts for the shared mapping logic.
 */
export default function CreateCalendarFromPlanButton({
  plan,
  disabled = false,
  className = "",
}: CreateCalendarFromPlanButtonProps) {
  const t = useTranslations("editor.calendarButton");
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [existingTimetableId, setExistingTimetableId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [classLabel, setClassLabel] = useState("");
  const [alreadyCoveredDomains, setAlreadyCoveredDomains] = useState<string[]>([]);
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

  if (existingTimetableId) {
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
    const params = buildCreateTimetableParamsFromPlan(plan);
    if (!params) {
      // Imported plan / no weekly schedule — deep-link into the wizard, pre-filled.
      router.push(`${Routes.CALENDAR_NEW}?planId=${plan.id}`);
      return;
    }
    setName(buildPlanAutoTitle(plan));
    setClassLabel("");
    setAlreadyCoveredDomains([]);
    setAlreadyCoveredNotes("");
    setIsNameDialogOpen(true);
  };

  const handleCreate = async () => {
    const params = buildCreateTimetableParamsFromPlan(plan);
    if (!params) return; // already validated in openNameDialog

    setIsNameDialogOpen(false);
    setIsCreating(true);
    posthog.capture("calendar_created_from_plan_one_click", {
      document_id: plan.id,
      subject: plan.subject,
      grade_level: plan.gradeLevel,
    });

    const result = await dispatch(
      createTimetable({
        ...params,
        title: name.trim() || params.title,
        classLabel: classLabel.trim() || undefined,
        alreadyCoveredDomains: alreadyCoveredDomains.length > 0 ? alreadyCoveredDomains : undefined,
        alreadyCoveredNotes: alreadyCoveredNotes.trim() || undefined,
      })
    );
    if (!createTimetable.fulfilled.match(result)) {
      toast.error(
        typeof result.payload === "string"
          ? result.payload
          : t("createFailed")
      );
      setIsCreating(false);
      return;
    }

    // Navigate immediately instead of blocking on topic generation — a full-year
    // class can have 150+ slots, which can take well over a minute to title.
    // The class page lazily polls for topics in the background.
    const timetableId = result.payload.id;
    router.push(`${Routes.CALENDAR}/${timetableId}`);
    void dispatch(generateTopics(timetableId));
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

      <Dialog open={isNameDialogOpen} onOpenChange={setIsNameDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("dialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("dialogDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
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
              subject={resolvePlanSubjectId(plan)}
              gradeLevel={String(parsePlanGradeLevel(plan) ?? "")}
              selectedDomains={alreadyCoveredDomains}
              notes={alreadyCoveredNotes}
              onDomainsChange={setAlreadyCoveredDomains}
              onNotesChange={setAlreadyCoveredNotes}
            />
          </div>

          <DialogFooter className="pt-2">
            <AiDisclaimer className="sm:mr-auto sm:self-center sm:text-left" />
            <Button variant="ghost" onClick={() => setIsNameDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={!name.trim()}>
              {t("createClass")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
