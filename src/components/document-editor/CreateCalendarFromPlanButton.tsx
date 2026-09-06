"use client";

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
import { GenerationProgress } from "@/components/document-creation/GenerationProgress";
import { getTimetablesByLinkedPlan } from "@/services/api/timetable.service";
import { Routes } from "@/shared/types/routes";
import type { Document } from "@/shared/types/document";
import { useAppDispatch } from "@/store/hooks";
import { createTimetable, generateTopics } from "@/store/timetable/timetableSlice";
import { CalendarPlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import posthog from "posthog-js";

interface CreateCalendarFromPlanButtonProps {
  plan: Document;
  disabled?: boolean;
  className?: string;
}

// Mirrors the calendar/novo wizard's loading copy — createTimetable + generateTopics
// together take up to a minute, and the tiny button spinner gave no feedback.
const CREATION_STEPS = [
  "A mapear competências curriculares",
  "A organizar conteúdos e sequência pedagógica",
  "A definir avaliações e critérios",
  "Revisão pedagógica final",
] as const;

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
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [existingTimetableId, setExistingTimetableId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [creationStep, setCreationStep] = useState(0);
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [classLabel, setClassLabel] = useState("");

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
        <span className="hidden sm:inline">Ver turma</span>
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
    setIsNameDialogOpen(true);
  };

  const handleCreate = async () => {
    const params = buildCreateTimetableParamsFromPlan(plan);
    if (!params) return; // already validated in openNameDialog

    setIsNameDialogOpen(false);
    setIsCreating(true);
    setCreationStep(0);
    // No progress events from createTimetable/generateTopics — advance the
    // indicator on a timer so the ~1-min wait isn't a blank spinner.
    const stepTimer = setInterval(
      () => setCreationStep((s) => Math.min(s + 1, CREATION_STEPS.length - 1)),
      12_000,
    );
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
      })
    );
    if (!createTimetable.fulfilled.match(result)) {
      clearInterval(stepTimer);
      toast.error(
        typeof result.payload === "string"
          ? result.payload
          : "Não foi possível criar a turma."
      );
      setIsCreating(false);
      return;
    }

    const timetableId = result.payload.id;
    try {
      // Wait for topics so the calendar doesn't show "Sem tópico" placeholders
      // on arrival — matches the calendar/novo wizard's own loading-step behavior.
      await dispatch(generateTopics(timetableId));
    } finally {
      clearInterval(stepTimer);
      setCreationStep(CREATION_STEPS.length - 1);
      router.push(`${Routes.CALENDAR}/${timetableId}`);
    }
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
        <span className="hidden sm:inline">{isCreating ? "A criar..." : "Criar turma"}</span>
      </Button>

      {isCreating && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-background/95 backdrop-blur-sm">
          <GenerationProgress
            title="A criar a tua turma…"
            subtitle="A Scooli está a gerar os tópicos e a distribuição pedagógica. Pode demorar até um minuto."
            steps={CREATION_STEPS}
            currentStep={creationStep}
          />
        </div>
      )}

      <Dialog open={isNameDialogOpen} onOpenChange={setIsNameDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Criar turma a partir desta planificação</DialogTitle>
            <DialogDescription>
              Confirma o nome — útil se já tiveres outra turma com a mesma disciplina e ano.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={buildPlanAutoTitle(plan)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Turma (opcional)</Label>
              <Input
                placeholder="Ex: A"
                value={classLabel}
                onChange={(e) => setClassLabel(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="ghost" onClick={() => setIsNameDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!name.trim()}>
              Criar turma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
