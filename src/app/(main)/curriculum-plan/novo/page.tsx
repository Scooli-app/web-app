"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SUBJECTS } from "@/components/document-creation/constants";
import {
  createDocument,
  setPendingInitialPrompt,
} from "@/store/documents/documentSlice";
import { selectIsCurriculumPlanEnabled } from "@/store/features/selectors";
import { useAppDispatch } from "@/store/hooks";
import { Routes, type CurriculumPlanningType } from "@/shared/types";
import { cn } from "@/shared/utils/utils";
import { ChevronLeft, ChevronRight, CalendarDays, BookOpen, Settings2, CheckCircle2, Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

interface DaySchedule {
  enabled: boolean;
  periods: number;
}

type WeekSchedule = Record<DayKey, DaySchedule>;

// ─── Constants ────────────────────────────────────────────────────────────────

const SCHOOL_YEARS = Array.from({ length: 12 }, (_, i) => i + 1);

const DAYS: { key: DayKey; label: string; short: string }[] = [
  { key: "mon", label: "Segunda", short: "Seg" },
  { key: "tue", label: "Terça", short: "Ter" },
  { key: "wed", label: "Quarta", short: "Qua" },
  { key: "thu", label: "Quinta", short: "Qui" },
  { key: "fri", label: "Sexta", short: "Sex" },
  { key: "sat", label: "Sábado", short: "Sáb" },
  { key: "sun", label: "Domingo", short: "Dom" },
];

const DEFAULT_SCHEDULE: WeekSchedule = {
  mon: { enabled: true, periods: 1 },
  tue: { enabled: false, periods: 1 },
  wed: { enabled: true, periods: 1 },
  thu: { enabled: false, periods: 1 },
  fri: { enabled: true, periods: 1 },
  sat: { enabled: false, periods: 1 },
  sun: { enabled: false, periods: 1 },
};

const STEPS = [
  { id: "period", label: "Período", icon: CalendarDays },
  { id: "class", label: "Turma", icon: BookOpen },
  { id: "schedule", label: "Horário", icon: Settings2 },
  { id: "review", label: "Resumo", icon: CheckCircle2 },
] as const;

type StepId = (typeof STEPS)[number]["id"];

// ─── School year configuration (easily adjustable) ───────────────────────────

const SCHOOL_YEAR_START_MONTH = 9;
const SCHOOL_YEAR_START_DAY = 1;
const SCHOOL_YEAR_END_MONTH = 6;
const SCHOOL_YEAR_END_DAY = 30;

// ─── Presets ──────────────────────────────────────────────────────────────────

interface Preset {
  label: string;
  planningType: CurriculumPlanningType;
  getRange: () => { start: string; end: string };
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function buildPresets(): Preset[] {
  const today = new Date();
  const year = today.getFullYear();
  const m = today.getMonth() + 1;
  const syStart = m >= SCHOOL_YEAR_START_MONTH ? year : year - 1;
  const syEnd = syStart + 1;
  const syEndDate = new Date(syEnd, SCHOOL_YEAR_END_MONTH - 1, SCHOOL_YEAR_END_DAY);

  const raw: Preset[] = [
    {
      label: "Próximas 2 semanas",
      planningType: "custom",
      getRange: () => ({ start: toISO(today), end: toISO(addDays(today, 14)) }),
    },
    {
      label: "Próximos 2 meses",
      planningType: "custom",
      getRange: () => {
        const end = new Date(today);
        end.setMonth(end.getMonth() + 2);
        return { start: toISO(today), end: toISO(end) };
      },
    },
    {
      label: "Próximo trimestre",
      planningType: "trimester",
      getRange: () => {
        const end = new Date(today);
        end.setMonth(end.getMonth() + 3);
        return { start: toISO(today), end: toISO(end) };
      },
    },
    {
      label: "Próximo semestre",
      planningType: "semester",
      getRange: () => {
        const end = new Date(today);
        end.setMonth(end.getMonth() + 6);
        return { start: toISO(today), end: toISO(end) };
      },
    },
    {
      label: `Ano letivo ${syStart}/${syEnd}`,
      planningType: "annual",
      getRange: () => ({
        start: `${syStart}-${String(SCHOOL_YEAR_START_MONTH).padStart(2, "0")}-${String(SCHOOL_YEAR_START_DAY).padStart(2, "0")}`,
        end: toISO(syEndDate),
      }),
    },
  ];
  return raw;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function weeksBetween(startISO: string, endISO: string): number {
  const start = new Date(startISO);
  const end = new Date(endISO);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const ms = end.getTime() - start.getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24 * 7)));
}

function lessonsPerWeekFromSchedule(schedule: WeekSchedule): number {
  return Object.values(schedule).reduce(
    (sum, d) => sum + (d.enabled ? d.periods : 0),
    0
  );
}

function formatDatePT(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function planningTypeLabel(t: CurriculumPlanningType): string {
  const map: Record<CurriculumPlanningType, string> = {
    annual: "Anual",
    semester: "Semestral",
    trimester: "Trimestral",
    custom: "Personalizado",
  };
  return map[t];
}

function buildPrompt(p: {
  planningType: CurriculumPlanningType;
  subjectLabel: string;
  schoolYear: number;
  periodStart: string;
  periodEnd: string;
  lessonsPerWeek: number;
  totalLessons: number;
}) {
  return (
    `Planificação ${planningTypeLabel(p.planningType).toLowerCase()} de ${p.subjectLabel} para o ` +
    `${p.schoolYear}.º ano, de ${p.periodStart} a ${p.periodEnd}, com cerca de ` +
    `${p.lessonsPerWeek} aulas por semana (${p.totalLessons} aulas totais estimadas). ` +
    "Gera as 7 secções canónicas (Identificação, Perfil do Aluno, AEs, Calendarização, " +
    "Desenvolvimento por Unidades, Avaliação, Articulação Curricular)."
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({
  current,
  onNavigate,
}: {
  current: StepId;
  onNavigate: (step: StepId) => void;
}) {
  const currentIdx = STEPS.findIndex((s) => s.id === current);
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, idx) => {
        const Icon = step.icon;
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        const clickable = done;
        return (
          <div key={step.id} className="flex items-center">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onNavigate(step.id)}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors",
                active && "border-primary bg-primary text-primary-foreground",
                done && "border-primary bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer",
                !active && !done && "border-muted-foreground/30 text-muted-foreground/50 cursor-default"
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onNavigate(step.id)}
              className={cn(
                "ml-2 hidden text-sm font-medium sm:inline transition-colors",
                active && "text-foreground cursor-default",
                done && "text-primary hover:text-primary/80 cursor-pointer",
                !active && !done && "text-muted-foreground/50 cursor-default"
              )}
            >
              {step.label}
            </button>
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-3 h-px w-8 transition-colors sm:w-12",
                  idx < currentIdx ? "bg-primary" : "bg-muted-foreground/20"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Day schedule picker ──────────────────────────────────────────────────────

function DaySchedulePicker({
  schedule,
  onChange,
}: {
  schedule: WeekSchedule;
  onChange: (s: WeekSchedule) => void;
}) {
  function toggle(key: DayKey) {
    onChange({ ...schedule, [key]: { ...schedule[key], enabled: !schedule[key].enabled } });
  }

  function adjust(key: DayKey, delta: number) {
    const next = Math.min(10, Math.max(1, schedule[key].periods + delta));
    onChange({ ...schedule, [key]: { ...schedule[key], periods: next } });
  }

  const total = lessonsPerWeekFromSchedule(schedule);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Seleciona os dias e o número de tempos letivos por dia.
        </p>
        <Badge variant="secondary" className="text-sm font-semibold">
          {total} aula{total !== 1 ? "s" : ""}/semana
        </Badge>
      </div>

      <div className="grid gap-2">
        {DAYS.map(({ key, label, short }) => {
          const day = schedule[key];
          return (
            <div
              key={key}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors",
                day.enabled
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-background opacity-60"
              )}
            >
              <button
                type="button"
                onClick={() => toggle(key)}
                className={cn(
                  "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  day.enabled
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/30"
                )}
              >
                {day.enabled && (
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 12 12">
                    <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                )}
              </button>

              <span className="w-20 text-sm font-medium">
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{short}</span>
              </span>

              {day.enabled && (
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => adjust(key, -1)}
                    disabled={day.periods <= 1}
                    className="flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-6 text-center text-sm font-semibold tabular-nums">
                    {day.periods}
                  </span>
                  <button
                    type="button"
                    onClick={() => adjust(key, 1)}
                    disabled={day.periods >= 10}
                    className="flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <span className="ml-1 w-14 text-xs text-muted-foreground">
                    tempo{day.periods !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CurriculumPlanNewPage() {
  const enabled = useSelector(selectIsCurriculumPlanEnabled);
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [step, setStep] = useState<StepId>("period");
  const [planningType, setPlanningType] = useState<CurriculumPlanningType>("trimester");
  const [periodStart, setPeriodStart] = useState<Date | undefined>(undefined);
  const [periodEnd, setPeriodEnd] = useState<Date | undefined>(undefined);
  const [subjectValue, setSubjectValue] = useState("");
  const [schoolYear, setSchoolYear] = useState(5);
  const [schedule, setSchedule] = useState<WeekSchedule>(DEFAULT_SCHEDULE);
  const [submitting, setSubmitting] = useState(false);

  const PRESETS = useMemo(() => buildPresets(), []);

  useEffect(() => {
    if (!enabled) router.replace(Routes.DASHBOARD);
  }, [enabled, router]);

  const lpw = useMemo(() => lessonsPerWeekFromSchedule(schedule), [schedule]);
  const periodStartISO = useMemo(() => (periodStart ? toISO(periodStart) : ""), [periodStart]);
  const periodEndISO = useMemo(() => (periodEnd ? toISO(periodEnd) : ""), [periodEnd]);
  const weeks = useMemo(() => weeksBetween(periodStartISO, periodEndISO), [periodStartISO, periodEndISO]);
  const totalLessons = lpw * weeks;

  const subjectLabel = useMemo(
    () => SUBJECTS.find((s) => s.value === subjectValue)?.label ?? "",
    [subjectValue]
  );

  function applyPreset(preset: Preset) {
    const { start, end } = preset.getRange();
    setPeriodStart(new Date(start));
    setPeriodEnd(new Date(end));
    setPlanningType(preset.planningType);
  }

  const step1Valid = !!periodStart && !!periodEnd && periodEnd > periodStart;
  const step2Valid = !!subjectValue;
  const step3Valid = lpw > 0;

  function goNext() {
    const order: StepId[] = ["period", "class", "schedule", "review"];
    const idx = order.indexOf(step);
    if (idx < order.length - 1) setStep(order[idx + 1]);
  }

  function goBack() {
    const order: StepId[] = ["period", "class", "schedule", "review"];
    const idx = order.indexOf(step);
    if (idx > 0) setStep(order[idx - 1]);
    else router.back();
  }

  async function handleSubmit() {
    if (!step1Valid || !step2Valid || !step3Valid) return;
    setSubmitting(true);

    const prompt = buildPrompt({
      planningType,
      subjectLabel,
      schoolYear,
      periodStart: periodStartISO,
      periodEnd: periodEndISO,
      lessonsPerWeek: lpw,
      totalLessons,
    });

    try {
      dispatch(setPendingInitialPrompt(prompt));

      const result = await dispatch(
        createDocument({
          documentType: "curriculumPlan",
          prompt,
          subject: subjectValue,
          schoolYear,
          additionalDetails: JSON.stringify({
            planningType,
            periodStart: periodStartISO,
            periodEnd: periodEndISO,
            lessonsPerWeek: lpw,
            totalLessonsEstimate: totalLessons,
            weekSchedule: schedule,
          }),
          worksheetVariant: planningType as never,
        })
      ).unwrap();

      router.push(`/lesson-plan/${result.id}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível criar a planificação.";
      toast.error(message);
      setSubmitting(false);
    }
  }

  if (!enabled) return null;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nova planificação</h1>
        <p className="text-muted-foreground">
          A IA gera as 7 secções canónicas. Pode editar tudo depois.
        </p>
      </div>

      <StepIndicator current={step} onNavigate={setStep} />

      <Card>
        <CardContent className="p-6">

          {step === "period" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Período letivo</h2>
                <p className="text-sm text-muted-foreground">
                  Escolhe um predefinido ou define manualmente as datas.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {PRESETS.map((preset) => {
                  const { start, end } = preset.getRange();
                  const active = periodStartISO === start && periodEndISO === end;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className={cn(
                        "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:border-primary hover:text-primary"
                      )}
                    >
                      {preset.label}
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

              {step1Valid && (
                <div className="rounded-lg bg-muted px-4 py-3 text-sm">
                  <span className="font-medium">{weeks} semana{weeks !== 1 ? "s" : ""}</span>
                  {" de "}
                  <span className="font-medium">{formatDatePT(periodStartISO)}</span>
                  {" a "}
                  <span className="font-medium">{formatDatePT(periodEndISO)}</span>
                  {" · "}
                  <span className="text-muted-foreground capitalize">{planningTypeLabel(planningType)}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="planningType">Tipo de período</Label>
                <Select
                  value={planningType}
                  onValueChange={(v) => setPlanningType(v as CurriculumPlanningType)}
                >
                  <SelectTrigger id="planningType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">Anual</SelectItem>
                    <SelectItem value="semester">Semestral</SelectItem>
                    <SelectItem value="trimester">Trimestral</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === "class" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Detalhes da turma</h2>
                <p className="text-sm text-muted-foreground">
                  Indica a disciplina e o ano de escolaridade.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Disciplina</Label>
                <Select value={subjectValue} onValueChange={setSubjectValue}>
                  <SelectTrigger id="subject" className="h-12 text-base">
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

              <div className="space-y-2">
                <Label htmlFor="schoolYear">Ano de escolaridade</Label>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {SCHOOL_YEARS.map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => setSchoolYear(y)}
                      className={cn(
                        "rounded-lg border py-3 text-sm font-medium transition-colors",
                        schoolYear === y
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary hover:text-primary"
                      )}
                    >
                      {y}.º
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === "schedule" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Horário semanal</h2>
                <p className="text-sm text-muted-foreground">
                  Define quantas aulas tens por dia. O total será usado para estimar a duração.
                </p>
              </div>

              <DaySchedulePicker schedule={schedule} onChange={setSchedule} />

              {weeks > 0 && lpw > 0 && (
                <div className="rounded-lg bg-muted px-4 py-3 text-sm">
                  <span className="font-medium">{totalLessons} aulas</span> estimadas
                  {" "}({weeks} sem. × {lpw} aulas/sem.)
                </div>
              )}
            </div>
          )}

          {step === "review" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Resumo</h2>
                <p className="text-sm text-muted-foreground">
                  Confirma os dados antes de gerar a planificação.
                </p>
              </div>

              <div className="divide-y rounded-lg border">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">Período</span>
                  <span className="text-sm font-medium">
                    {formatDatePT(periodStartISO)} – {formatDatePT(periodEndISO)}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">Tipo</span>
                  <span className="text-sm font-medium">{planningTypeLabel(planningType)}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">Disciplina</span>
                  <span className="text-sm font-medium">{subjectLabel || "—"}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">Ano</span>
                  <span className="text-sm font-medium">{schoolYear}.º ano</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">Aulas / semana</span>
                  <span className="text-sm font-medium">{lpw}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">Total estimado</span>
                  <span className="text-sm font-semibold text-primary">{totalLessons} aulas</span>
                </div>
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
                A IA irá gerar as <strong>7 secções canónicas</strong>: Identificação, Perfil do Aluno,
                Aprendizagens Essenciais, Calendarização, Desenvolvimento por Unidades, Avaliação e
                Articulação Curricular.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={goBack} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          {step === "period" ? "Cancelar" : "Anterior"}
        </Button>

        {step !== "review" ? (
          <Button
            onClick={goNext}
            disabled={
              (step === "period" && !step1Valid) ||
              (step === "class" && !step2Valid) ||
              (step === "schedule" && !step3Valid)
            }
            className="gap-2"
          >
            Seguinte
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!step1Valid || !step2Valid || !step3Valid || submitting}
            className="gap-2"
          >
            {submitting ? "A gerar..." : "Gerar planificação"}
            {!submitting && <ChevronRight className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  );
}
