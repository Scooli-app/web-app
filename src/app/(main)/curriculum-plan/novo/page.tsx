"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Stepper } from "@/components/ui/stepper";
import { GenerationProgress } from "@/components/document-creation/GenerationProgress";
import { WizardShell } from "@/components/document-creation/WizardShell";
import { WeekSchedulePicker } from "@/components/document-creation/WeekSchedulePicker";
import {
  SUBJECTS,
  GRADE_GROUPS,
  SUBJECTS_BY_GRADE,
  getSubjectsForGrade,
  groupSubjectsByCategory,
} from "@/components/document-creation/constants";
import {
  createDocument,
  setPendingInitialPrompt,
} from "@/store/documents/documentSlice";
import { selectIsCurriculumPlanEnabled } from "@/store/features/selectors";
import { useAppDispatch } from "@/store/hooks";
import {
  buildSchoolPeriodPresets,
  formatPresetRange,
  type SchoolPeriodPreset,
} from "@/lib/periodPresets";
import {
  DEFAULT_WEEK_SCHEDULE,
  weekScheduleLessonsPerWeek,
  weeksBetweenIso,
  type WeekSchedule,
} from "@/lib/timetable/planToTimetable";
import { Routes, type CurriculumPlanningType } from "@/shared/types";
import { cn } from "@/shared/utils/utils";
import { ChevronLeft, ChevronRight, CalendarDays, BookOpen, Settings2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { id: "period", label: "Período", icon: CalendarDays },
  { id: "class", label: "Turma", icon: BookOpen },
  { id: "schedule", label: "Horário", icon: Settings2 },
  { id: "review", label: "Resumo", icon: CheckCircle2 },
] as const;

type StepId = (typeof STEPS)[number]["id"] | "loading";

const LOADING_STEPS = [
  "A analisar as Aprendizagens Essenciais",
  "A estruturar as secções da planificação",
  "A definir a calendarização por unidades",
  "Revisão pedagógica final",
];

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CurriculumPlanNewPage() {
  const enabled = useSelector(selectIsCurriculumPlanEnabled);
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [step, setStep] = useState<StepId>("period");
  const [planningType, setPlanningType] = useState<CurriculumPlanningType>("trimester");
  const [periodStart, setPeriodStart] = useState<Date | undefined>(undefined);
  const [periodEnd, setPeriodEnd] = useState<Date | undefined>(undefined);
  const [subjectId, setSubjectId] = useState("");
  const [gradeLevel, setGradeLevel] = useState("5");
  const [schedule, setSchedule] = useState<WeekSchedule>(DEFAULT_WEEK_SCHEDULE);
  const [submitting, setSubmitting] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const PRESETS = useMemo(() => buildSchoolPeriodPresets(), []);

  useEffect(() => {
    if (!enabled) router.replace(Routes.DASHBOARD);
  }, [enabled, router]);

  const lpw = useMemo(() => weekScheduleLessonsPerWeek(schedule), [schedule]);
  const periodStartISO = useMemo(() => (periodStart ? toISO(periodStart) : ""), [periodStart]);
  const periodEndISO = useMemo(() => (periodEnd ? toISO(periodEnd) : ""), [periodEnd]);
  const weeks = useMemo(() => weeksBetweenIso(periodStartISO, periodEndISO), [periodStartISO, periodEndISO]);
  const totalLessons = lpw * weeks;

  const selectedSubject = useMemo(
    () => SUBJECTS.find((s) => s.id === subjectId),
    [subjectId]
  );
  const subjectLabel = selectedSubject?.label ?? "";
  // Backend expects the canonical English value, not the internal id used for selection.
  const subjectValue = selectedSubject?.value ?? "";
  const schoolYear = Number(gradeLevel) || 0;

  const groupedSubjects = useMemo(
    () => groupSubjectsByCategory(getSubjectsForGrade(gradeLevel)),
    [gradeLevel]
  );

  function handleGradeLevelChange(grade: string) {
    setGradeLevel(grade);
    // Reset subject if it isn't offered for the newly selected grade
    const ids = SUBJECTS_BY_GRADE[grade] ?? [];
    if (subjectId && !ids.includes(subjectId)) setSubjectId("");
  }

  function applyPreset(preset: SchoolPeriodPreset) {
    setPeriodStart(new Date(`${preset.start}T00:00:00`));
    setPeriodEnd(new Date(`${preset.end}T00:00:00`));
    setPlanningType(preset.planningType);
  }

  // step validation
  const step1Valid = !!periodStart && !!periodEnd && periodEnd > periodStart;
  const step2Valid = !!subjectId && !!gradeLevel;
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
    setStep("loading");
    setLoadingStep(0);

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

      setLoadingStep(LOADING_STEPS.length - 1);
      router.push(`/curriculum-plan/${result.id}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível criar a planificação.";
      toast.error(message);
      setSubmitting(false);
      setStep("review");
    }
  }

  if (!enabled) return null;

  if (step === "loading") {
    return (
      <WizardShell>
        <GenerationProgress
          title="A gerar a tua planificação…"
          subtitle="A Scooli está a estruturar as 7 secções canónicas."
          steps={LOADING_STEPS}
          currentStep={loadingStep}
        />
      </WizardShell>
    );
  }

  return (
    <WizardShell>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nova planificação</h1>
        <p className="text-muted-foreground">
          A IA gera as 7 secções canónicas. Pode editar tudo depois.
        </p>
      </div>

      {/* Step indicator */}
      <Stepper steps={STEPS} currentStepId={step} onStepClick={(id) => setStep(id as StepId)} />

      {/* Step content */}
      <Card>
        <CardContent className="p-6">

          {/* ── Step 1: Period ── */}
          {step === "period" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Período letivo</h2>
                <p className="text-sm text-muted-foreground">
                  Escolhe um predefinido ou define manualmente as datas.
                </p>
              </div>

              {/* Period presets */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PRESETS.map((preset) => {
                  const isActive = periodStartISO === preset.start && periodEndISO === preset.end;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className={cn(
                        "flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors hover:border-primary/60",
                        isActive
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border bg-card text-foreground"
                      )}
                    >
                      <span className={cn("text-sm font-medium", isActive && "text-primary")}>
                        {preset.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatPresetRange(preset.start, preset.end)}
                      </span>
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
                  {" "}de{" "}
                  <span className="font-medium">{formatDatePT(periodStartISO)}</span>
                  {" "}a{" "}
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

          {/* ── Step 2: Class details ── */}
          {step === "class" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Detalhes da turma</h2>
                <p className="text-sm text-muted-foreground">
                  Indica a disciplina e o ano de escolaridade.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="schoolYear">Ano de escolaridade *</Label>
                <Select value={gradeLevel} onValueChange={handleGradeLevelChange}>
                  <SelectTrigger id="schoolYear" className="h-12 text-base">
                    <SelectValue placeholder="Seleciona o ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_GROUPS.map((group) => (
                      <SelectGroup key={group.label}>
                        <SelectLabel className="text-xs font-bold text-primary border-b border-border/50 mb-1">
                          {group.label}
                        </SelectLabel>
                        {group.grades.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Disciplina *</Label>
                <Select value={subjectId} onValueChange={setSubjectId} disabled={!gradeLevel}>
                  <SelectTrigger id="subject" className="h-12 text-base">
                    <SelectValue
                      placeholder={
                        gradeLevel
                          ? "Seleciona a disciplina"
                          : "Seleciona primeiro o ano de escolaridade"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-[380px]">
                    {groupedSubjects.map(({ category, subjects }) => (
                      <SelectGroup key={category}>
                        <SelectLabel className="text-xs font-bold text-primary border-b border-border/50 mb-1">
                          {category}
                        </SelectLabel>
                        {subjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* ── Step 3: Schedule ── */}
          {step === "schedule" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Horário semanal</h2>
                <p className="text-sm text-muted-foreground">
                  Define quantas aulas tens por dia. O total será usado para estimar a duração.
                </p>
              </div>

              <WeekSchedulePicker schedule={schedule} onChange={setSchedule} />

              {weeks > 0 && lpw > 0 && (
                <div className="rounded-lg bg-muted px-4 py-3 text-sm">
                  <span className="font-medium">{totalLessons} aulas</span> estimadas
                  {" "}({weeks} sem. × {lpw} aulas/sem.)
                </div>
              )}
            </div>
          )}

          {/* ── Step 4: Review ── */}
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

      {/* Navigation */}
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
    </WizardShell>
  );
}
