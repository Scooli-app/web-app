"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  translateSubject,
} from "@/components/document-creation/constants";
import { selectIsHorarioPlanosEnabled } from "@/store/features/selectors";
import { createTimetable, generateTopics } from "@/store/timetable/timetableSlice";
import { useAppDispatch } from "@/store/hooks";
import type { RootState } from "@/store/store";
import { Routes as AppRoutes, type Document } from "@/shared/types";
import { getDocuments } from "@/services/api/document.service";
import type { RecurringSlot } from "@/services/api/timetable.service";
import { cn } from "@/shared/utils/utils";
import { getPortugueseHolidays } from "@/shared/constants/portugueseHolidays";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ListChecks,
  Loader2,
  Minus,
  Plus,
  Settings2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";

// ─────────────────────── Types ────────────────────────────────────────────────

type WizardStep =
  | "choose_mode"
  | "mode_a_select_plan"
  | "mode_b_period"
  | "mode_b_details"
  | "rever_datas"
  | "loading";

type SlotType = "LESSON" | "ASSESSMENT" | "HOLIDAY";

interface PreviewSlot {
  id: string;
  date: string; // ISO
  slotType: SlotType;
  sequenceNumber: number;
  durationMinutes: number;
}

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

type StepIndicatorId = (typeof STEP_INDICATOR)[number]["id"] | (typeof STEP_INDICATOR_CUSTOM)[number]["id"];

// ─────────────────────── Constants ────────────────────────────────────────────

const DAY_LABELS: Record<number, string> = {
  1: "Segunda", 2: "Terça", 3: "Quarta", 4: "Quinta",
  5: "Sexta",   6: "Sábado", 7: "Domingo",
};

const LOADING_STEPS = [
  "A mapear competências curriculares",
  "A organizar conteúdos e sequência pedagógica",
  "A definir avaliações e critérios",
  "Revisão pedagógica final",
];

function currentSchoolYearBase(): number {
  const now = new Date();
  return now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
}

function buildPeriodPresets(): { label: string; start: string; end: string }[] {
  const y = currentSchoolYearBase();
  return [
    { label: "1.º Período",  start: `${y}-09-16`,     end: `${y}-12-19` },
    { label: "2.º Período",  start: `${y + 1}-01-06`, end: `${y + 1}-03-27` },
    { label: "3.º Período",  start: `${y + 1}-04-14`, end: `${y + 1}-06-19` },
    { label: "1.º Semestre", start: `${y}-09-16`,     end: `${y + 1}-01-31` },
    { label: "2.º Semestre", start: `${y + 1}-02-01`, end: `${y + 1}-06-30` },
    { label: "Ano letivo",   start: `${y}-09-16`,     end: `${y + 1}-06-19` },
  ];
}

const PERIOD_PRESETS = buildPeriodPresets();

// ─────────────────────── Slot expansion util ──────────────────────────────────

function expandSlotsLocally(
  periodStart: string,
  periodEnd: string,
  recurringSlots: RecurringSlot[]
): PreviewSlot[] {
  if (!periodStart || !periodEnd || recurringSlots.length === 0) return [];

  const dayMap = new Map<number, RecurringSlot>();
  for (const rs of recurringSlots) {
    dayMap.set(rs.dayOfWeek, rs);
  }

  const startYear = parseInt(periodStart.slice(0, 4), 10);
  const endYear = parseInt(periodEnd.slice(0, 4), 10);
  const holidays = getPortugueseHolidays(startYear, endYear);

  const slots: PreviewSlot[] = [];
  let seq = 1;
  const current = new Date(`${periodStart}T00:00:00`);
  const end = new Date(`${periodEnd}T00:00:00`);

  while (current <= end) {
    const isoDow = current.getDay() === 0 ? 7 : current.getDay();
    const rs = dayMap.get(isoDow);
    if (rs) {
      const count = rs.slotsPerDay ?? 1;
      // Use local date components — toISOString() converts to UTC, shifting dates for UTC+ timezones
      const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
      const isHoliday = holidays.has(dateStr);
      for (let s = 0; s < count; s++) {
        slots.push({
          id: `preview-${dateStr}-${s}`,
          date: dateStr,
          slotType: isHoliday ? "HOLIDAY" : "LESSON",
          sequenceNumber: seq++,
          durationMinutes: rs.durationMinutes ?? 50,
        });
      }
    }
    current.setDate(current.getDate() + 1);
  }
  return slots;
}

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

function formatPresetRange(start: string, end: string): string {
  const fmt = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString("pt-PT", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  return `${fmt(start)} – ${fmt(end)}`;
}

// ─────────────────────── Step indicator ───────────────────────────────────────

function StepIndicator({
  steps,
  currentStep,
}: {
  steps: readonly { id: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
  currentStep: string;
}) {
  const currentIdx = steps.findIndex((s) => s.id === currentStep);
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, idx) => {
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
                !active && !done && "border-muted-foreground/30 text-muted-foreground/50"
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <span
              className={cn(
                "ml-2 hidden text-sm font-medium sm:inline transition-colors",
                active && "text-foreground",
                done && "text-primary",
                !active && !done && "text-muted-foreground/50"
              )}
            >
              {step.label}
            </span>
            {idx < steps.length - 1 && (
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

// ─────────────────────── Step: Choose mode ────────────────────────────────────

function StepChooseMode({ onSelect }: { onSelect: (mode: "from_plan" | "custom") => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Como queres criar o plano letivo?</h2>
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
        <p className="text-sm text-muted-foreground">Define as datas de início e fim do plano letivo.</p>
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
  recurringSlots: RecurringSlot[];
  onFieldChange: (field: string, value: string) => void;
  onSlotsChange: (slots: RecurringSlot[]) => void;
}

/** Subject IDs available for the chosen grade, or all subjects if no grade yet. */
function useAvailableSubjects(gradeLevel: string) {
  const ids = gradeLevel ? (SUBJECTS_BY_GRADE[gradeLevel] ?? []) : SUBJECTS.map((s) => s.id);
  return SUBJECTS.filter((s) => ids.includes(s.id));
}

const SUBJECT_CATEGORY_ORDER = [
  "Disciplinas Gerais",
  "Ciências",
  "Ciências Sociais e Humanas",
  "Línguas",
  "Artes",
  "Literatura",
  "Educação Física",
  "Tecnologia",
  "Cidadania",
  "Religião",
];

function StepDetails({
  subject, gradeLevel, classLabel, title,
  recurringSlots, onFieldChange, onSlotsChange,
}: StepDetailsProps) {

  const availableSubjects = useAvailableSubjects(gradeLevel);
  const groupedSubjects = availableSubjects.reduce<Record<string, typeof SUBJECTS>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  const handleGradeChange = (grade: string) => {
    onFieldChange("gradeLevel", grade);
    // Reset subject if it's not available for the new grade
    const ids = SUBJECTS_BY_GRADE[grade] ?? [];
    const currentSubjectId = subject; // subject is now stored as id
    if (currentSubjectId && !ids.includes(currentSubjectId)) {
      onFieldChange("subject", "");
    }
  };

  const toggleDay = (day: number) => {
    const exists = recurringSlots.find((s) => s.dayOfWeek === day);
    if (exists) {
      onSlotsChange(recurringSlots.filter((s) => s.dayOfWeek !== day));
    } else {
      onSlotsChange(
        [...recurringSlots, { dayOfWeek: day, slotsPerDay: 1, durationMinutes: 50 }]
          .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
      );
    }
  };

  const updateSlotsPerDay = (day: number, delta: number) =>
    onSlotsChange(
      recurringSlots.map((s) =>
        s.dayOfWeek === day
          ? { ...s, slotsPerDay: Math.max(1, Math.min(5, (s.slotsPerDay ?? 1) + delta)) }
          : s
      )
    );

  const updateDuration = (day: number, value: number) =>
    onSlotsChange(
      recurringSlots.map((s) =>
        s.dayOfWeek === day ? { ...s, durationMinutes: value } : s
      )
    );

  const totalWeeklySlots = recurringSlots.reduce((sum, s) => sum + (s.slotsPerDay ?? 1), 0);

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
            {SUBJECT_CATEGORY_ORDER.map((cat) => {
              const subs = groupedSubjects[cat];
              if (!subs?.length) return null;
              return (
                <SelectGroup key={cat}>
                  <SelectLabel className="text-xs font-bold text-primary border-b border-border/50 mb-1">
                    {cat}
                  </SelectLabel>
                  {subs.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <Label>Nome do plano letivo</Label>
        <Input
          placeholder="Auto-preenchido"
          value={title}
          onChange={(e) => onFieldChange("title", e.target.value)}
        />
      </div>

      {/* Day toggles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Dias de aula
          </Label>
          {totalWeeklySlots > 0 && (
            <Badge variant="secondary" className="text-xs">
              {totalWeeklySlots} aula{totalWeeklySlots !== 1 ? "s" : ""}/semana
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-7">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => {
            const slot = recurringSlots.find((s) => s.dayOfWeek === day);
            const active = !!slot;
            return (
              <div key={day} className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={cn(
                    "w-full rounded-lg border-2 py-2 text-xs font-medium transition",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  )}
                >
                  {DAY_LABELS[day]?.slice(0, 3)}
                </button>
                {active && (
                  <div className="flex items-center justify-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => updateSlotsPerDay(day, -1)}
                      className="rounded p-0.5 hover:bg-muted"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-4 text-center text-xs font-medium">
                      {slot?.slotsPerDay ?? 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateSlotsPerDay(day, 1)}
                      className="rounded p-0.5 hover:bg-muted"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Duration per day */}
        {recurringSlots.length > 0 && (
          <div className="space-y-2 pt-1">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Duração por aula
            </Label>
            {recurringSlots.map((slot) => (
              <div key={slot.dayOfWeek} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-sm text-muted-foreground">
                  {DAY_LABELS[slot.dayOfWeek]}
                </span>
                <Select
                  value={String(slot.durationMinutes ?? 50)}
                  onValueChange={(v) => updateDuration(slot.dayOfWeek, Number(v))}
                >
                  <SelectTrigger className="h-8 flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="45">45 min</SelectItem>
                    <SelectItem value="50">50 min</SelectItem>
                    <SelectItem value="55">55 min</SelectItem>
                    <SelectItem value="60">60 min</SelectItem>
                    <SelectItem value="75">75 min</SelectItem>
                    <SelectItem value="90">90 min</SelectItem>
                    <SelectItem value="100">100 min</SelectItem>
                    <SelectItem value="120">120 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}
      </div>
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

  const changeType = (id: string, type: SlotType) =>
    onSlotsChange(slots.map((s) => (s.id === id ? { ...s, slotType: type } : s)));

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
    onSlotsChange(slots.map((s) => selected.has(s.id) ? { ...s, slotType: type } : s));
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

// ─────────────────────── Loading screen ───────────────────────────────────────

function LoadingScreen({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex flex-col items-center justify-center space-y-8 py-16">
      <div className="space-y-2 text-center">
        <Sparkles className="mx-auto h-12 w-12 animate-pulse text-primary" />
        <h2 className="text-xl font-semibold">A criar o teu plano letivo…</h2>
        <p className="text-sm text-muted-foreground">
          A Scooli está a gerar os tópicos e a distribuição pedagógica.
        </p>
      </div>
      <div className="w-full max-w-sm space-y-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${((currentStep + 1) / LOADING_STEPS.length) * 100}%` }}
          />
        </div>
        <div className="space-y-3">
          {LOADING_STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              {i < currentStep ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
              ) : i === currentStep ? (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
              ) : (
                <div className="h-5 w-5 shrink-0 rounded-full border-2 border-muted" />
              )}
              <span
                className={cn(
                  "text-sm",
                  i < currentStep
                    ? "text-muted-foreground line-through"
                    : i === currentStep
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {s}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────── Main page ────────────────────────────────────────────

export default function CalendarNewPage() {
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
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [schoolYearLabel, setSchoolYearLabel] = useState(() => {
    const y = currentSchoolYearBase();
    return `${y}/${y + 1}`;
  });
  const [recurringSlots, setRecurringSlots] = useState<RecurringSlot[]>([
    { dayOfWeek: 1, slotsPerDay: 1, durationMinutes: 50 },
    { dayOfWeek: 3, slotsPerDay: 1, durationMinutes: 50 },
    { dayOfWeek: 5, slotsPerDay: 1, durationMinutes: 50 },
  ]);
  const [previewSlots, setPreviewSlots] = useState<PreviewSlot[]>([]);
  const [loadingStep, setLoadingStep] = useState(0);

  // Step validity (computed in parent so bottom nav can disable buttons)
  const periodCanProceed = !!periodStart && !!periodEnd && periodStart <= periodEnd;
  const detailsCanProceed = !!subject && !!gradeLevel && recurringSlots.length > 0;
  const actionableSlots = previewSlots.filter(
    (s) => s.slotType === "LESSON" || s.slotType === "ASSESSMENT"
  ).length;

  // Auto-generate title using the Portuguese display label (not the internal id/English value)
  const autoTitle = useMemo(() => {
    const subjectLabel = SUBJECTS.find((s) => s.id === subject)?.label ?? subject;
    if (!subjectLabel) return "";
    return [subjectLabel, gradeLevel ? `${gradeLevel}.º` : "", classLabel]
      .filter(Boolean)
      .join(" ");
  }, [subject, gradeLevel, classLabel]);

  useEffect(() => {
    if (!title || title === autoTitle) setTitle(autoTitle);
  }, [autoTitle, title]);

  useEffect(() => {
    if (!enabled) router.replace(AppRoutes.DASHBOARD);
  }, [enabled, router]);

  if (!enabled) return null;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleModeSelect = (mode: "from_plan" | "custom") => {
    setCreationMode(mode);
    setStep(mode === "from_plan" ? "mode_a_select_plan" : "mode_b_period");
  };

  const handlePlanSelect = (plan: Document) => {
    setSelectedPlan(plan);

    if (plan.subject) {
      const config = SUBJECTS.find((s) => s.value === plan.subject)
        ?? SUBJECTS.find((s) => s.id === plan.subject);
      setSubject(config?.id ?? "");
    }
    if (plan.gradeLevel) setGradeLevel(String(plan.gradeLevel));

    // The backend stores additionalDetails as a raw JSON string in metadata.additionalDetails
    const meta = plan.metadata as Record<string, unknown> | null;
    let planDetails: Record<string, unknown> = {};
    if (typeof meta?.additionalDetails === "string") {
      try { planDetails = JSON.parse(meta.additionalDetails) as Record<string, unknown>; } catch { /* ignore */ }
    }

    const metaPeriodStart = typeof planDetails.periodStart === "string" ? planDetails.periodStart : "";
    const metaPeriodEnd   = typeof planDetails.periodEnd   === "string" ? planDetails.periodEnd   : "";

    if (metaPeriodStart) setPeriodStart(metaPeriodStart);
    if (metaPeriodEnd)   setPeriodEnd(metaPeriodEnd);

    // Derive school year label from stored value or infer from period start
    if (typeof planDetails.schoolYearLabel === "string") {
      setSchoolYearLabel(planDetails.schoolYearLabel);
    } else if (metaPeriodStart) {
      const yr    = parseInt(metaPeriodStart.slice(0, 4), 10);
      const month = parseInt(metaPeriodStart.slice(5, 7), 10);
      const base  = month >= 9 ? yr : yr - 1;
      setSchoolYearLabel(`${base}/${base + 1}`);
    }

    // Convert planificação week schedule → recurring slots
    if (planDetails.weekSchedule && typeof planDetails.weekSchedule === "object") {
      type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
      const dayKeyToIso: Record<DayKey, number> = {
        mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 7,
      };
      const ws = planDetails.weekSchedule as Record<DayKey, { enabled: boolean; periods: number }>;
      const extracted: RecurringSlot[] = (Object.entries(ws) as [DayKey, { enabled: boolean; periods: number }][])
        .filter(([, v]) => v.enabled && v.periods > 0)
        .map(([key, v]) => ({
          dayOfWeek: dayKeyToIso[key],
          slotsPerDay: v.periods,
          durationMinutes: 50,
        }))
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
      if (extracted.length > 0) setRecurringSlots(extracted);
    }

    // Skip the period step when dates are already pre-filled from the planificação
    setStep(metaPeriodStart && metaPeriodEnd ? "mode_b_details" : "mode_b_period");
  };

  const handleGoToReverDatas = () => {
    const slots = expandSlotsLocally(periodStart, periodEnd, recurringSlots);
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

    // subject is stored as the SUBJECTS id — send the canonical English value to the backend
    const subjectValue = SUBJECTS.find((s) => s.id === subject)?.value ?? subject;

    const result = await dispatch(
      createTimetable({
        title: title || autoTitle || "Novo Plano Letivo",
        subject: subjectValue,
        gradeLevel: Number(gradeLevel),
        classLabel: classLabel || undefined,
        periodStart,
        periodEnd,
        schoolYearLabel: schoolYearLabel || undefined,
        creationMode,
        linkedCurriculumPlan: selectedPlan?.id,
        recurringSlots,
        holidays,
        assessmentDates,
      })
    );

    if (!createTimetable.fulfilled.match(result)) return;

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
    <div className="mx-auto w-full max-w-2xl space-y-8 px-4 py-8">
      {/* ── Header ──────────────────────────────────────────────── */}
      {step !== "loading" && (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Novo plano letivo</h1>
          <p className="text-muted-foreground">
            Define o período, disciplina e horário semanal.
          </p>
        </div>
      )}

      {step === "loading" && (
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <span className="text-xl font-semibold">Novo Plano Letivo</span>
        </div>
      )}

      {/* ── Step indicator ──────────────────────────────────────── */}
      {showIndicator && (
        <StepIndicator
          steps={indicatorSteps}
          currentStep={step as StepIndicatorId}
        />
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
                recurringSlots={recurringSlots}
                onFieldChange={(field, value) => {
                  if (field === "subject") setSubject(value);
                  else if (field === "gradeLevel") setGradeLevel(value);
                  else if (field === "classLabel") setClassLabel(value);
                  else if (field === "title") setTitle(value);
                }}
                onSlotsChange={setRecurringSlots}
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

      {step === "loading" && <LoadingScreen currentStep={loadingStep} />}

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
              Criar plano letivo ({actionableSlots} aula{actionableSlots !== 1 ? "s" : ""})
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
