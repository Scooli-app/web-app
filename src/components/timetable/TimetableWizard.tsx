"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { createTimetableSession, createTimetableSlot } from "@/store/timetable/timetableSlice";
import type { CreateSessionRequest, CreateSlotRequest } from "@/shared/types/timetable";
import { useRouter } from "next/navigation";
import { useState } from "react";

const DAYS_OF_WEEK = [
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" },
  { value: 7, label: "Domingo" },
];

const SLOT_COLORS = [
  "#4f46e5", // indigo
  "#0ea5e9", // sky
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
];

interface SlotDraft {
  subject: string;
  gradeLevel: number;
  cycle: number;
  dayOfWeek: number;
  startTime: string;
  durationMinutes: number;
  color: string;
}

interface WizardStep1 {
  title: string;
  periodStart: string;
  periodEnd: string;
  schoolYearLabel: string;
}

export default function TimetableWizard() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { error } = useAppSelector((s) => s.timetable);

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [createdSessionId, setCreatedSessionId] = useState<string | null>(null);

  // Step 1 state
  const [step1, setStep1] = useState<WizardStep1>({
    title: "",
    periodStart: "",
    periodEnd: "",
    schoolYearLabel: "",
  });

  // Step 2 state (slots)
  const [slots, setSlots] = useState<SlotDraft[]>([]);
  const [slotDraft, setSlotDraft] = useState<SlotDraft>({
    subject: "",
    gradeLevel: 5,
    cycle: 2,
    dayOfWeek: 1,
    startTime: "08:00",
    durationMinutes: 45,
    color: SLOT_COLORS[0],
  });

  const handleStep1Next = () => {
    if (!step1.title || !step1.periodStart || !step1.periodEnd) return;
    setStep(2);
  };

  const handleAddSlot = () => {
    if (!slotDraft.subject) return;
    setSlots((prev) => [...prev, { ...slotDraft, color: SLOT_COLORS[prev.length % SLOT_COLORS.length] }]);
    setSlotDraft((prev) => ({ ...prev, subject: "" }));
  };

  const handleRemoveSlot = (i: number) => {
    setSlots((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Create session
      const sessionReq: CreateSessionRequest = {
        title: step1.title,
        periodStart: step1.periodStart,
        periodEnd: step1.periodEnd,
        schoolYearLabel: step1.schoolYearLabel || undefined,
      };
      const sessionResult = await dispatch(createTimetableSession(sessionReq));
      if (createTimetableSession.rejected.match(sessionResult)) {
        setSubmitting(false);
        return;
      }
      const sessionId = sessionResult.payload.id as string;
      setCreatedSessionId(sessionId);

      // Create slots
      for (const slot of slots) {
        const slotReq: CreateSlotRequest = {
          subject: slot.subject,
          gradeLevel: slot.gradeLevel,
          cycle: slot.cycle,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime || undefined,
          durationMinutes: slot.durationMinutes,
          color: slot.color,
        };
        await dispatch(createTimetableSlot({ sessionId, req: slotReq }));
      }

      setStep(3);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinish = () => {
    if (createdSessionId) {
      router.push(`/timetable/${createdSessionId}`);
    } else {
      router.push("/timetable");
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center gap-3 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step >= s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {s}
            </div>
            {s < 3 && <div className={`h-px w-10 ${ step > s ? "bg-primary" : "bg-border"}`} />}
          </div>
        ))}
        <div className="ml-2 text-sm font-medium text-muted-foreground">
          {step === 1 && "Informacoes da sessão"}
          {step === 2 && "Horário semanal"}
          {step === 3 && "Concluído!"}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Step 1: Session info */}
      {step === 1 && (
        <div className="bg-card border rounded-xl p-6 flex flex-col gap-5">
          <h2 className="text-lg font-semibold">Informações da sessão</h2>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="title">Título *</label>
            <input
              id="title"
              type="text"
              placeholder="ex: Matemática 5.º Ano — 1.º Trimestre"
              value={step1.title}
              onChange={(e) => setStep1((p) => ({ ...p, title: e.target.value }))}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="periodStart">Início do período *</label>
              <input
                id="periodStart"
                type="date"
                value={step1.periodStart}
                onChange={(e) => setStep1((p) => ({ ...p, periodStart: e.target.value }))}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="periodEnd">Fim do período *</label>
              <input
                id="periodEnd"
                type="date"
                value={step1.periodEnd}
                onChange={(e) => setStep1((p) => ({ ...p, periodEnd: e.target.value }))}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="schoolYear">Ano letivo</label>
            <input
              id="schoolYear"
              type="text"
              placeholder="ex: 2024/2025"
              value={step1.schoolYearLabel}
              onChange={(e) => setStep1((p) => ({ ...p, schoolYearLabel: e.target.value }))}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={!step1.title || !step1.periodStart || !step1.periodEnd}
              onClick={handleStep1Next}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Próximo
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Schedule */}
      {step === 2 && (
        <div className="bg-card border rounded-xl p-6 flex flex-col gap-6">
          <h2 className="text-lg font-semibold">Horário semanal</h2>
          <p className="text-sm text-muted-foreground -mt-3">
            Adiciona as aulas recorrentes. O sistema vai expandir automaticamente todas as aulas do período.
          </p>

          {/* Add slot form */}
          <div className="border rounded-lg p-4 flex flex-col gap-3 bg-muted/30">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Disciplina</label>
                <input
                  type="text"
                  placeholder="ex: Matemática"
                  value={slotDraft.subject}
                  onChange={(e) => setSlotDraft((p) => ({ ...p, subject: e.target.value }))}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Dia da semana</label>
                <select
                  value={slotDraft.dayOfWeek}
                  onChange={(e) => setSlotDraft((p) => ({ ...p, dayOfWeek: Number(e.target.value) }))}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Ano escolar</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={slotDraft.gradeLevel}
                  onChange={(e) => setSlotDraft((p) => ({ ...p, gradeLevel: Number(e.target.value) }))}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Início</label>
                <input
                  type="time"
                  value={slotDraft.startTime}
                  onChange={(e) => setSlotDraft((p) => ({ ...p, startTime: e.target.value }))}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Duração (min)</label>
                <input
                  type="number"
                  min={10}
                  max={300}
                  value={slotDraft.durationMinutes}
                  onChange={(e) => setSlotDraft((p) => ({ ...p, durationMinutes: Number(e.target.value) }))}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <button
              type="button"
              disabled={!slotDraft.subject}
              onClick={handleAddSlot}
              className="self-start px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              + Adicionar aula
            </button>
          </div>

          {/* Slot list */}
          {slots.length > 0 && (
            <div className="flex flex-col gap-2">
              {slots.map((slot, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                  style={{ borderLeftWidth: 3, borderLeftColor: slot.color }}
                >
                  <span className="font-medium">{slot.subject}</span>
                  <span className="text-muted-foreground text-xs">
                    {DAYS_OF_WEEK.find((d) => d.value === slot.dayOfWeek)?.label} · {slot.startTime} · {slot.durationMinutes} min
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSlot(i)}
                    className="text-muted-foreground hover:text-destructive text-xs px-2"
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "A criar…" : slots.length > 0 ? "Criar horário" : "Criar sem aulas"}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Done */}
      {step === 3 && (
        <div className="bg-card border rounded-xl p-8 flex flex-col items-center gap-4 text-center">
          <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-3xl">
            ✅
          </div>
          <h2 className="text-xl font-semibold">Horário criado!</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            O teu horário foi criado com sucesso. As aulas foram expandidas para todo o período.
            Podes agora gerar os tópicos e os planos de aula individualmente.
          </p>
          <button
            type="button"
            onClick={handleFinish}
            className="mt-2 px-6 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Ver horário
          </button>
        </div>
      )}
    </div>
  );
}
