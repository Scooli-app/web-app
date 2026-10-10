"use client";

import {
  SUBJECTS,
  SUBJECTS_BY_GRADE,
  translateSubjectLabel,
} from "@/components/document-creation/constants";
import { ClassIllustration } from "@/components/onboarding-v2/illustrations/StepIllustrations";
import { toLocalIso } from "@/components/onboarding-v2/freeWeek";
import { StepHeading } from "@/components/onboarding-v2/StepHeading";
import type { OnboardingFlowController } from "@/components/onboarding-v2/useOnboardingV2";
import { useStepFooter } from "@/components/onboarding-v2/useStepFooter";
import {
  CLASS_DAYS,
  WeekdayPicker,
  type LessonsByDay,
} from "@/components/onboarding-v2/steps/WeekdayPicker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { invalidatePlanLimits } from "@/hooks/usePlanLimits";
import {
  weekScheduleToRecurringSlots,
  type WeekSchedule,
} from "@/lib/timetable/planToTimetable";
import { UpgradeLimitError } from "@/services/api/client";
import { meService } from "@/services/api/me.service";
import {
  createTimetable,
} from "@/services/api/timetable.service";
import type { PlanLimits } from "@/shared/types/plan-limits";
import { useAppDispatch } from "@/store/hooks";
import { setUpgradeModalOpen } from "@/store/ui/uiSlice";
import { useLocale, useTranslations } from "next-intl";
import posthog from "posthog-js";
import { useEffect, useMemo, useState } from "react";

const ALL_YEARS = Array.from({ length: 12 }, (_, index) => index + 1);
const NO_LESSONS: LessonsByDay = { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 };

type Phase = "form" | "creating";

/** June 30 of the school year that contains `today` (the next one from July on). */
function schoolYearEnd(today: Date): string {
  const year = today.getMonth() <= 5 ? today.getFullYear() : today.getFullYear() + 1;
  return `${year}-06-30`;
}

function buildSchedule(lessons: LessonsByDay): Partial<WeekSchedule> {
  const schedule: Partial<WeekSchedule> = {};
  for (const day of CLASS_DAYS) {
    const count = lessons[day];
    if (count > 0) {
      schedule[day] = {
        enabled: true,
        periods: Array.from({ length: count }, () => ({
          durationMinutes: 50,
          type: "AUTO" as const,
        })),
      };
    }
  }
  return schedule;
}

const selectTriggerClassName = "h-10 rounded-xl px-3 text-base shadow-xs";
// The onboarding overlay sits at z-[9999]; the menu is portalled to <body> and must clear it.
const selectContentClassName = "z-[10000]";
const selectItemClassName = "min-h-11 text-base";

interface FirstClassStepProps {
  flow: OnboardingFlowController;
}

export function FirstClassStep({ flow }: FirstClassStepProps) {
  const t = useTranslations("onboardingV2");
  const locale = useLocale();
  const dispatch = useAppDispatch();
  const { answers, update, next, goTo, trackCompleted, generation } = flow;

  const [limits, setLimits] = useState<PlanLimits | null>(null);
  const [limitsSettled, setLimitsSettled] = useState(false);
  const [phase, setPhase] = useState<Phase>("form");
  const [error, setError] = useState(false);

  const [chosenYear, setChosenYear] = useState<number | null>(null);
  const [chosenSubject, setChosenSubject] = useState<string | null>(null);
  const [classLabel, setClassLabel] = useState("");
  const [lessons, setLessons] = useState<LessonsByDay>(NO_LESSONS);

  useEffect(() => {
    let cancelled = false;
    meService
      .getPlanLimits()
      .then((result) => {
        if (!cancelled) setLimits(result);
      })
      .catch(() => {
        // The server enforces the limits anyway; we just can't pre-cap the dates.
      })
      .finally(() => {
        if (!cancelled) setLimitsSettled(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const yearOptions = answers.years.length > 0 ? answers.years : ALL_YEARS;
  const year = chosenYear !== null && yearOptions.includes(chosenYear) ? chosenYear : yearOptions[0];

  const subjectOptions = useMemo(() => {
    const forYear = SUBJECTS_BY_GRADE[String(year)] ?? [];
    const preferred = answers.subjectIds.filter((id) => forYear.includes(id));
    return preferred.length > 0 ? preferred : forYear;
  }, [year, answers.subjectIds]);
  const subjectId =
    chosenSubject !== null && subjectOptions.includes(chosenSubject)
      ? chosenSubject
      : subjectOptions[0];

  const today = useMemo(() => new Date(), []);
  const periodStart = toLocalIso(today);
  const fullEnd = schoolYearEnd(today);
  const capEnd = limits && !limits.isPro ? limits.windowEnd : null;
  const capped = capEnd !== null && capEnd < fullEnd;
  const periodEnd = capped && capEnd ? capEnd : fullEnd;

  const lessonsPerWeek = CLASS_DAYS.reduce((sum, day) => sum + lessons[day], 0);
  const formValid = !!subjectId && !!year && lessonsPerWeek > 0 && limitsSettled;

  const formatDay = (iso: string) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(
      new Date(`${iso}T00:00:00`),
    );

  const handleCreate = async () => {
    if (!formValid || phase !== "form" || !subjectId) return;
    const subject = SUBJECTS.find((s) => s.id === subjectId);
    if (!subject) return;
    setError(false);
    setPhase("creating");
    try {
      const label = classLabel.trim();
      const created = await createTimetable({
        title: `${translateSubjectLabel(subjectId)} ${label}`.trim(),
        subject: subject.value,
        gradeLevel: year,
        classLabel: label || undefined,
        periodStart,
        periodEnd,
        recurringSlots: weekScheduleToRecurringSlots(buildSchedule(lessons)),
        creationMode: "custom",
        source: "onboarding",
      });
      // The dashboard's plan-limits cache still says 0 classes.
      invalidatePlanLimits();
      update({ timetableId: created.id, skippedClass: false });
      // Topics and the first week are generated in the background (step 4 shows it live).
      generation.start(created.id);
      trackCompleted(3, {
        grade_level: year,
        lessons_per_week: lessonsPerWeek,
        capped,
      });
      next();
    } catch (err) {
      // A free-plan limit already opened the upgrade modal; anything else gets an inline error.
      if (!(err instanceof UpgradeLimitError)) {
        posthog.captureException(err);
        setError(true);
      }
      setPhase("form");
    }
  };

  const handleLater = () => {
    posthog.capture("onboarding_v2_skipped_class");
    update({ skippedClass: true });
    goTo(5);
  };

  useStepFooter({
    stepId: 3,
    canContinue: formValid && phase === "form",
    busy: phase === "creating",
    hideBack: phase !== "form",
    continueLabel: t("class.create"),
    secondaryLabel: t("later"),
    onContinue: () => void handleCreate(),
    onSecondary: handleLater,
  });

  return (
    <div>
      <StepHeading
        title={t("class.title")}
        subtitle={t("class.subtitle")}
        illustration={<ClassIllustration />}
      />

      <div className="space-y-3 sm:space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="onboarding-class-year">{t("class.yearLabel")}</Label>
            <Select value={String(year)} onValueChange={(value) => setChosenYear(Number(value))}>
              <SelectTrigger id="onboarding-class-year" className={selectTriggerClassName}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={selectContentClassName}>
                {yearOptions.map((value) => (
                  <SelectItem key={value} value={String(value)} className={selectItemClassName}>
                    {t("class.yearOption", { year: value })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="order-last col-span-2 space-y-1.5 sm:order-none sm:col-span-1">
            <Label htmlFor="onboarding-class-subject">{t("class.subjectLabel")}</Label>
            <Select value={subjectId ?? ""} onValueChange={setChosenSubject}>
              <SelectTrigger id="onboarding-class-subject" className={selectTriggerClassName}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={selectContentClassName}>
                {subjectOptions.map((id) => (
                  <SelectItem key={id} value={id} className={selectItemClassName}>
                    {translateSubjectLabel(id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="onboarding-class-label">{t("class.labelLabel")}</Label>
            <Input
              id="onboarding-class-label"
              value={classLabel}
              onChange={(event) => setClassLabel(event.target.value)}
              placeholder={t("class.labelPlaceholder")}
              maxLength={40}
              autoComplete="off"
              className="h-10 rounded-xl px-3 text-base"
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">{t("class.daysLabel")}</p>
          <WeekdayPicker value={lessons} onChange={setLessons} />
        </div>

        <div className="space-y-0.5 text-xs text-muted-foreground sm:text-sm">
          <p>{t("class.period", { start: formatDay(periodStart), end: formatDay(periodEnd) })}</p>
          {capped && (
            <p>
              {t("class.capNote")}{" "}
              <button
                type="button"
                onClick={() => dispatch(setUpgradeModalOpen(true))}
                className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t("class.capLink")}
              </button>
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {t("class.createFailed")}
          </p>
        )}
      </div>
    </div>
  );
}
