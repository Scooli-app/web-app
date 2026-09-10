"use client";
import { AiDisclaimer } from "@/components/ui/ai-disclaimer";

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
import { useFeatureAccess } from "@/components/feature/useFeatureAccess";
import { FeatureUnavailable } from "@/components/feature/FeatureUnavailable";
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
import { useLocale, useTranslations } from "next-intl";
import { isSupportedLocale, defaultLocale, type Locale } from "@/i18n/locales";
import { toIntlLocale } from "@/shared/utils/calendar";

// ─────────────────────── Types ────────────────────────────────────────────────

type WizardStep =
  | "choose_mode"
  | "mode_a_select_plan"
  | "mode_b_period"
  | "mode_b_details"
  | "rever_datas"
  | "loading";

// ─────────────────────── Step metadata ────────────────────────────────────────

const STEP_INDICATOR_ICONS = [
  { id: "mode_a_select_plan", icon: BookOpen },
  { id: "mode_b_period",      icon: CalendarDays },
  { id: "mode_b_details",     icon: Settings2 },
  { id: "rever_datas",        icon: ListChecks },
] as const;

const STEP_INDICATOR_CUSTOM_ICONS = [
  { id: "mode_b_period",  icon: CalendarDays },
  { id: "mode_b_details", icon: Settings2 },
  { id: "rever_datas",    icon: ListChecks },
] as const;

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

function formatMonthLabel(ym: string, locale: Locale): string {
  const [year, month] = ym.split("-");
  return new Date(Number(year), Number(month) - 1, 1)
    .toLocaleDateString(toIntlLocale(locale), { month: "long", year: "numeric" });
}

function formatDayLabel(iso: string, locale: Locale): string {
  return new Date(`${iso}T00:00:00`)
    .toLocaleDateString(toIntlLocale(locale), { weekday: "short", day: "numeric", month: "short" });
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
  const t = useTranslations("calendar.novo");
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{t("chooseMode.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("chooseMode.subtitle")}
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
              <CardTitle className="text-base">{t("chooseMode.fromPlanTitle")}</CardTitle>
            </div>
            <Badge className="w-fit text-xs" variant="secondary">{t("chooseMode.recommended")}</Badge>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t("chooseMode.fromPlanDescription")}
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
              <CardTitle className="text-base">{t("chooseMode.customTitle")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t("chooseMode.customDescription")}
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
  const t = useTranslations("calendar.novo");
  const tTimetable = useTranslations("timetable");
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
        <h2 className="text-lg font-semibold">{t("selectPlan.title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("selectPlan.subtitle")}
        </p>
      </div>
      <Input
        placeholder={t("selectPlan.searchPlaceholder")}
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
            ? t("selectPlan.noneYet")
            : t("selectPlan.noneFound")}
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
                      {[plan.subject ? translateSubject(plan.subject) : null, plan.gradeLevel ? tTimetable("gradeYear", { grade: plan.gradeLevel }) : null]
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
  const t = useTranslations("calendar.novo");
  const rawLocale = useLocale();
  const locale = isSupportedLocale(rawLocale) ? rawLocale : defaultLocale;
  const periodPresets = buildSchoolPeriodPresets();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">{t("period.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("period.subtitle")}</p>
      </div>

      {/* Presets */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("period.presetsLabel")}
        </Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {periodPresets.map((p) => {
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
                  {formatPresetRange(p.start, p.end, locale)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Date pickers */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>{t("period.startLabel")}</Label>
          <DatePicker
            value={isoToDate(periodStart)}
            onChange={(d) => onChange(dateToIso(d), periodEnd, schoolYearLabel)}
            placeholder={t("period.startPlaceholder")}
            toDate={isoToDate(periodEnd)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("period.endLabel")}</Label>
          <DatePicker
            value={isoToDate(periodEnd)}
            onChange={(d) => onChange(periodStart, dateToIso(d), schoolYearLabel)}
            placeholder={t("period.endPlaceholder")}
            fromDate={isoToDate(periodStart)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>{t("period.schoolYearLabel")}</Label>
        <Input
          placeholder={t("period.schoolYearPlaceholder")}
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
  const t = useTranslations("calendar.novo");

  const groupedSubjects = groupSubjectsByCategory(getSubjectsForGrade(gradeLevel));
  const lpw = weekScheduleLessonsPerWeek(schedule);
  const weeks = weeksBetweenIso(periodStart, periodEnd);
  // Real expanded slot count (respects the actual calendar), not weeks × lpw.
  const totalLessons =
    periodStart && periodEnd && lpw > 0
      ? expandSlotsLocally(periodStart, periodEnd, weekScheduleToRecurringSlots(schedule)).length
      : 0;

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
        <h2 className="text-lg font-semibold">{t("details.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("details.subtitle")}</p>
      </div>

      {/* Grade + class */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>{t("details.gradeLabel")}</Label>
          <Select value={gradeLevel} onValueChange={handleGradeChange}>
            <SelectTrigger>
              <SelectValue placeholder={t("details.gradePlaceholder")} />
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
          <Label>{t("details.classLabel")}</Label>
          <Input
            placeholder={t("details.classPlaceholder")}
            value={classLabel}
            onChange={(e) => onFieldChange("classLabel", e.target.value)}
          />
        </div>
      </div>

      {/* Subject — filtered by grade, grouped by category */}
      <div className="space-y-1.5">
        <Label>{t("details.subjectLabel")}</Label>
        <Select
          value={subject}
          onValueChange={(v) => onFieldChange("subject", v)}
          disabled={!gradeLevel}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={
                gradeLevel
                  ? t("details.subjectPlaceholder")
                  : t("details.subjectPlaceholderNoGrade")
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
          <Label>{t("details.nameLabel")}</Label>
          <Input
            placeholder={t("details.namePlaceholder")}
            value={title}
            onChange={(e) => onFieldChange("title", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("details.colorLabel")}</Label>
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

      {totalLessons > 0 && (
        <div className="rounded-lg bg-muted px-4 py-3 text-sm">
          {t("details.lessonsSummary", { count: totalLessons, weeks, lpw })}
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
  const t = useTranslations("calendar.novo");
  const tTimetable = useTranslations("timetable");
  const rawLocale = useLocale();
  const locale = isSupportedLocale(rawLocale) ? rawLocale : defaultLocale;
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
        <h2 className="text-lg font-semibold">{t("reviewDates.title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("reviewDates.subtitle")}
        </p>
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
        <span>{t("reviewDates.total")} <strong>{slots.length}</strong></span>
        <span className="text-muted-foreground">·</span>
        <span>{t("reviewDates.lessons")} <strong>{lessons}</strong></span>
        <span className="text-muted-foreground">·</span>
        <span>{t("reviewDates.assessments")} <strong>{assessments}</strong></span>
        <span className="text-muted-foreground">·</span>
        <span>{t("reviewDates.exercises")} <strong>{exercises}</strong></span>
        <span className="text-muted-foreground">·</span>
        <span>{t("reviewDates.reviews")} <strong>{reviews}</strong></span>
        <span className="text-muted-foreground">·</span>
        <span>{t("reviewDates.holidays")} <strong>{holidays}</strong></span>
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
          {hasSelection ? t("reviewDates.deselect", { count: selected.size }) : t("reviewDates.selectAll")}
        </Button>
        {hasSelection && (
          <>
            <span className="text-xs text-muted-foreground">{t("reviewDates.markAs")}</span>
            <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => applyBulkType("LESSON")}>{tTimetable("slotType.lesson")}</Button>
            <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => applyBulkType("ASSESSMENT")}>{tTimetable("slotType.assessment")}</Button>
            <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => applyBulkType("EXERCISE")}>{tTimetable("slotType.exercise")}</Button>
            <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => applyBulkType("REVIEW")}>{tTimetable("slotType.review")}</Button>
            <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => applyBulkType("HOLIDAY")}>{tTimetable("slotType.holiday")}</Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="h-7 text-xs"
              onClick={removeBulk}
            >
              <Trash2 className="mr-1 h-3 w-3" />
              {t("reviewDates.remove")}
            </Button>
          </>
        )}
      </div>

      {slots.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          {t("reviewDates.emptyLine1")}
          <br />
          {t("reviewDates.emptyLine2")}
        </div>
      ) : (
        <div className="max-h-[440px] space-y-4 overflow-y-auto pr-1">
          {grouped.map(({ month, slots: monthSlots }) => (
            <div key={month}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {formatMonthLabel(month, locale)}
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
                      {formatDayLabel(slot.date, locale)}
                    </span>
                    <Select
                      value={slot.slotType}
                      onValueChange={(v) => changeType(slot.id, v as SlotType)}
                    >
                      <SelectTrigger className="h-6 w-[90px] text-xs px-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LESSON">{tTimetable("slotType.lesson")}</SelectItem>
                        <SelectItem value="ASSESSMENT">{tTimetable("slotType.assessment")}</SelectItem>
                        <SelectItem value="EXERCISE">{tTimetable("slotType.exercise")}</SelectItem>
                        <SelectItem value="REVIEW">{tTimetable("slotType.review")}</SelectItem>
                        <SelectItem value="HOLIDAY">{tTimetable("slotType.holiday")}</SelectItem>
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
  const t = useTranslations("calendar.novo");
  const tShared = useTranslations("calendar.shared");
  const tTimetable = useTranslations("timetable");
  const tErrors = useTranslations("errors.calendar");
  const LOADING_STEPS = t.raw("loadingSteps") as string[];
  const { loaded: featuresLoaded, enabled } = useFeatureAccess(selectIsHorarioPlanosEnabled);
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
    return [gradeLevel ? tTimetable("gradeShort", { grade: gradeLevel }) : "", classLabel, subjectLabel]
      .filter(Boolean)
      .join(" ");
  }, [subject, gradeLevel, classLabel, tTimetable]);

  // Keeps following ano/turma/disciplina changes until the user edits the field directly —
  // comparing against the previous autoTitle would freeze the moment any one of those fields
  // changed and the title had already caught up with the earlier autoTitle.
  useEffect(() => {
    if (!titleTouched) setTitle(autoTitle);
  }, [autoTitle, titleTouched]);


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
      .catch(() => toast.error(tErrors("loadPlan")));
  }, [searchParams, tErrors]);

  if (!featuresLoaded) return null;
  if (!enabled)
    return (
      <FeatureUnavailable
        title={tShared("featureTitle")}
        description={tShared("featureDescription")}
      />
    );

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
        title: title || autoTitle || tTimetable("autoTitleFallback"),
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
          : tErrors("createFailed")
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

  const stepIndicatorLabels: Record<string, string> = {
    mode_a_select_plan: t("stepIndicator.plan"),
    mode_b_period: t("stepIndicator.period"),
    mode_b_details: t("stepIndicator.details"),
    rever_datas: t("stepIndicator.review"),
  };
  const STEP_INDICATOR = STEP_INDICATOR_ICONS.map((s) => ({
    ...s,
    label: stepIndicatorLabels[s.id],
  }));
  const STEP_INDICATOR_CUSTOM = STEP_INDICATOR_CUSTOM_ICONS.map((s) => ({
    ...s,
    label: stepIndicatorLabels[s.id],
  }));

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
          <h1 className="text-2xl font-semibold tracking-tight">{t("header.title")}</h1>
          <p className="text-muted-foreground">
            {t("header.subtitle")}
          </p>
        </div>
      )}

      {step === "loading" && (
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <span className="text-xl font-semibold">{t("header.loadingTitle")}</span>
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
          title={t("generating.title")}
          subtitle={t("generating.subtitle")}
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
            {step === "choose_mode" ? t("nav.cancel") : t("nav.previous")}
          </Button>

          {step === "mode_b_period" && (
            <Button
              onClick={() => setStep("mode_b_details")}
              disabled={!periodCanProceed}
              className="gap-2"
            >
              {t("nav.next")}
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}

          {step === "mode_b_details" && (
            <Button
              onClick={handleGoToReverDatas}
              disabled={!detailsCanProceed}
              className="gap-2"
            >
              {t("nav.next")}
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}

          {step === "rever_datas" && (
            <div className="flex flex-col items-end gap-1">
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
              {t("nav.createClass", { count: actionableSlots })}
            </Button>
              <AiDisclaimer className="text-right" />
            </div>
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
