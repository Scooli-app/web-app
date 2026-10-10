"use client";

import {
  SUBJECTS,
  SUBJECTS_BY_GRADE,
  translateSubjectLabel,
} from "@/components/document-creation/constants";
import { toLocalIso } from "@/components/onboarding-v2/freeWeek";
import { StepHeading } from "@/components/onboarding-v2/StepHeading";
import type { OnboardingFlowController } from "@/components/onboarding-v2/useOnboardingV2";
import { useStepFooter } from "@/components/onboarding-v2/useStepFooter";
import { ClassTopicsReveal } from "@/components/onboarding-v2/steps/ClassTopicsReveal";
import {
  CLASS_DAYS,
  WeekdayPicker,
  type LessonsByDay,
} from "@/components/onboarding-v2/steps/WeekdayPicker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { invalidatePlanLimits } from "@/hooks/usePlanLimits";
import { resolveEffectiveContentLanguage } from "@/i18n/clientLocale";
import {
  weekScheduleToRecurringSlots,
  type WeekSchedule,
} from "@/lib/timetable/planToTimetable";
import { UpgradeLimitError } from "@/services/api/client";
import { meService } from "@/services/api/me.service";
import {
  createTimetable,
  generateTopics,
  listLessons,
  type LessonSlot,
} from "@/services/api/timetable.service";
import type { PlanLimits } from "@/shared/types/plan-limits";
import { useAppDispatch } from "@/store/hooks";
import type { RootState } from "@/store/store";
import { setUpgradeModalOpen } from "@/store/ui/uiSlice";
import { useLocale, useTranslations } from "next-intl";
import posthog from "posthog-js";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";

const TOPICS_SHOWN = 8;
const ALL_YEARS = Array.from({ length: 12 }, (_, index) => index + 1);
const NO_LESSONS: LessonsByDay = { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 };

type Phase = "form" | "creating" | "ready" | "topicsFailed";

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

const selectClassName =
  "h-11 w-full rounded-xl border border-input bg-transparent px-3 text-base text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50";

interface FirstClassStepProps {
  flow: OnboardingFlowController;
}

export function FirstClassStep({ flow }: FirstClassStepProps) {
  const t = useTranslations("onboardingV2");
  const locale = useLocale();
  const dispatch = useAppDispatch();
  const ui = useSelector((state: RootState) => state.ui);
  const { answers, update, next, goTo, trackCompleted } = flow;

  const [limits, setLimits] = useState<PlanLimits | null>(null);
  const [limitsSettled, setLimitsSettled] = useState(false);
  const [phase, setPhase] = useState<Phase>("form");
  const [error, setError] = useState(false);
  const [topics, setTopics] = useState<LessonSlot[] | null>(null);

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

  const loadTopics = async (timetableId: string) => {
    try {
      const contentLanguage = resolveEffectiveContentLanguage(
        ui.contentLanguage,
        ui.interfaceLocale,
      );
      const result = await generateTopics(timetableId, contentLanguage);
      const slots = await listLessons(timetableId);
      const firstTopics = slots
        .filter((slot) => slot.slotType === "LESSON")
        .sort((a, b) => a.slotDate.localeCompare(b.slotDate))
        .slice(0, TOPICS_SHOWN);
      setTopics(firstTopics);
      setPhase(result.updated > 0 ? "ready" : "topicsFailed");
    } catch (err) {
      posthog.captureException(err);
      setTopics([]);
      setPhase("topicsFailed");
    }
  };

  const handleCreate = async () => {
    if (!formValid || phase !== "form" || !subjectId) return;
    const subject = SUBJECTS.find((s) => s.id === subjectId);
    if (!subject) return;
    setError(false);
    setPhase("creating");
    setTopics(null);
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
      await loadTopics(created.id);
    } catch (err) {
      // A free-plan limit already opened the upgrade modal; anything else gets an inline error.
      if (!(err instanceof UpgradeLimitError)) {
        posthog.captureException(err);
        setError(true);
      }
      setPhase("form");
    }
  };

  const handleRetryTopics = async () => {
    if (!answers.timetableId) return;
    setPhase("creating");
    setTopics(null);
    await loadTopics(answers.timetableId);
  };

  const handleLater = () => {
    if (phase === "topicsFailed") {
      // The class exists; topics can finish later, the week generation does not need them shown.
      next();
      return;
    }
    posthog.capture("onboarding_v2_skipped_class");
    update({ skippedClass: true });
    goTo(5);
  };

  const handleContinue = () => {
    if (phase === "form") {
      void handleCreate();
    } else if (phase === "topicsFailed") {
      void handleRetryTopics();
    } else if (phase === "ready") {
      trackCompleted(3, {
        grade_level: year,
        lessons_per_week: lessonsPerWeek,
        capped,
      });
      next();
    }
  };

  useStepFooter({
    stepId: 3,
    canContinue: phase === "form" ? formValid : phase !== "creating",
    busy: phase === "creating",
    hideBack: phase !== "form",
    continueLabel:
      phase === "form"
        ? t("class.create")
        : phase === "topicsFailed"
          ? t("retry")
          : undefined,
    secondaryLabel:
      phase === "form" ? t("later") : phase === "topicsFailed" ? t("continue") : undefined,
    onContinue: handleContinue,
    onSecondary: handleLater,
  });

  if (phase !== "form") {
    return (
      <div>
        <StepHeading title={t("class.title")} subtitle={t("class.subtitle")} />
        <ClassTopicsReveal topics={topics} failed={phase === "topicsFailed"} />
      </div>
    );
  }

  return (
    <div>
      <StepHeading title={t("class.title")} subtitle={t("class.subtitle")} />

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="onboarding-class-year">{t("class.yearLabel")}</Label>
            <select
              id="onboarding-class-year"
              className={selectClassName}
              value={year}
              onChange={(event) => setChosenYear(Number(event.target.value))}
            >
              {yearOptions.map((value) => (
                <option key={value} value={value}>
                  {t("class.yearOption", { year: value })}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="onboarding-class-subject">{t("class.subjectLabel")}</Label>
            <select
              id="onboarding-class-subject"
              className={selectClassName}
              value={subjectId ?? ""}
              onChange={(event) => setChosenSubject(event.target.value)}
            >
              {subjectOptions.map((id) => (
                <option key={id} value={id}>
                  {translateSubjectLabel(id)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="onboarding-class-label">{t("class.labelLabel")}</Label>
          <Input
            id="onboarding-class-label"
            value={classLabel}
            onChange={(event) => setClassLabel(event.target.value)}
            placeholder={t("class.labelPlaceholder")}
            maxLength={40}
            autoComplete="off"
            className="h-11 rounded-xl px-4 text-base"
          />
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">{t("class.daysLabel")}</p>
          <WeekdayPicker value={lessons} onChange={setLessons} />
        </div>

        <div className="space-y-1 text-sm text-muted-foreground">
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
