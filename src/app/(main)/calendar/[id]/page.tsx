"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { selectIsHorarioPlanosEnabled } from "@/store/features/selectors";
import {
  fetchTimetable,
  fetchLessons,
  generateTopics,
  skipLesson,
  setSlotStatus,
  updateLesson,
} from "@/store/timetable/timetableSlice";
import { useAppDispatch } from "@/store/hooks";
import type { RootState } from "@/store/store";
import { Routes } from "@/shared/types";
import {
  generateLesson as generateLessonStream,
  regenerateLesson as regenerateLessonStream,
  generateWeek as generateWeekStream,
  type LessonSlot,
  type LessonSlotType,
} from "@/services/api/timetable.service";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Play,
  RotateCcw,
  SkipForward,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useAuth } from "@clerk/nextjs";

// ─────────────────────── Types / helpers ─────────────────────────────────────

type WeekMap = Map<string, LessonSlot[]>;

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekLabel(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 4);
  const fmt = (d: Date) =>
    d.toLocaleDateString("pt-PT", { day: "numeric", month: "short" });
  return `${fmt(weekStart)} – ${fmt(end)}`;
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m || m.length < 3) return null;
  return { r: parseInt(m[0], 16), g: parseInt(m[1], 16), b: parseInt(m[2], 16) };
}

type BadgeCfg = { label: string; badgeCls: string; icon: React.ReactNode };

const STATUS_CONFIG: Record<LessonSlot["status"], BadgeCfg> = {
  pending: {
    label: "Pendente",
    badgeCls: "bg-muted text-muted-foreground border",
    icon: <Clock className="h-3 w-3" />,
  },
  generating: {
    label: "A gerar",
    badgeCls: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  completed: {
    label: "Gerado",
    badgeCls: "bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  failed: {
    label: "Falhou",
    badgeCls: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  skipped: {
    label: "Ignorado",
    badgeCls: "bg-muted text-muted-foreground/60 border",
    icon: <SkipForward className="h-3 w-3" />,
  },
};


// ─────────────────────── Slot card ───────────────────────────────────────────

interface SlotCardProps {
  slot: LessonSlot;
  color: string;
  subject: string;
  classLabel: string;
  onOpen: (slot: LessonSlot) => void;
}

function SlotCard({ slot, color, subject, classLabel, onOpen }: SlotCardProps) {
  const isHoliday = slot.slotType === "HOLIDAY";
  const isFailed = slot.status === "failed";
  const cfg = STATUS_CONFIG[slot.status];
  const rgb = hexToRgb(color);
  const tintBg = rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.06)` : undefined;
  const borderColor = isFailed ? "#ef4444" : color;

  return (
    <button
      type="button"
      onClick={() => !isHoliday && onOpen(slot)}
      disabled={isHoliday}
      className={`w-full text-left rounded-lg border transition ${
        isHoliday
          ? "cursor-default opacity-50"
          : "cursor-pointer hover:shadow-sm hover:border-primary/40"
      } ${isFailed ? "bg-red-50 dark:bg-red-950/20" : ""}`}
      style={{
        borderLeft: `4px solid ${borderColor}`,
        backgroundColor: !isFailed && !isHoliday ? tintBg : undefined,
      }}
    >
      <div className="flex items-center gap-3 px-3 py-3">
        {/* Sequence number */}
        <span className="w-7 shrink-0 text-right text-xs font-mono text-muted-foreground">
          {slot.sequenceNumber}
        </span>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm font-medium ${isHoliday ? "line-through text-muted-foreground" : ""}`}>
            {isHoliday
              ? "Feriado / Sem aula"
              : slot.topicTitle || "Sem tópico definido"}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date(`${slot.slotDate}T00:00:00`).toLocaleDateString("pt-PT", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}{" "}
            · {slot.durationMinutes} min
          </p>
          {/* Disciplina · Turma */}
          <p className="text-xs text-muted-foreground/70">
            {subject}{classLabel ? ` · Turma ${classLabel}` : ""}
          </p>
          {/* Error message */}
          {isFailed && (
            <p className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 mt-0.5">
              <AlertTriangle className="h-3 w-3" />
              Falhou a geração
            </p>
          )}
        </div>

        {/* Badge */}
        {!isHoliday && (
          <Badge className={`shrink-0 gap-1 border text-xs ${cfg.badgeCls}`}>
            {cfg.icon}
            {cfg.label}
          </Badge>
        )}
      </div>
    </button>
  );
}

// ─────────────────────── Slot popup ──────────────────────────────────────────

interface SlotDialogProps {
  slot: LessonSlot | null;
  color: string;
  linkedCurriculumPlan?: string;
  isGenerating: boolean;
  streamContent: string;
  onClose: () => void;
  onGenerate: (slot: LessonSlot, message?: string) => void;
  onRegenerate: (slot: LessonSlot, message?: string) => void;
  onSkip: (slot: LessonSlot) => void;
  onTypeChange: (slot: LessonSlot, type: LessonSlotType) => void;
  onTitleChange: (slot: LessonSlot, title: string) => void;
}

function SlotDialog({
  slot, color, linkedCurriculumPlan,
  isGenerating, streamContent,
  onClose, onGenerate, onRegenerate, onSkip, onTypeChange, onTitleChange,
}: SlotDialogProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [customMessage, setCustomMessage] = useState("");

  const slotId = slot?.id;
  useEffect(() => {
    if (slot) {
      setDraftTitle(slot.topicTitle || "");
      setEditingTitle(false);
      setCustomMessage("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotId]);

  if (!slot) return null;

  const cfg = STATUS_CONFIG[slot.status];
  const canGenerate = slot.status === "pending" || slot.status === "failed";
  const isCompleted = slot.status === "completed";
  const isAssessment = slot.slotType === "ASSESSMENT";

  const handleTitleSave = () => {
    if (draftTitle.trim() !== slot.topicTitle) {
      onTitleChange(slot, draftTitle.trim());
    }
    setEditingTitle(false);
  };

  return (
    <Dialog open={!!slot} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          {/* Inline editable title */}
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <Input
                autoFocus
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleSave();
                  if (e.key === "Escape") setEditingTitle(false);
                }}
                className="text-base font-semibold"
              />
            </div>
          ) : (
            <DialogTitle
              className="cursor-text hover:underline decoration-dashed text-left leading-snug"
              onClick={() => setEditingTitle(true)}
              title="Clica para editar o tópico"
            >
              {slot.topicTitle || "Sem tópico — clica para editar"}
            </DialogTitle>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>
              Aula {slot.sequenceNumber} ·{" "}
              {new Date(`${slot.slotDate}T00:00:00`).toLocaleDateString("pt-PT", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
            <span>· {slot.durationMinutes} min</span>
          </div>

          {/* Type + status row */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              value={slot.slotType}
              onChange={(e) => onTypeChange(slot, e.target.value as LessonSlotType)}
            >
              <option value="LESSON">Aula</option>
              <option value="ASSESSMENT">Avaliação</option>
              <option value="HOLIDAY">Feriado</option>
            </select>
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

          {/* Linked planificação */}
          {linkedCurriculumPlan && (
            <a
              href={`/curriculum-plan/${linkedCurriculumPlan}`}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="h-3 w-3" />
              Ver planificação ligada
            </a>
          )}

          {/* Stream content preview */}
          {streamContent && isGenerating && (
            <div className="max-h-32 overflow-y-auto rounded-md border bg-muted p-3 text-xs font-mono whitespace-pre-wrap">
              {streamContent}
            </div>
          )}

          {/* Custom message for generation */}
          {(canGenerate || isCompleted) && (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Instrução adicional (opcional)
              </label>
              <Input
                placeholder="Ex: inclui atividade prática em grupo"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
              />
            </div>
          )}

          {/* CTAs */}
          <div className="flex flex-wrap gap-2">
            {canGenerate && (
              <Button
                size="sm"
                onClick={() => onGenerate(slot, customMessage || undefined)}
                disabled={isGenerating}
                style={{ borderColor: color }}
              >
                {isGenerating ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="mr-1 h-3 w-3" />
                )}
                Gerar plano de aula
              </Button>
            )}

            {isCompleted && (
              <>
                <Button
                  size="sm"
                  onClick={() => {
                    // Navigate to document — document ID is in slot documents (not stored here yet)
                    // For now, go to documents page filtered by slot
                    window.open("/documents", "_blank");
                  }}
                >
                  <ExternalLink className="mr-1 h-3 w-3" />
                  Abrir plano de aula
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRegenerate(slot, customMessage || undefined)}
                  disabled={isGenerating}
                >
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Regenerar
                </Button>
              </>
            )}

            {slot.status !== "skipped" && slot.status !== "completed" && (
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                onClick={() => onSkip(slot)}
              >
                <SkipForward className="mr-1 h-3 w-3" />
                Ignorar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────── Main page ───────────────────────────────────────────

export default function CalendarViewPage() {
  const params = useParams();
  const id = params.id as string;
  const enabled = useSelector(selectIsHorarioPlanosEnabled);
  const { currentTimetable, slots, isSlotsLoading, isGeneratingTopics } =
    useSelector((state: RootState) => state.timetable);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { getToken } = useAuth();

  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<LessonSlot | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingWeek, setGeneratingWeek] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const streamRef = useRef("");

  useEffect(() => {
    if (!enabled) { router.replace(Routes.DASHBOARD); return; }
    dispatch(fetchTimetable(id));
    dispatch(fetchLessons({ timetableId: id }));
  }, [enabled, id, dispatch, router]);

  // Keep selectedSlot in sync with store (status updates from SSE)
  useEffect(() => {
    if (!selectedSlot) return;
    const updated = slots.find((s) => s.id === selectedSlot.id);
    if (updated) setSelectedSlot(updated);
    // selectedSlot.id is the stable key; full selectedSlot would cause infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots]);

  // Group slots by ISO week start
  const slotsByWeek: WeekMap = useMemo(() => {
    const map: WeekMap = new Map();
    for (const slot of slots) {
      const d = new Date(`${slot.slotDate}T00:00:00`);
      const ws = toIso(getWeekStart(d));
      if (!map.has(ws)) map.set(ws, []);
      const weekSlots = map.get(ws);
      if (weekSlots) weekSlots.push(slot);
    }
    return map;
  }, [slots]);

  const currentWeekIso = toIso(weekStart);
  const currentWeekSlots = useMemo(
    () =>
      (slotsByWeek.get(currentWeekIso) ?? []).sort(
        (a, b) => a.sequenceNumber - b.sequenceNumber
      ),
    [slotsByWeek, currentWeekIso]
  );

  const prevWeek = () =>
    setWeekStart((p) => { const d = new Date(p); d.setDate(d.getDate() - 7); return d; });
  const nextWeek = () =>
    setWeekStart((p) => { const d = new Date(p); d.setDate(d.getDate() + 7); return d; });

  const handleGenerateTopics = useCallback(() => {
    dispatch(generateTopics(id)).then(() => dispatch(fetchLessons({ timetableId: id })));
  }, [dispatch, id]);

  const handleGenerateLesson = useCallback(
    async (slot: LessonSlot, message?: string) => {
      setSelectedSlot(null);
      setIsGenerating(true);
      streamRef.current = "";
      setStreamContent("");
      dispatch(setSlotStatus({ slotId: slot.id, status: "generating" }));

      try {
        await generateLessonStream(
          id,
          slot.id,
          message,
          {
            onChunk: (c) => {
              streamRef.current += c;
              setStreamContent(streamRef.current);
            },
            onDone: () => {
              dispatch(setSlotStatus({ slotId: slot.id, status: "completed" }));
              dispatch(fetchLessons({ timetableId: id }));
            },
            onError: () => dispatch(setSlotStatus({ slotId: slot.id, status: "failed" })),
          },
          getToken
        );
      } finally {
        setIsGenerating(false);
        setStreamContent("");
        streamRef.current = "";
      }
    },
    [id, dispatch, getToken]
  );

  const handleRegenerateLesson = useCallback(
    async (slot: LessonSlot, message?: string) => {
      setSelectedSlot(null);
      setIsGenerating(true);
      streamRef.current = "";
      setStreamContent("");
      dispatch(setSlotStatus({ slotId: slot.id, status: "generating" }));

      try {
        await regenerateLessonStream(
          id,
          slot.id,
          message,
          {
            onChunk: (c) => {
              streamRef.current += c;
              setStreamContent(streamRef.current);
            },
            onDone: () => {
              dispatch(setSlotStatus({ slotId: slot.id, status: "completed" }));
              dispatch(fetchLessons({ timetableId: id }));
            },
            onError: () => dispatch(setSlotStatus({ slotId: slot.id, status: "failed" })),
          },
          getToken
        );
      } finally {
        setIsGenerating(false);
        setStreamContent("");
        streamRef.current = "";
      }
    },
    [id, dispatch, getToken]
  );

  const handleGenerateWeek = useCallback(async () => {
    setGeneratingWeek(true);
    try {
      await generateWeekStream(
        id,
        currentWeekIso,
        {
          onSlotStart: (slotId) => dispatch(setSlotStatus({ slotId, status: "generating" })),
          onSlotDone: (slotId) => dispatch(setSlotStatus({ slotId, status: "completed" })),
          onSlotError: (slotId) => dispatch(setSlotStatus({ slotId, status: "failed" })),
          onDone: () => dispatch(fetchLessons({ timetableId: id })),
        },
        getToken
      );
    } finally {
      setGeneratingWeek(false);
    }
  }, [id, currentWeekIso, dispatch, getToken]);

  const handleSkip = useCallback(
    (slot: LessonSlot) => {
      dispatch(skipLesson({ timetableId: id, lessonId: slot.id }));
      setSelectedSlot(null);
    },
    [dispatch, id]
  );

  const handleTypeChange = useCallback(
    (slot: LessonSlot, type: LessonSlotType) => {
      dispatch(updateLesson({ timetableId: id, lessonId: slot.id, params: { slotType: type } }));
    },
    [dispatch, id]
  );

  const handleTitleChange = useCallback(
    (slot: LessonSlot, title: string) => {
      dispatch(updateLesson({ timetableId: id, lessonId: slot.id, params: { topicTitle: title } }));
    },
    [dispatch, id]
  );

  const pendingThisWeek = currentWeekSlots.filter((s) => s.status === "pending").length;

  const timetableColor = currentTimetable?.color ?? "#7F77DD";
  const timetableSubject = currentTimetable?.subject ?? "";
  const timetableClassLabel = currentTimetable?.classLabel ?? "";

  if (!enabled) return null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={Routes.CALENDAR}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div
            className="h-4 w-4 rounded-full shrink-0"
            style={{ background: timetableColor }}
          />
          <div>
            <h1 className="font-semibold leading-tight">
              {currentTimetable?.title ?? "A carregar..."}
            </h1>
            {currentTimetable && (
              <p className="text-sm text-muted-foreground">
                {currentTimetable.subject} · {currentTimetable.gradeLevel}.º ano
                {currentTimetable.classLabel ? ` · Turma ${currentTimetable.classLabel}` : ""}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateTopics}
            disabled={isGeneratingTopics}
          >
            {isGeneratingTopics ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="mr-1 h-3 w-3" />
            )}
            Gerar tópicos
          </Button>
          {pendingThisWeek > 0 && (
            <Button
              size="sm"
              onClick={handleGenerateWeek}
              disabled={generatingWeek || isGenerating}
            >
              {generatingWeek ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Play className="mr-1 h-3 w-3" />
              )}
              Gerar semana ({pendingThisWeek})
            </Button>
          )}
        </div>
      </div>

      {/* Week navigator */}
      <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-2">
        <Button variant="ghost" size="icon" onClick={prevWeek}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <button
          type="button"
          onClick={() => setWeekStart(getWeekStart(new Date()))}
          className="text-sm font-medium hover:text-primary"
        >
          {formatWeekLabel(weekStart)}
        </button>
        <Button variant="ghost" size="icon" onClick={nextWeek}>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Week grid */}
      {isSlotsLoading ? (
        <div className="py-12 text-center text-muted-foreground">
          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
        </div>
      ) : currentWeekSlots.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <CalendarDays className="mx-auto mb-3 h-10 w-10" />
          <p>Sem aulas programadas para esta semana.</p>
          <p className="mt-1 text-sm">
            {slots.length === 0
              ? "Ainda não tens aulas criadas para esta sequência."
              : "Navega para outra semana."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {currentWeekSlots.map((slot) => (
            <SlotCard
              key={slot.id}
              slot={slot}
              color={timetableColor}
              subject={timetableSubject}
              classLabel={timetableClassLabel}
              onOpen={setSelectedSlot}
            />
          ))}
        </div>
      )}

      {/* Slot detail dialog */}
      <SlotDialog
        slot={selectedSlot}
        color={timetableColor}
        linkedCurriculumPlan={currentTimetable?.linkedCurriculumPlan || undefined}
        isGenerating={isGenerating}
        streamContent={streamContent}
        onClose={() => setSelectedSlot(null)}
        onGenerate={handleGenerateLesson}
        onRegenerate={handleRegenerateLesson}
        onSkip={handleSkip}
        onTypeChange={handleTypeChange}
        onTitleChange={handleTitleChange}
      />
    </div>
  );
}
