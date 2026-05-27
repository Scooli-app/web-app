"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { createTimetableSession, createTimetableSlot } from "@/store/timetable/timetableSlice";
import type { CreateSessionRequest, CreateSlotRequest } from "@/shared/types/timetable";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/shared/utils/utils";
import {
  CalendarDays,
  BookOpen,
  Settings2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
} from "lucide-react";
import { getDocuments } from "@/services/api";
import type { Document } from "@/shared/types";
import { SUBJECTS } from "@/components/document-creation/constants";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = [
  { value: 1, label: "Segunda-feira", short: "Seg" },
  { value: 2, label: "Terça-feira", short: "Ter" },
  { value: 3, label: "Quarta-feira", short: "Qua" },
  { value: 4, label: "Quinta-feira", short: "Qui" },
  { value: 5, label: "Sexta-feira", short: "Sex" },
  { value: 6, label: "Sábado", short: "Sáb" },
  { value: 7, label: "Domingo", short: "Dom" },
];

const SLOT_COLORS = [
  "#4f46e5", "#0ea5e9", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6",
];

const SCHOOL_YEARS = Array.from({ length: 12 }, (_, i) => i + 1);

const SCHOOL_YEAR_START_MONTH = 9;
const SCHOOL_YEAR_START_DAY = 1;
const SCHOOL_YEAR_END_MONTH = 6;
const SCHOOL_YEAR_END_DAY = 30;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function weeksBetween(a: string, b: string): number {
  const s = new Date(a);
  const e = new Date(b);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0;
  return Math.max(0, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24 * 7)));
}

function formatDatePT(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function buildPresets() {
  const today = new Date();
  const year = today.getFullYear();
  const m = today.getMonth() + 1;
  const syStart = m >= SCHOOL_YEAR_START_MONTH ? year : year - 1;
  const syEnd = syStart + 1;
  return [
    {
      label: "Próximas 2 semanas",
      getRange: () => ({ start: toISO(today), end: toISO(addDays(today, 14)) }),
    },
    {
      label: "Próximos 2 meses",
      getRange: () => {
        const e = new Date(today);
        e.setMonth(e.getMonth() + 2);
        return { start: toISO(today), end: toISO(e) };
      },
    },
    {
      label: "Próximo trimestre",
      getRange: () => {
        const e = new Date(today);
        e.setMonth(e.getMonth() + 3);
        return { start: toISO(today), end: toISO(e) };
      },
    },
    {
      label: "Próximo semestre",
      getRange: () => {
        const e = new Date(today);
        e.setMonth(e.getMonth() + 6);
        return { start: toISO(today), end: toISO(e) };
      },
    },
    {
      label: `Ano letivo ${syStart}/${syEnd}`,
      getRange: () => ({
        start: `${syStart}-${String(SCHOOL_YEAR_START_MONTH).padStart(2, "0")}-${String(SCHOOL_YEAR_START_DAY).padStart(2, "0")}`,
        end: `${syEnd}-${String(SCHOOL_YEAR_END_MONTH).padStart(2, "0")}-${String(SCHOOL_YEAR_END_DAY).padStart(2, "0")}`,
      }),
    },
  ];
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SlotDraft {
  subject: string;
  gradeLevel: number;
  cycle: number;
  dayOfWeek: number;
  startTime: string;
  durationMinutes: number;
  color: string;
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = [
  { id: "period" as const, label: "Período", icon: CalendarDays },
  { id: "plan" as const, label: "Planificação", icon: BookOpen },
  { id: "schedule" as const, label: "Horário", icon: Settings2 },
  { id: "review" as const, label: "Confirmar", icon: CheckCircle2 },
];
type StepId = (typeof STEPS)[number]["id"];

function StepIndicator({ current }: { current: StepId }) {
  const currentIdx = STEPS.findIndex((s) => s.id === current);
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, idx) => {
        const Icon = step.icon;
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        return (
          <div key={step.id} className="flex items-center">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors",
                active && "border-primary bg-primary text-primary-foreground",
                done && "border-primary bg-primary/10 text-primary",
                !active && !done && "border-muted-foreground/30 text-muted-foreground/50",
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <span
              className={cn(
                "ml-2 hidden text-sm font-medium sm:inline",
                active && "text-foreground",
                done && "text-primary",
                !active && !done && "text-muted-foreground/50",
              )}
            >
              {step.label}
            </span>
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-3 h-px w-8 sm:w-12",
                  done ? "bg-primary" : "bg-muted-foreground/20",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TimetableWizardProps {
  initialCurriculumPlanId?: string;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TimetableWizard({ initialCurriculumPlanId }: TimetableWizardProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { error } = useAppSelector((s) => s.timetable);
  const PRESETS = useMemo(() => buildPresets(), []);

  const [step, setStep] = useState<StepId>("period");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdSessionId, setCreatedSessionId] = useState<string | null>(null);

  // ── Step 1: Period ──
  const [title, setTitle] = useState("");
  const [schoolYearLabel, setSchoolYearLabel] = useState("");
  const [periodStart, setPeriodStart] = useState<Date | undefined>();
  const [periodEnd, setPeriodEnd] = useState<Date | undefined>();

  const periodStartISO = periodStart ? toISO(periodStart) : "";
  const periodEndISO = periodEnd ? toISO(periodEnd) : "";
  const weeks = weeksBetween(periodStartISO, periodEndISO);
  const step1Valid = !!title.trim() && !!periodStart && !!periodEnd && periodEnd > periodStart;

  // ── Step 2: Curriculum plan ──
  const [curriculumPlans, setCurriculumPlans] = useState<Document[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [plansFetched, setPlansFetched] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>(initialCurriculumPlanId);

  useEffect(() => {
    setSelectedPlanId(initialCurriculumPlanId);
  }, [initialCurriculumPlanId]);

  useEffect(() => {
    if (plansFetched) return;
    if (step !== "plan" && !initialCurriculumPlanId) return;
    setPlansFetched(true);
    setLoadingPlans(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getDocuments as any)({ page: 1, limit: 50, filters: { documentType: "curriculumPlan" } })
      .then((res: { documents?: Document[] }) => setCurriculumPlans(res.documents ?? []))
      .catch(() => {})
      .finally(() => setLoadingPlans(false));
  }, [step, initialCurriculumPlanId, plansFetched]);

  const selectedPlan = curriculumPlans.find((p) => p.id === selectedPlanId);

  // ── Step 3: Schedule slots ──
  const [slots, setSlots] = useState<SlotDraft[]>([]);
  const [draftSubject, setDraftSubject] = useState("");
  const [draftGrade, setDraftGrade] = useState(5);
  const [draftDay, setDraftDay] = useState(1);
  const [draftTime, setDraftTime] = useState("08:00");
  const [draftDuration, setDraftDuration] = useState(45);

  const slotsPerWeek = slots.length;
  const totalLessons = slotsPerWeek * weeks;

  function handleAddSlot() {
    if (!draftSubject) return;
    setSlots((prev) => [
      ...prev,
      {
        subject: draftSubject,
        gradeLevel: draftGrade,
        cycle: draftGrade <= 4 ? 1 : draftGrade <= 6 ? 2 : draftGrade <= 9 ? 3 : 4,
        dayOfWeek: draftDay,
        startTime: draftTime,
        durationMinutes: draftDuration,
        color: SLOT_COLORS[prev.length % SLOT_COLORS.length],
      },
    ]);
    setDraftSubject("");
  }

  // ── Navigation ──
  const ORDER: StepId[] = ["period", "plan", "schedule", "review"];

  function goNext() {
    const idx = ORDER.indexOf(step);
    if (idx < ORDER.length - 1) setStep(ORDER[idx + 1]);
  }

  function goBack() {
    const idx = ORDER.indexOf(step);
    if (idx > 0) setStep(ORDER[idx - 1]);
    else router.back();
  }

  // ── Submit ──
  async function handleSubmit() {
    if (!step1Valid) return;
    setSubmitting(true);
    try {
      const sessionReq: CreateSessionRequest = {
        title: title.trim(),
        periodStart: periodStartISO,
        periodEnd: periodEndISO,
        schoolYearLabel: schoolYearLabel.trim() || undefined,
        curriculumPlanDocId: selectedPlanId || undefined,
      };
      const sessionResult = await dispatch(createTimetableSession(sessionReq));
      if (createTimetableSession.rejected.match(sessionResult)) return;
      const sessionId = (sessionResult.payload as { id: string }).id;
      setCreatedSessionId(sessionId);

      for (const slot of slots) {
        const slotReq: CreateSlotRequest = {
          subject: slot.subject,
          gradeLevel: slot.gradeLevel,
          cycle: slot.cycle,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          durationMinutes: slot.durationMinutes,
          color: slot.color,
        };
        await dispatch(createTimetableSlot({ sessionId, req: slotReq }));
      }
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Done screen ──
  if (done) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-semibold">Horário criado!</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            As aulas foram expandidas para todo o período. Podes agora gerar os tópicos e os
            planos de aula com IA.
          </p>
          <Button
            onClick={() =>
              router.push(createdSessionId ? `/timetable/${createdSessionId}` : "/timetable")
            }
            className="mt-2"
          >
            Ver horário
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <StepIndicator current={step} />

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="p-6">

          {/* ── Step 1: Período ── */}
          {step === "period" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Período letivo</h2>
                <p className="text-sm text-muted-foreground">
                  Escolhe um predefinido ou define manualmente as datas.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => {
                  const { start, end } = p.getRange();
                  const active = periodStartISO === start && periodEndISO === end;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setPeriodStart(new Date(`${start}T12:00:00`));
                        setPeriodEnd(new Date(`${end}T12:00:00`));
                      }}
                      className={cn(
                        "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:border-primary hover:text-primary",
                      )}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Data de início</Label>
                  <DatePicker
                    value={periodStart}
                    onChange={setPeriodStart}
                    placeholder="Início do período"
                    toDate={periodEnd}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de fim</Label>
                  <DatePicker
                    value={periodEnd}
                    onChange={setPeriodEnd}
                    placeholder="Fim do período"
                    fromDate={periodStart}
                  />
                </div>
              </div>

              {periodStart && periodEnd && periodEnd > periodStart && (
                <div className="rounded-lg bg-muted px-4 py-3 text-sm">
                  <span className="font-medium">{weeks} semana{weeks !== 1 ? "s" : ""}</span>
                  {" · "}
                  <span className="text-muted-foreground">
                    {formatDatePT(periodStartISO)} a {formatDatePT(periodEndISO)}
                  </span>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Título do horário *</Label>
                  <Input
                    id="title"
                    placeholder="ex: Matemática 5.º Ano — 1.º Trimestre"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schoolYear">Ano letivo</Label>
                  <Input
                    id="schoolYear"
                    placeholder="ex: 2024/2025"
                    value={schoolYearLabel}
                    onChange={(e) => setSchoolYearLabel(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Planificação ── */}
          {step === "plan" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Planificação curricular</h2>
                <p className="text-sm text-muted-foreground">
                  Liga este horário a uma planificação para que a IA gere aulas com o contexto
                  correto. Opcional — podes saltar este passo.
                </p>
              </div>

              {loadingPlans ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : curriculumPlans.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Não tens planificações criadas.{" "}
                  <a href="/curriculum-plan" className="text-primary underline">
                    Criar planificação
                  </a>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {curriculumPlans.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() =>
                        setSelectedPlanId(plan.id === selectedPlanId ? undefined : plan.id)
                      }
                      className={cn(
                        "flex flex-col gap-1 rounded-xl border p-4 text-left transition-all",
                        plan.id === selectedPlanId
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-primary/50",
                      )}
                    >
                      <span className="font-medium text-sm line-clamp-2">{plan.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {[plan.subject, plan.gradeLevel ? `${plan.gradeLevel}.º ano` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {selectedPlanId && (
                <button
                  type="button"
                  onClick={() => setSelectedPlanId(undefined)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" /> Remover seleção
                </button>
              )}
            </div>
          )}

          {/* ── Step 3: Horário ── */}
          {step === "schedule" && (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Horário semanal</h2>
                  <p className="text-sm text-muted-foreground">
                    Adiciona as aulas recorrentes. O sistema expande automaticamente todas as
                    datas do período.
                  </p>
                </div>
                {slotsPerWeek > 0 && (
                  <Badge variant="secondary" className="shrink-0 text-sm font-semibold">
                    {slotsPerWeek} aula{slotsPerWeek !== 1 ? "s" : ""}/semana
                  </Badge>
                )}
              </div>

              {/* Add slot form */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Disciplina</Label>
                    <Select value={draftSubject} onValueChange={setDraftSubject}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleciona a disciplina" />
                      </SelectTrigger>
                      <SelectContent>
                        {SUBJECTS.map((s) => (
                          <SelectItem key={s.id} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Dia da semana</Label>
                    <Select
                      value={String(draftDay)}
                      onValueChange={(v) => setDraftDay(Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((d) => (
                          <SelectItem key={d.value} value={String(d.value)}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Ano de escolaridade</Label>
                  <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
                    {SCHOOL_YEARS.map((y) => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => setDraftGrade(y)}
                        className={cn(
                          "rounded border py-2 text-xs font-medium transition-colors",
                          draftGrade === y
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:border-primary hover:text-primary",
                        )}
                      >
                        {y}.º
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs" htmlFor="startTime">Hora de início</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={draftTime}
                      onChange={(e) => setDraftTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs" htmlFor="duration">Duração (min)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min={10}
                      max={300}
                      value={draftDuration}
                      onChange={(e) => setDraftDuration(Number(e.target.value))}
                    />
                  </div>
                  <div className="flex items-end col-span-2 sm:col-span-1">
                    <Button
                      type="button"
                      disabled={!draftSubject}
                      onClick={handleAddSlot}
                      className="w-full"
                    >
                      + Adicionar
                    </Button>
                  </div>
                </div>
              </div>

              {/* Slot list */}
              {slots.length > 0 && (
                <div className="space-y-2">
                  {slots.map((slot, i) => {
                    const subjectLabel =
                      SUBJECTS.find((s) => s.value === slot.subject)?.label ?? slot.subject;
                    const dayLabel =
                      DAYS_OF_WEEK.find((d) => d.value === slot.dayOfWeek)?.short ?? "";
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm"
                        style={{ borderLeftWidth: 3, borderLeftColor: slot.color }}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">{subjectLabel}</span>
                          <span className="text-xs text-muted-foreground">
                            {slot.gradeLevel}.º ano · {dayLabel} · {slot.startTime} ·{" "}
                            {slot.durationMinutes} min
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSlots((prev) => prev.filter((_, idx) => idx !== i))}
                          className="ml-3 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {slotsPerWeek > 0 && weeks > 0 && (
                <div className="rounded-lg bg-muted px-4 py-3 text-sm">
                  <span className="font-medium">{totalLessons} aulas</span> estimadas
                  {" "}({weeks} sem. × {slotsPerWeek} aulas/sem.)
                </div>
              )}
            </div>
          )}

          {/* ── Step 4: Review ── */}
          {step === "review" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Confirmar</h2>
                <p className="text-sm text-muted-foreground">
                  Revê os dados antes de criar o horário.
                </p>
              </div>

              <div className="divide-y rounded-lg border">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">Título</span>
                  <span className="text-sm font-medium">{title}</span>
                </div>
                {schoolYearLabel && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-muted-foreground">Ano letivo</span>
                    <span className="text-sm font-medium">{schoolYearLabel}</span>
                  </div>
                )}
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">Período</span>
                  <span className="text-sm font-medium">
                    {formatDatePT(periodStartISO)} – {formatDatePT(periodEndISO)}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">Semanas</span>
                  <span className="text-sm font-medium">{weeks}</span>
                </div>
                {selectedPlan && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-muted-foreground">Planificação</span>
                    <span className="max-w-[200px] truncate text-sm font-medium">
                      {selectedPlan.title}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">Aulas/semana</span>
                  <span className="text-sm font-medium">{slotsPerWeek}</span>
                </div>
                {slotsPerWeek > 0 && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-muted-foreground">Total estimado</span>
                    <span className="text-sm font-semibold text-primary">
                      {totalLessons} aulas
                    </span>
                  </div>
                )}
              </div>

              {slots.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Disciplinas
                  </p>
                  {slots.map((slot, i) => {
                    const subjectLabel =
                      SUBJECTS.find((s) => s.value === slot.subject)?.label ?? slot.subject;
                    const dayLabel =
                      DAYS_OF_WEEK.find((d) => d.value === slot.dayOfWeek)?.label ?? "";
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm"
                        style={{ borderLeftWidth: 3, borderLeftColor: slot.color }}
                      >
                        <span className="font-medium">{subjectLabel}</span>
                        <span className="text-xs text-muted-foreground">
                          {slot.gradeLevel}.º ano · {dayLabel} · {slot.startTime}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedPlan && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
                  A IA utilizará a planificação{" "}
                  <strong>{selectedPlan.title}</strong> como contexto para gerar os tópicos e
                  os planos de aula.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={goBack} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          {step === "period" ? "Cancelar" : "Anterior"}
        </Button>

        {step !== "review" ? (
          <Button
            onClick={goNext}
            disabled={step === "period" && !step1Valid}
            className="gap-2"
          >
            Seguinte
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={!step1Valid || submitting} className="gap-2">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                A criar…
              </>
            ) : (
              <>
                Criar horário
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
