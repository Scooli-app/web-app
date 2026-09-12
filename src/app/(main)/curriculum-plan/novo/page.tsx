"use client";
import { AiDisclaimer } from "@/components/ui/ai-disclaimer";

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
  translateGradeGroupLabel,
  translateGradeLabel,
  translateSubjectCategory,
  translateSubjectLabel,
} from "@/components/document-creation/constants";
import {
  createDocument,
  setPendingInitialPrompt,
} from "@/store/documents/documentSlice";
import { selectIsCurriculumPlanEnabled } from "@/store/features/selectors";
import { useFeatureAccess } from "@/components/feature/useFeatureAccess";
import { FeatureUnavailable } from "@/components/feature/FeatureUnavailable";
import { useAppDispatch } from "@/store/hooks";
import {
  buildSchoolPeriodPresets,
  formatPresetRange,
  type SchoolPeriodPreset,
} from "@/lib/periodPresets";
import {
  DEFAULT_WEEK_SCHEDULE,
  expandSlotsLocally,
  weekScheduleLessonsPerWeek,
  weekScheduleToRecurringSlots,
  weeksBetweenIso,
  type WeekSchedule,
} from "@/lib/timetable/planToTimetable";
import { type CurriculumPlanningType } from "@/shared/types";
import { cn } from "@/shared/utils/utils";
import { toIntlLocale } from "@/shared/utils/calendar";
import { isSupportedLocale, defaultLocale, type Locale } from "@/i18n/locales";
import { ChevronLeft, ChevronRight, CalendarDays, BookOpen, Settings2, CheckCircle2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_IDS = ["period", "class", "schedule", "review"] as const;

type StepId = (typeof STEP_IDS)[number] | "loading";

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string, locale: Locale): string {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString(toIntlLocale(locale), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Portuguese label for the generation prompt sent to the AI — kept fixed
 * regardless of interface locale, like the rest of `buildPrompt`'s domain
 * vocabulary (see the "Aprendizagens Essenciais" convention).
 */
function planningTypeLabelPT(t: CurriculumPlanningType): string {
  const map: Record<CurriculumPlanningType, string> = {
    annual: "Anual",
    semester: "Semestral",
    trimester: "Trimestral",
    custom: "Personalizado",
  };
  return map[t];
}

const PLANNING_TYPE_LABEL_EN: Record<CurriculumPlanningType, string> = {
  annual: "Annual",
  semester: "Semester",
  trimester: "Term",
  custom: "Custom",
};

/**
 * The prompt sent to the AI is written in the interface language: the teacher
 * is the one who would read it back (in errors, history, a future "edit the
 * request" feature), so it should read like something they wrote, not a fixed
 * Portuguese template. The subject name and "Aprendizagens Essenciais" are the
 * exception — curriculum vocabulary, translated by the model itself the same
 * way the retrieved AE context is (see EnglishPromptLanguage).
 */
function buildPrompt(p: {
  planningType: CurriculumPlanningType;
  subjectLabel: string;
  schoolYear: number;
  periodStart: string;
  periodEnd: string;
  lessonsPerWeek: number;
  totalLessons: number;
  locale: Locale;
}) {
  if (p.locale === "en") {
    return (
      `${PLANNING_TYPE_LABEL_EN[p.planningType]} curriculum plan for ${p.subjectLabel}, Year ${p.schoolYear}, ` +
      `from ${p.periodStart} to ${p.periodEnd}, with about ${p.lessonsPerWeek} lessons per week ` +
      `(${p.totalLessons} lessons total, estimated). ` +
      "Generate the 7 canonical sections (Identification, Pupil Profile, Aprendizagens Essenciais, " +
      "Schedule, Development by Unit, Assessment, Curricular Alignment)."
    );
  }
  return (
    `Planificação ${planningTypeLabelPT(p.planningType).toLowerCase()} de ${p.subjectLabel} para o ` +
    `${p.schoolYear}.º ano, de ${p.periodStart} a ${p.periodEnd}, com cerca de ` +
    `${p.lessonsPerWeek} aulas por semana (${p.totalLessons} aulas totais estimadas). ` +
    "Gera as 7 secções canónicas (Identificação, Perfil do Aluno, AEs, Calendarização, " +
    "Desenvolvimento por Unidades, Avaliação, Articulação Curricular)."
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CurriculumPlanNewPage() {
  const t = useTranslations("curriculumPlan.novo");
  const tShared = useTranslations("curriculumPlan.shared");
  const tTimetable = useTranslations("timetable");
  const tErrors = useTranslations("errors.curriculumPlan");
  const rawLocale = useLocale();
  const locale = isSupportedLocale(rawLocale) ? rawLocale : defaultLocale;
  const LOADING_STEPS = t.raw("loadingSteps") as string[];
  const STEPS = [
    { id: "period" as const, label: t("steps.period"), icon: CalendarDays },
    { id: "class" as const, label: t("steps.class"), icon: BookOpen },
    { id: "schedule" as const, label: t("steps.schedule"), icon: Settings2 },
    { id: "review" as const, label: t("steps.review"), icon: CheckCircle2 },
  ];
  const { loaded: featuresLoaded, enabled } = useFeatureAccess(selectIsCurriculumPlanEnabled);
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

  const lpw = useMemo(() => weekScheduleLessonsPerWeek(schedule), [schedule]);
  const periodStartISO = useMemo(() => (periodStart ? toISO(periodStart) : ""), [periodStart]);
  const periodEndISO = useMemo(() => (periodEnd ? toISO(periodEnd) : ""), [periodEnd]);
  const weeks = useMemo(() => weeksBetweenIso(periodStartISO, periodEndISO), [periodStartISO, periodEndISO]);
  // Real expanded slot count (respects the actual calendar), not weeks × lpw.
  const totalLessons = useMemo(
    () =>
      periodStartISO && periodEndISO && lpw > 0
        ? expandSlotsLocally(periodStartISO, periodEndISO, weekScheduleToRecurringSlots(schedule)).length
        : 0,
    [periodStartISO, periodEndISO, lpw, schedule],
  );

  const selectedSubject = useMemo(
    () => SUBJECTS.find((s) => s.id === subjectId),
    [subjectId]
  );
  // The review step shows the translated name; the AI prompt uses whichever
  // name matches the language the prompt itself is written in (see buildPrompt).
  const subjectLabel = selectedSubject
    ? locale === "en"
      ? translateSubjectLabel(selectedSubject.id)
      : selectedSubject.label
    : "";
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
    const order: StepId[] = [...STEP_IDS];
    const idx = order.indexOf(step);
    if (idx < order.length - 1) setStep(order[idx + 1]);
  }

  function goBack() {
    const order: StepId[] = [...STEP_IDS];
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
      locale,
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
        err instanceof Error ? err.message : tErrors("createFailed");
      toast.error(message);
      setSubmitting(false);
      setStep("review");
    }
  }

  if (!featuresLoaded) return null;
  if (!enabled)
    return (
      <FeatureUnavailable
        title={tShared("featureTitle")}
        description={tShared("featureDescription")}
      />
    );

  if (step === "loading") {
    return (
      <WizardShell>
        <GenerationProgress
          title={t("generating.title")}
          subtitle={t("generating.subtitle")}
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
        <h1 className="text-2xl font-semibold tracking-tight">{t("header.title")}</h1>
        <p className="text-muted-foreground">
          {t("header.subtitle")}
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
                <h2 className="text-lg font-semibold">{t("period.title")}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("period.subtitle")}
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
                        {formatPresetRange(preset.start, preset.end, locale)}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("period.startLabel")}</Label>
                  <DatePicker
                    value={periodStart}
                    onChange={setPeriodStart}
                    placeholder={t("period.startPlaceholder")}
                    toDate={periodEnd}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("period.endLabel")}</Label>
                  <DatePicker
                    value={periodEnd}
                    onChange={setPeriodEnd}
                    placeholder={t("period.endPlaceholder")}
                    fromDate={periodStart}
                  />
                </div>
              </div>

              {step1Valid && (
                <div className="rounded-lg bg-muted px-4 py-3 text-sm">
                  {t.rich("period.summary", {
                    weeks,
                    start: formatDate(periodStartISO, locale),
                    end: formatDate(periodEndISO, locale),
                    strong: (chunks) => <span className="font-medium">{chunks}</span>,
                  })}
                  {" · "}
                  <span className="text-muted-foreground capitalize">{tShared(`planningType.${planningType}`)}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="planningType">{t("period.planningTypeLabel")}</Label>
                <Select
                  value={planningType}
                  onValueChange={(v) => setPlanningType(v as CurriculumPlanningType)}
                >
                  <SelectTrigger id="planningType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">{tShared("planningType.annual")}</SelectItem>
                    <SelectItem value="semester">{tShared("planningType.semester")}</SelectItem>
                    <SelectItem value="trimester">{tShared("planningType.trimester")}</SelectItem>
                    <SelectItem value="custom">{tShared("planningType.custom")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* ── Step 2: Class details ── */}
          {step === "class" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">{t("class.title")}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("class.subtitle")}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="schoolYear">{t("class.gradeLabel")}</Label>
                <Select value={gradeLevel} onValueChange={handleGradeLevelChange}>
                  <SelectTrigger id="schoolYear" className="h-12 text-base">
                    <SelectValue placeholder={t("class.gradePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_GROUPS.map((group) => (
                      <SelectGroup key={group.label}>
                        <SelectLabel className="text-xs font-bold text-primary border-b border-border/50 mb-1">
                          {translateGradeGroupLabel(group.groupId)}
                        </SelectLabel>
                        {group.grades.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {translateGradeLabel(g.id)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">{t("class.subjectLabel")}</Label>
                <Select value={subjectId} onValueChange={setSubjectId} disabled={!gradeLevel}>
                  <SelectTrigger id="subject" className="h-12 text-base">
                    <SelectValue
                      placeholder={
                        gradeLevel
                          ? t("class.subjectPlaceholder")
                          : t("class.subjectPlaceholderNoGrade")
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-[380px]">
                    {groupedSubjects.map(({ category, subjects }) => (
                      <SelectGroup key={category}>
                        <SelectLabel className="text-xs font-bold text-primary border-b border-border/50 mb-1">
                          {translateSubjectCategory(category)}
                        </SelectLabel>
                        {subjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {translateSubjectLabel(s.id)}
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
                <h2 className="text-lg font-semibold">{t("schedule.title")}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("schedule.subtitle")}
                </p>
              </div>

              <WeekSchedulePicker schedule={schedule} onChange={setSchedule} />

              {totalLessons > 0 && (
                <div className="rounded-lg bg-muted px-4 py-3 text-sm">
                  {t("schedule.lessonsSummary", { count: totalLessons, weeks, lpw })}
                </div>
              )}
            </div>
          )}

          {/* ── Step 4: Review ── */}
          {step === "review" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">{t("review.title")}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("review.subtitle")}
                </p>
              </div>

              <div className="divide-y rounded-lg border">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">{t("review.period")}</span>
                  <span className="text-sm font-medium">
                    {formatDate(periodStartISO, locale)} – {formatDate(periodEndISO, locale)}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">{t("review.type")}</span>
                  <span className="text-sm font-medium">{tShared(`planningType.${planningType}`)}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">{t("review.subject")}</span>
                  <span className="text-sm font-medium">
                    {selectedSubject ? translateSubjectLabel(selectedSubject.id) : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">{t("review.grade")}</span>
                  <span className="text-sm font-medium">{tTimetable("gradeYear", { grade: schoolYear })}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">{t("review.lessonsPerWeek")}</span>
                  <span className="text-sm font-medium">{lpw}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">{t("review.totalEstimate")}</span>
                  <span className="text-sm font-semibold text-primary">{t("review.totalLessons", { count: totalLessons })}</span>
                </div>
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
                {t.rich("review.aiNotice", { strong: (chunks) => <strong>{chunks}</strong> })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={goBack} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          {step === "period" ? t("nav.cancel") : t("nav.previous")}
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
            {t("nav.next")}
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <div className="flex flex-col items-end gap-1">
          <Button
            onClick={handleSubmit}
            disabled={!step1Valid || !step2Valid || !step3Valid || submitting}
            className="gap-2"
          >
            {submitting ? t("nav.generating") : t("nav.generate")}
            {!submitting && <ChevronRight className="h-4 w-4" />}
          </Button>
            <AiDisclaimer className="text-right" />
          </div>
        )}
      </div>
    </WizardShell>
  );
}
