"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stepper } from "@/components/ui/stepper";
import { GenerationProgress } from "@/components/document-creation/GenerationProgress";
import { WizardShell } from "@/components/document-creation/WizardShell";
import {
  buildSchoolPeriodPresets,
  currentSchoolYearBase,
  formatPresetRange,
} from "@/lib/periodPresets";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
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
import {
  SUBJECTS,
  GRADE_GROUPS,
  SUBJECTS_BY_GRADE,
  TIMETABLE_COLORS,
  translateSubject,
  getSubjectsForGrade,
  groupSubjectsByCategory,
} from "@/components/document-creation/constants";
import { selectIsHorarioPlanosEnabled } from "@/store/features/selectors";
import { createTimetable, generateTopics } from "@/store/timetable/timetableSlice";
import { useAppDispatch } from "@/store/hooks";
import type { RootState } from "@/store/store";
import { Routes as AppRoutes, type Document } from "@/shared/types";
import { getDocument, getDocuments } from "@/services/api/document.service";
import { cn } from "@/shared/utils/utils";
import {
  applyExerciseAndReviewCadence,
  DEFAULT_WEEK_SCHEDULE,
  expandSlotsLocally,
  inferSchoolYearLabel,
  parsePlanDetails,
  resolvePlanSubjectId,
  suggestReviewsBeforeAssessments,
  weekScheduleLessonsPerWeek,
  weekScheduleToRecurringSlots,
  weeksBetweenIso,
  type PreviewSlot,
  type SlotType,
  type WeekSchedule,
} from "@/lib/timetable/planToTimetable";
import { WeekSchedulePicker } from "@/components/document-creation/WeekSchedulePicker";
import { toast } from "sonner";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  ListChecks,
  Loader2,
  Settings2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";

// ─────────────────────── Types ────────────────────────────────────────────────

type WizardStep =
  | "choose_mode"
  | "mode_a_select_plan"
  | "mode_b_period"
  | "mode_b_details"
  | "rever_datas"
  | "loading";

// ─────────────────────── Step metadata ────────────────────────────────────────

const STEP_INDICATOR = [
  { id: "mode_a_select_plan", label: "Planificação", icon: BookOpen },
  { id: "mode_b_period",      label: "Período",       icon: CalendarDays },
  { id: "mode_b_details",     label: "Detalhes",      icon: Settings2 },
  { id: "rever_datas",        label: "Rever",         icon: ListChecks },
] as const;

const STEP_INDICATOR_CUSTOM = [
  { id: "mode_b_period",  label: "Período",  icon: CalendarDays },
  { id: "mode_b_details", label: "Detalhes", icon: Settings2 },
  { id: "rever_datas",    label: "Rever",    icon: ListChecks },
] as const;

// ─────────────────────── Constants ────────────────────────────────────────────

const LOADING_STEPS = [
  "A mapear competências curriculares",
  "A organizar conteúdos e sequência pedagógica",
  "A definir avaliações e critérios",
  "Revisão pedagógica final",
];

const PERIOD_PRESETS = buildSchoolPeriodPresets();

// ─────────────────────── Slot expansion util ──────────────────────────────────

function groupByMonth(slots: PreviewSlot[]): { month: string; slots: PreviewSlot[] }[] {
  const map = new Map<string, PreviewSlot[]>();
  for (const slot of slots) {
    const month = slot.date.slice(0, 7);
    if (!map.has(month)) map.set(month, []);
    const arr = map.get(month);
    if (arr) arr.push(slot);
  }
  return Array.from(map.entries()).map(([month, s]) => ({ month, slots: s }));
}

function formatMonthLabel(ym: string): string {
  const [year, month] = ym.split("-");
  return new Date(Number(year), Number(month) - 1, 1)
    .toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
}

function formatDayLabel(iso: string): string {
  return new Date(`${iso}T00:00:00`)
    .toLocaleDateString("pt-PT", { weekday: "short", day: "numeric", month: "short" });
}

function isoToDate(iso: string): Date | undefined {
  if (!iso) return undefined;
  const d = new Date(`${iso}T00:00:00`);
  return isNaN(d.getTime()) ? undefined : d;
}

function dateToIso(d: Date | undefined): string {
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─────────────────────── Step: Choose mode ────────────────────────────────────

function StepChooseMode({ onSelect }: { onSelect: (mode: "from_plan" | "custom") => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Como queres criar a turma?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolhe o método que melhor se adapta ao teu fluxo de trabalho.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card
          className="cursor-pointer border-2 transition hover:border-primary hover:shadow-md"
          onClick={() => onSelect("from_plan")}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">A partir de uma planificação</CardTitle>
            </div>
            <Badge className="w-fit text-xs" variant="secondary">Recomendado</Badge>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              A Scooli lê a tua planificação e preenche tudo — período, tópicos e AEs. Só revês as datas.
            </p>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer border-2 transition hover:border-primary hover:shadow-md"
          onClick={() => onSelect("custom")}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Do zero</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Define o período e disciplina. A Scooli gera os tópicos a partir das AEs do ano.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────── Step: Select plan ────────────────────────────────────

function StepSelectPlan({
  onSelect,
}: {
  onSelect: (plan: Document) => void;
}) {
  const [plans, setPlans] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    getDocuments({ page: 1, limit: 50, filters: { documentType: "curriculum_plan" } })
      .then((res) => setPlans(res.documents ?? []))
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = plans.filter(
    (p) =>
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.subject ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Escolhe uma planificação</h2>
        <p className="text-sm text-muted-foreground">
          A Scooli extrai o período, disciplina e tópicos automaticamente.
        </p>
      </div>
      <Input
        placeholder="Pesquisar planificações..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {loading ? (
        <div className="py-8 text-center">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          {plans.length === 0
            ? "Ainda não tens planificações criadas."
            : "Nenhuma planificação encontrada."}
        </div>
      ) : (
        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {filtered.map((plan) => (
            <Card
              key={plan.id}
              className="cursor-pointer transition hover:border-primary hover:shadow-sm"
              onClick={() => onSelect(plan)}
            >
              <CardContent className="flex items-center gap-3 py-3">
                <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{plan.title}</p>
                  {(plan.subject ?? plan.gradeLevel) && (
                    <p className="text-xs text-muted-foreground">
                      {[plan.subject ? translateSubject(plan.subject) : null, plan.gradeLevel ? `${plan.gradeLevel}.º ano` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────── Step: Period ─────────────────────────────────────────

interface StepPeriodProps {
  periodStart: string;
  periodEnd: string;
  schoolYearLabel: string;
  onChange: (start: string, end: string, label: string) => void;
}

function StepPeriod({ periodStart, periodEnd, schoolYearLabel, onChange }: StepPeriodProps) {

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Período letivo</h2>
        <p className="text-sm text-muted-foreground">Define as datas de início e fim da turma.</p>
      </div>

      {/* Presets */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Atalhos
        </Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PERIOD_PRESETS.map((p) => {
            const isActive = periodStart === p.start && periodEnd === p.end;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => onChange(p.start, p.end, schoolYearLabel)}
                className={cn(
                  "flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors hover:border-primary/60",
                  isActive
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border bg-card text-foreground"
                )}
              >
                <span className={cn("text-sm font-medium", isActive && "text-primary")}>
                  {p.label}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {formatPresetRange(p.start, p.end)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Date pickers */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Início *</Label>
          <DatePicker
            value={isoToDate(periodStart)}
            onChange={(d) => onChange(dateToIso(d), periodEnd, schoolYearLabel)}
            placeholder="Seleciona a data de início"
            toDate={isoToDate(periodEnd)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Fim *</Label>
          <DatePicker
            value={isoToDate(periodEnd)}
            onChange={(d) => onChange(periodStart, dateToIso(d), schoolYearLabel)}
            placeholder="Seleciona a data de fim"
            fromDate={isoToDate(periodStart)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Ano letivo</Label>
        <Input
          placeholder="Ex: 2025/2026"
          value={schoolYearLabel}
          onChange={(e) => onChange(periodStart, periodEnd, e.target.value)}
        />
      </div>
    </div>
  );
}

// ─────────────────────── Step: Details ────────────────────────────────────────

interface StepDetailsProps {
  subject: string;
  gradeLevel: string;
  classLabel: string;
  title: string;
  color: string;
  schedule: WeekSchedule;
  periodStart: string;
  periodEnd: string;
  onFieldChange: (field: string, value: string) => void;
  onScheduleChange: (schedule: WeekSchedule) => void;
  onColorChange: (color: string) => void;
}

function StepDetails({
  subject, gradeLevel, classLabel, title, color,
  schedule, periodStart, periodEnd, onFieldChange, onScheduleChange, onColorChange,
}: StepDetailsProps) {

  const groupedSubjects = groupSubjectsByCategory(getSubjectsForGrade(gradeLevel));
  const lpw = weekScheduleLessonsPerWeek(schedule);
  const weeks = weeksBetweenIso(periodStart, periodEnd);
  const totalLessons = lpw * weeks;

  const handleGradeChange = (grade: string) => {
    onFieldChange("gradeLevel", grade);
    // Reset subject if it's not available for the new grade
    const ids = SUBJECTS_BY_GRADE[grade] ?? [];
    const currentSubjectId = subject; // subject is now stored as id
    if (currentSubjectId && !ids.includes(currentSubjectId)) {
      onFieldChange("subject", "");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Detalhes da turma</h2>
        <p className="text-sm text-muted-foreground">Disciplina, ano e horário semanal.</p>
      </div>

      {/* Grade + class */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Ano de escolaridade *</Label>
          <Select value={gradeLevel} onValueChange={handleGradeChange}>
            <SelectTrigger>
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
        <div className="space-y-1.5">
          <Label>Turma</Label>
          <Input
            placeholder="Ex: A"
            value={classLabel}
            onChange={(e) => onFieldChange("classLabel", e.target.value)}
          />
        </div>
      </div>

      {/* Subject — filtered by grade, grouped by category */}
      <div className="space-y-1.5">
        <Label>Disciplina *</Label>
        <Select
          value={subject}
          onValueChange={(v) => onFieldChange("subject", v)}
          disabled={!gradeLevel}
        >
          <SelectTrigger>
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

      {/* Title + color */}
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div className="space-y-1.5">
          <Label>Nome da turma</Label>
          <Input
            placeholder="Auto-preenchido"
            value={title}
            onChange={(e) => onFieldChange("title", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Cor</Label>
          <div className="flex flex-wrap gap-1.5 pt-2.5">
            {TIMETABLE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onColorChange(c)}
                className={cn(
                  "h-6 w-6 rounded-full border-2 transition-transform hover:scale-110",
                  color === c ? "border-foreground scale-110" : "border-transparent"
                )}
                style={{ backgroundColor: c }}
                aria-label={c}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Weekly schedule */}
      <WeekSchedulePicker
        schedule={schedule}
        onChange={onScheduleChange}
        maxPeriodsPerDay={5}
      />

      {weeks > 0 && lpw > 0 && (
        <div className="rounded-lg bg-muted px-4 py-3 text-sm">
          <span className="font-medium">{totalLessons} aulas</span> estimadas
          {" "}({weeks} sem. × {lpw} aulas/sem.)
        </div>
      )}
    </div>
  );
}

// ─────────────────────── Step: Review dates ───────────────────────────────────

interface StepReverDatasProps {
  slots: PreviewSlot[];
  onSlotsChange: (slots: PreviewSlot[]) => void;
}

function StepReverDatas({ slots, onSlotsChange }: StepReverDatasProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const changeType = (id: string, type: SlotType) => {
    let updated = slots.map((s) => (s.id === id ? { ...s, slotType: type } : s));
    if (type === "ASSESSMENT") updated = suggestReviewsBeforeAssessments(updated, new Set([id]));
    onSlotsChange(updated);
  };

  const removeSlot = (id: string) => {
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
    onSlotsChange(slots.filter((s) => s.id !== id));
  };

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const selectAll = () => setSelected(new Set(slots.map((s) => s.id)));
  const clearSelection = () => setSelected(new Set());

  const applyBulkType = (type: SlotType) => {
    let updated = slots.map((s) => selected.has(s.id) ? { ...s, slotType: type } : s);
    if (type === "ASSESSMENT") updated = suggestReviewsBeforeAssessments(updated, new Set(selected));
    onSlotsChange(updated);
    clearSelection();
  };

  const removeBulk = () => {
    onSlotsChange(slots.filter((s) => !selected.has(s.id)));
    clearSelection();
  };

  const grouped = groupByMonth(slots);
  const lessons = slots.filter((s) => s.slotType === "LESSON").length;
  const assessments = slots.filter((s) => s.slotType === "ASSESSMENT").length;
  const holidays = slots.filter((s) => s.slotType === "HOLIDAY").length;
  const exercises = slots.filter((s) => s.slotType === "EXERCISE").length;
  const reviews = slots.filter((s) => s.slotType === "REVIEW").length;
  const hasSelection = selected.size > 0;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Rever datas</h2>
        <p className="text-sm text-muted-foreground">
          Ajusta os tipos de slot e remove datas desnecessárias.
        </p>
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
        <span>Total: <strong>{slots.length}</strong></span>
        <span className="text-muted-foreground">·</span>
        <span>Aulas: <strong>{lessons}</strong></span>
        <span className="text-muted-foreground">·</span>
        <span>Avaliações: <strong>{assessments}</strong></span>
        <span className="text-muted-foreground">·</span>
        <span>Exercícios: <strong>{exercises}</strong></span>
        <span className="text-muted-foreground">·</span>
        <span>Revisões: <strong>{reviews}</strong></span>
        <span className="text-muted-foreground">·</span>
        <span>Feriados: <strong>{holidays}</strong></span>
      </div>

      {/* Bulk actions bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={hasSelection ? clearSelection : selectAll}
        >
          {hasSelection ? `Desselecionar (${selected.size})` : "Selecionar tudo"}
        </Button>
        {hasSelection && (
          <>
            <span className="text-xs text-muted-foreground">Marcar como:</span>
            <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => applyBulkType("LESSON")}>Aula</Button>
            <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => applyBulkType("ASSESSMENT")}>Avaliação</Button>
            <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => applyBulkType("EXERCISE")}>Exercícios</Button>
            <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => applyBulkType("REVIEW")}>Revisão</Button>
            <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => applyBulkType("HOLIDAY")}>Feriado</Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="h-7 text-xs"
              onClick={removeBulk}
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Remover
            </Button>
          </>
        )}
      </div>

      {slots.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Não há aulas geradas para este período com o horário definido.
          <br />
          Volta atrás e confirma as datas e os dias de aula.
        </div>
      ) : (
        <div className="max-h-[440px] space-y-4 overflow-y-auto pr-1">
          {grouped.map(({ month, slots: monthSlots }) => (
            <div key={month}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {formatMonthLabel(month)}
              </p>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {monthSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors",
                      selected.has(slot.id) ? "border-primary bg-primary/5" :
                      slot.slotType === "HOLIDAY"
                        ? "border-muted bg-muted/40 opacity-60"
                        : slot.slotType === "ASSESSMENT"
                        ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
                        : slot.slotType === "EXERCISE"
                        ? "border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/30"
                        : slot.slotType === "REVIEW"
                        ? "border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/30"
                        : "bg-card"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(slot.id)}
                      onChange={() => toggleSelect(slot.id)}
                      className="h-3.5 w-3.5 shrink-0 accent-primary"
                    />
                    <span className="min-w-0 flex-1 text-xs font-medium">
                      {formatDayLabel(slot.date)}
                    </span>
                    <Select
                      value={slot.slotType}
                      onValueChange={(v) => changeType(slot.id, v as SlotType)}
                    >
                      <SelectTrigger className="h-6 w-[90px] text-xs px-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LESSON">Aula</SelectItem>
                        <SelectItem value="ASSESSMENT">Avaliação</SelectItem>
                        <SelectItem value="EXERCISE">Exercícios</SelectItem>
                        <SelectItem value="REVIEW">Revisão</SelectItem>
                        <SelectItem value="HOLIDAY">Feriado</SelectItem>
                      </SelectContent>
                    </Select>
                    <button
                      type="button"
                      onClick={() => removeSlot(slot.id)}
                      className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────── Main page ────────────────────────────────────────────

function CalendarNewPageContent() {
  const enabled = useSelector(selectIsHorarioPlanosEnabled);
  const isSubmitting = useSelector((state: RootState) => state.timetable.isLoading);
  const dispatch = useAppDispatch();
  const router = useRouter();

  const [step, setStep] = useState<WizardStep>("choose_mode");
  const [creationMode, setCreationMode] = useState<"from_plan" | "custom">("custom");
  const [selectedPlan, setSelectedPlan] = useState<Document | null>(null);

  // Form state
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [classLabel, setClassLabel] = useState("");
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [color, setColor] = useState<string>(TIMETABLE_COLORS[0]);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [schoolYearLabel, setSchoolYearLabel] = useState(() => {
    const y = currentSchoolYearBase();
    return `${y}/${y + 1}`;
  });
  const [schedule, setSchedule] = useState<WeekSchedule>(DEFAULT_WEEK_SCHEDULE);
  const [previewSlots, setPreviewSlots] = useState<PreviewSlot[]>([]);
  const [loadingStep, setLoadingStep] = useState(0);

  // Step validity (computed in parent so bottom nav can disable buttons)
  const periodCanProceed = !!periodStart && !!periodEnd && periodStart <= periodEnd;
  const detailsCanProceed = !!subject && !!gradeLevel && weekScheduleLessonsPerWeek(schedule) > 0;
  const actionableSlots = previewSlots.filter(
    (s) =>
      s.slotType === "LESSON" ||
      s.slotType === "ASSESSMENT" ||
      s.slotType === "EXERCISE" ||
      s.slotType === "REVIEW"
  ).length;

  // Auto-generate title using the Portuguese display label (not the internal id/English value)
  const autoTitle = useMemo(() => {
    const subjectLabel = SUBJECTS.find((s) => s.id === subject)?.label ?? subject;
    if (!subjectLabel) return "";
    return [gradeLevel ? `${gradeLevel}.º` : "", classLabel, subjectLabel]
      .filter(Boolean)
      .join(" ");
  }, [subject, gradeLevel, classLabel]);

  // Keeps following ano/turma/disciplina changes until the user edits the field directly —
  // comparing against the previous autoTitle would freeze the moment any one of those fields
  // changed and the title had already caught up with the earlier autoTitle.
  useEffect(() => {
    if (!titleTouched) setTitle(autoTitle);
  }, [autoTitle, titleTouched]);

  useEffect(() => {
    if (!enabled) router.replace(AppRoutes.DASHBOARD);
  }, [enabled, router]);

  const handlePlanSelect = (plan: Document) => {
    setSelectedPlan(plan);

    const subjectId = resolvePlanSubjectId(plan);
    if (subjectId) setSubject(subjectId);
    if (plan.gradeLevel) setGradeLevel(String(plan.gradeLevel));

    const planDetails = parsePlanDetails(plan);
    const metaPeriodStart = planDetails.periodStart ?? "";
    const metaPeriodEnd = planDetails.periodEnd ?? "";

    if (metaPeriodStart) setPeriodStart(metaPeriodStart);
    if (metaPeriodEnd) setPeriodEnd(metaPeriodEnd);

    const yearLabel = inferSchoolYearLabel(planDetails);
    if (yearLabel) setSchoolYearLabel(yearLabel);

    if (planDetails.weekSchedule) {
      setSchedule({ ...DEFAULT_WEEK_SCHEDULE, ...planDetails.weekSchedule });
    }

    // Skip the period step when dates are already pre-filled from the planificação
    setStep(metaPeriodStart && metaPeriodEnd ? "mode_b_details" : "mode_b_period");
  };

  // Deep-link entry point: /calendar/novo?planId=... — used by the one-click
  // "Criar plano letivo" button on an incomplete plan (e.g. imported, no
  // weekSchedule) to land here pre-filled instead of a dead end.
  const searchParams = useSearchParams();
  useEffect(() => {
    const planId = searchParams.get("planId");
    if (!planId) return;
    setCreationMode("from_plan");
    getDocument(planId)
      .then((plan) => handlePlanSelect(plan))
      .catch(() => toast.error("Não foi possível carregar a planificação."));
  }, [searchParams]);

  if (!enabled) return null;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleModeSelect = (mode: "from_plan" | "custom") => {
    setCreationMode(mode);
    setStep(mode === "from_plan" ? "mode_a_select_plan" : "mode_b_period");
  };

  const handleGoToReverDatas = () => {
    const slots = applyExerciseAndReviewCadence(
      expandSlotsLocally(periodStart, periodEnd, weekScheduleToRecurringSlots(schedule))
    );
    setPreviewSlots(slots);
    setStep("rever_datas");
  };

  const handleCreate = async () => {
    const holidays = previewSlots
      .filter((s) => s.slotType === "HOLIDAY")
      .map((s) => s.date);
    const assessmentDates = previewSlots
      .filter((s) => s.slotType === "ASSESSMENT")
      .map((s) => s.date);
    const exerciseDates = previewSlots
      .filter((s) => s.slotType === "EXERCISE")
      .map((s) => s.date);
    const reviewDates = previewSlots
      .filter((s) => s.slotType === "REVIEW")
      .map((s) => s.date);

    // subject is stored as the SUBJECTS id — send the canonical English value to the backend
    const subjectValue = SUBJECTS.find((s) => s.id === subject)?.value ?? subject;

    const result = await dispatch(
      createTimetable({
        title: title || autoTitle || "Nova Turma",
        subject: subjectValue,
        gradeLevel: Number(gradeLevel),
        classLabel: classLabel || undefined,
        color,
        periodStart,
        periodEnd,
        schoolYearLabel: schoolYearLabel || undefined,
        creationMode,
        linkedCurriculumPlan: selectedPlan?.id,
        recurringSlots: weekScheduleToRecurringSlots(schedule),
        holidays,
        assessmentDates,
        exerciseDates,
        reviewDates,
      })
    );

    if (!createTimetable.fulfilled.match(result)) {
      toast.error(
        typeof result.payload === "string"
          ? result.payload
          : "Não foi possível criar a turma."
      );
      return;
    }

    const timetableId = result.payload.id;
    setStep("loading");
    setLoadingStep(0);

    try {
      await dispatch(generateTopics(timetableId));
    } finally {
      setLoadingStep(LOADING_STEPS.length - 1);
      router.push(AppRoutes.CALENDAR);
    }
  };

  // ── Step indicator config ─────────────────────────────────────────────────

  const indicatorSteps =
    creationMode === "from_plan" ? STEP_INDICATOR : STEP_INDICATOR_CUSTOM;

  const handleBack = () => {
    const backMap: Partial<Record<WizardStep, WizardStep>> = {
      mode_a_select_plan: "choose_mode",
      mode_b_period:
        creationMode === "from_plan" ? "mode_a_select_plan" : "choose_mode",
      mode_b_details: "mode_b_period",
      rever_datas: "mode_b_details",
    };
    const prev = backMap[step];
    if (prev) setStep(prev);
  };

  const showIndicator = step !== "choose_mode" && step !== "loading";

  return (
    <WizardShell>
      {/* ── Header ──────────────────────────────────────────────── */}
      {step !== "loading" && (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nova turma</h1>
          <p className="text-muted-foreground">
            Define o período, disciplina e horário semanal.
          </p>
        </div>
      )}

      {step === "loading" && (
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <span className="text-xl font-semibold">Nova Turma</span>
        </div>
      )}

      {/* ── Step indicator ──────────────────────────────────────── */}
      {showIndicator && (
        <Stepper steps={indicatorSteps} currentStepId={step} />
      )}

      {/* ── Step content ────────────────────────────────────────── */}
      {step === "choose_mode" && (
        <StepChooseMode onSelect={handleModeSelect} />
      )}

      {step === "mode_a_select_plan" && (
        <StepSelectPlan onSelect={handlePlanSelect} />
      )}

      {(step === "mode_b_period" || step === "mode_b_details" || step === "rever_datas") && (
        <Card>
          <CardContent className="p-6">
            {step === "mode_b_period" && (
              <StepPeriod
                periodStart={periodStart}
                periodEnd={periodEnd}
                schoolYearLabel={schoolYearLabel}
                onChange={(s, e, l) => {
                  setPeriodStart(s);
                  setPeriodEnd(e);
                  setSchoolYearLabel(l);
                }}
              />
            )}
            {step === "mode_b_details" && (
              <StepDetails
                subject={subject}
                gradeLevel={gradeLevel}
                classLabel={classLabel}
                title={title}
                color={color}
                schedule={schedule}
                periodStart={periodStart}
                periodEnd={periodEnd}
                onFieldChange={(field, value) => {
                  if (field === "subject") setSubject(value);
                  else if (field === "gradeLevel") setGradeLevel(value);
                  else if (field === "classLabel") setClassLabel(value);
                  else if (field === "title") { setTitle(value); setTitleTouched(true); }
                }}
                onScheduleChange={setSchedule}
                onColorChange={setColor}
              />
            )}
            {step === "rever_datas" && (
              <StepReverDatas
                slots={previewSlots}
                onSlotsChange={setPreviewSlots}
              />
            )}
          </CardContent>
        </Card>
      )}

      {step === "loading" && (
        <GenerationProgress
          title="A criar a tua turma…"
          subtitle="A Scooli está a gerar os tópicos e a distribuição pedagógica."
          steps={LOADING_STEPS}
          currentStep={loadingStep}
        />
      )}

      {/* ── Navigation ──────────────────────────────────────────── */}
      {step !== "loading" && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={step === "choose_mode" ? () => router.back() : handleBack}
            disabled={isSubmitting}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            {step === "choose_mode" ? "Cancelar" : "Anterior"}
          </Button>

          {step === "mode_b_period" && (
            <Button
              onClick={() => setStep("mode_b_details")}
              disabled={!periodCanProceed}
              className="gap-2"
            >
              Seguinte
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}

          {step === "mode_b_details" && (
            <Button
              onClick={handleGoToReverDatas}
              disabled={!detailsCanProceed}
              className="gap-2"
            >
              Seguinte
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}

          {step === "rever_datas" && (
            <Button
              onClick={handleCreate}
              disabled={isSubmitting || actionableSlots === 0}
              className="gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Criar turma ({actionableSlots} aula{actionableSlots !== 1 ? "s" : ""})
            </Button>
          )}
        </div>
      )}
    </WizardShell>
  );
}

export default function CalendarNewPage() {
  return (
    <Suspense fallback={null}>
      <CalendarNewPageContent />
    </Suspense>
  );
}
