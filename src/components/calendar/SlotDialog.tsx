"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import { Routes } from "@/shared/types";
import { SLOT_STATUS_CONFIG } from "@/shared/constants/lessonSlotStatus";
import type { SlotWithTimetable } from "@/shared/types/calendar";
import {
  listLessonDocuments,
  type LessonDocument,
  type LessonSlotType,
} from "@/services/api/timetable.service";

import {
  ChevronDown,
  Clock,
  Edit2,
  ExternalLink,
  FileText,
  Loader2,
  RotateCcw,
  SkipForward,
  Sparkles,
} from "lucide-react";

const ROLE_ROUTE: Record<string, string> = {
  lessonPlan: Routes.LESSON_PLAN,
  curriculumPlan: Routes.CURRICULUM_PLAN,
  quiz: Routes.QUIZ,
  test: Routes.TEST,
  worksheet: Routes.WORKSHEET,
  presentation: Routes.PRESENTATION,
};
function docUrl(role: string, documentId: string): string {
  return `${ROLE_ROUTE[role] ?? Routes.LESSON_PLAN}/${documentId}`;
}

export interface SlotDialogProps {
  slot: SlotWithTimetable | null;
  /** True when THIS specific slot is being generated. */
  isSlotGenerating: boolean;
  /** Optional streaming markdown content (shown while generating on sequence detail page). */
  streamContent?: string;
  onClose: () => void;
  onGenerate: (slot: SlotWithTimetable, message?: string) => void;
  onRegenerate: (slot: SlotWithTimetable, message?: string) => void;
  onSkip: (slot: SlotWithTimetable) => void;
  onTypeChange: (slot: SlotWithTimetable, type: LessonSlotType) => void;
  onTitleChange: (slot: SlotWithTimetable, title: string) => void;
}

export function SlotDialog({
  slot,
  isSlotGenerating,
  streamContent,
  onClose,
  onGenerate,
  onRegenerate,
  onSkip,
  onTypeChange,
  onTitleChange,
}: SlotDialogProps) {
  const router = useRouter();
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [slotDocs, setSlotDocs] = useState<LessonDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsOpen, setDocsOpen] = useState(true);
  const [confirmingSkip, setConfirmingSkip] = useState(false);

  const slotId = slot?.id;

  useEffect(() => {
    if (slot) {
      setDraftTitle(slot.topicTitle || "");
      setEditingTitle(false);
      setCustomMessage("");
      setConfirmingSkip(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotId]);

  // Fetch linked documents whenever a completed slot is opened
  useEffect(() => {
    if (!slot || slot.status !== "completed") {
      setSlotDocs([]);
      return;
    }
    setDocsLoading(true);
    listLessonDocuments(slot.timetable.id, slot.id)
      .then(setSlotDocs)
      .catch(() => setSlotDocs([]))
      .finally(() => setDocsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotId]);

  if (!slot) return null;

  const color = slot.timetable.color || "#7F77DD";
  const cfg = SLOT_STATUS_CONFIG[slot.status];
  const canGenerate =
    (slot.status === "pending" || slot.status === "failed") && !isSlotGenerating;
  const isCompleted = slot.status === "completed";
  const isAssessment = slot.slotType === "ASSESSMENT";
  const isHoliday = slot.slotType === "HOLIDAY";

  const handleTitleSave = () => {
    if (draftTitle.trim() !== slot.topicTitle) {
      onTitleChange(slot, draftTitle.trim());
    }
    setEditingTitle(false);
  };

  const dateLabel = new Date(`${slot.slotDate}T00:00:00`).toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <Dialog open={!!slot} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg gap-0 p-0 overflow-hidden">
        {/* Colored header strip */}
        <div className="h-1 w-full" style={{ background: color }} />

        <div className="p-6">
          <DialogHeader className="mb-4">
            {/* Subject pill + status badge */}
            <div className="mb-3 flex items-center gap-2 flex-wrap">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: color }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
                {slot.timetable.subject}
                {slot.timetable.classLabel ? ` · ${slot.timetable.classLabel}` : ""}
              </span>
              <Badge className={`gap-1 border text-xs ${cfg.badgeCls}`}>
                {cfg.icon}
                {cfg.label}
              </Badge>
              {isAssessment && (
                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                  Avaliação
                </Badge>
              )}
            </div>

            {/* Editable title */}
            {editingTitle ? (
              <Input
                autoFocus
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleSave();
                  if (e.key === "Escape") setEditingTitle(false);
                }}
                className="h-9 text-base font-semibold"
              />
            ) : (
              <DialogTitle
                className="group/title flex cursor-text items-start gap-1.5 text-left text-base leading-snug"
                onClick={() => !isHoliday && setEditingTitle(true)}
                title={isHoliday ? undefined : "Clica para editar o tópico"}
              >
                <span className="hover:underline decoration-dashed underline-offset-2">
                  {slot.topicTitle ||
                    (isHoliday
                      ? "Feriado / Sem aula"
                      : "Sem tópico — clica para editar")}
                </span>
                {!isHoliday && (
                  <Edit2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/title:opacity-60" />
                )}
              </DialogTitle>
            )}

            <DialogDescription className="mt-1 flex items-center gap-1.5 text-sm">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              Aula {slot.sequenceNumber} · {dateLabel}
              {slot.durationMinutes > 0 && ` · ${slot.durationMinutes} min`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Slot type selector */}
            {!isHoliday && (
              <div className="flex items-center gap-2">
                <Label className="shrink-0 text-xs text-muted-foreground">Tipo:</Label>
                <Select
                  value={slot.slotType}
                  onValueChange={(v) => onTypeChange(slot, v as LessonSlotType)}
                >
                  <SelectTrigger className="h-8 flex-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LESSON">Aula</SelectItem>
                    <SelectItem value="ASSESSMENT">Avaliação</SelectItem>
                    <SelectItem value="HOLIDAY">Feriado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Learning objectives — populated by backend after topic generation */}
            {!isHoliday && (
              <>
                <Separator />
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Objetivos de Aprendizagem
                  </p>
                  {slot.description ? (
                    <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line">
                      {slot.description}
                    </p>
                  ) : (
                    <p className="text-sm italic text-muted-foreground/60">
                      {isSlotGenerating
                        ? "A processar…"
                        : "Gera os tópicos do plano letivo para ver os objetivos de aprendizagem."}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Stream preview (shown while SSE generation is in progress) */}
            {streamContent && isSlotGenerating && (
              <>
                <Separator />
                <div className="max-h-32 overflow-y-auto rounded-md border bg-muted/50 p-3 text-xs font-mono whitespace-pre-wrap leading-relaxed">
                  {streamContent}
                </div>
              </>
            )}

            {/* Generated documents accordion */}
            {(isCompleted || docsLoading) && (
              <>
                <Separator />
                <div>
                  <button
                    type="button"
                    onClick={() => setDocsOpen((p) => !p)}
                    className="flex w-full items-center justify-between py-0.5"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Documentos gerados
                      {slotDocs.length > 0 && (
                        <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                          {slotDocs.length}
                        </span>
                      )}
                    </p>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${docsOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {docsOpen && (
                    <div className="mt-1.5 space-y-1">
                      {docsLoading ? (
                        <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          A carregar documentos…
                        </div>
                      ) : slotDocs.length === 0 ? (
                        <p className="py-1 text-xs text-muted-foreground">
                          Nenhum documento encontrado.
                        </p>
                      ) : (
                        slotDocs.map((doc) => (
                          <button
                            key={doc.id}
                            type="button"
                            onClick={() => {
                              onClose();
                              router.push(docUrl(doc.documentRole, doc.documentId));
                            }}
                            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
                          >
                            <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="flex-1 truncate">{doc.title}</span>
                            <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground/40" />
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Linked curriculum plan */}
            {slot.timetable.linkedCurriculumPlan && (
              <a
                href={`/curriculum-plan/${slot.timetable.linkedCurriculumPlan}`}
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="h-3 w-3" />
                Ver planificação ligada
              </a>
            )}

            {/* Custom generation instruction */}
            {(canGenerate || isCompleted) && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Instrução adicional (opcional)
                </Label>
                <Input
                  placeholder="Ex: inclui atividade prática em grupo"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="h-9"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        {!isHoliday && (
          <DialogFooter className="border-t bg-muted/30 px-6 py-4 gap-2">
            {canGenerate && (
              <Button
                onClick={() => onGenerate(slot, customMessage || undefined)}
                className="h-9 rounded-lg"
              >
                <Sparkles className="mr-1.5 h-4 w-4" />
                Gerar plano de aula
              </Button>
            )}
            {isSlotGenerating && (
              <Button disabled className="h-9 rounded-lg">
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                A gerar…
              </Button>
            )}
            {isCompleted && (
              <>
                <Button
                  onClick={() => {
                    const first = slotDocs[0];
                    onClose();
                    router.push(
                      first ? docUrl(first.documentRole, first.documentId) : Routes.DOCUMENTS,
                    );
                  }}
                  className="h-9 rounded-lg"
                >
                  <FileText className="mr-1.5 h-4 w-4" />
                  Abrir plano de aula
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onRegenerate(slot, customMessage || undefined)}
                  disabled={isSlotGenerating}
                  className="h-9 rounded-lg"
                >
                  <RotateCcw className="mr-1.5 h-4 w-4" />
                  Regenerar
                </Button>
              </>
            )}
            {slot.status !== "skipped" && slot.status !== "completed" && (
              confirmingSkip ? (
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Esta ação não pode ser desfeita.
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 rounded-lg"
                    onClick={() => { setConfirmingSkip(false); onSkip(slot); }}
                  >
                    Confirmar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-lg"
                    onClick={() => setConfirmingSkip(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  className="ml-auto h-9 rounded-lg text-muted-foreground"
                  onClick={() => setConfirmingSkip(true)}
                >
                  <SkipForward className="mr-1.5 h-4 w-4" />
                  Ignorar
                </Button>
              )
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
