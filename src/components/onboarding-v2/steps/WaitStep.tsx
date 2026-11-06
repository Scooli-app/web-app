"use client";

import { ChoiceChip } from "@/components/onboarding-v2/ChoiceChip";
import {
  finalizeDrafts,
  flushDraft,
  unlockDrafts,
} from "@/components/onboarding-v2/onboardingDraft";
import {
  baselineAnalytics,
  buildCompletePayload,
  effectiveWeeklyEmail,
} from "@/components/onboarding-v2/ritualState";
import { termAndWeek } from "@/components/onboarding-v2/schoolCalendar";
import { StepHeading } from "@/components/onboarding-v2/StepHeading";
import type { OnboardingFlowController } from "@/components/onboarding-v2/useOnboardingV2";
import { useStepFooter } from "@/components/onboarding-v2/useStepFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { onboardingV2Service } from "@/services/api/onboarding-v2.service";
import type { AcquisitionSource } from "@/shared/types/onboarding";
import type { ClassCount, CurrentTool, PrepHoursPerWeek } from "@/shared/types/onboarding-v2";
import { cn } from "@/shared/utils/utils";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import posthog from "posthog-js";
import { useEffect, useRef, useState, type ReactNode } from "react";

const PREP_HOURS: PrepHoursPerWeek[] = ["LT2", "H2_5", "H5_10", "GT10"];
const TOOLS: CurrentTool[] = ["AI_CHAT", "OTHER_AI", "WEB_SEARCH", "PUBLISHER", "COLLEAGUES", "FROM_SCRATCH"];
const CLASS_COUNTS: ClassCount[] = ["C1_2", "C3_4", "C5_PLUS"];
const SOURCES: AcquisitionSource[] = [
  "SEARCH_ENGINE",
  "FACEBOOK",
  "INSTAGRAM",
  "LINKEDIN",
  "COLLEAGUE_FRIEND",
  "EDUCATION_SUMMIT",
  "AI_ASSISTANT",
  "OTHER",
];
const SUNDAY = 7;
const OTHER_DAYS = [1, 2, 3, 4, 5, 6];
/** The narration moves on every few seconds while the year's topics are planned. */
const LINE_MS = 3500;
const ASSUMED_TOPICS_MS = 15000;
const TOPICS_SHOWN_IN_LINE = 3;

function Row({ label, stacked = false, children }: { label: string; stacked?: boolean; children: ReactNode }) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "gap-2 border-t border-border/70 py-2.5 first:border-t-0",
        stacked ? "space-y-2" : "grid sm:grid-cols-[1fr_auto] sm:items-center",
      )}
    >
      <p className="text-sm text-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

interface WaitStepProps {
  flow: OnboardingFlowController;
  /** Called once the answers are saved; the shell plays the celebration. */
  onFinished: () => void;
}

/**
 * The last screen: one line says what Scooli is doing with the teacher's answers while the plan is built, the
 * remaining questions are answered meanwhile (one tap each, all optional), and a green bar says when the week is
 * ready. Without a class (skipped, or pre-school) it's just the questions.
 */
export function WaitStep({ flow, onFinished }: WaitStepProps) {
  const t = useTranslations("onboardingV2");
  const tEnum = useTranslations("enums");
  const locale = useLocale();
  const { answers, trackCompleted, generation, ritual, updateRitual } = flow;
  const { planningDay, source, sourceOther, prepHours, currentTools, classCount } = ritual;
  const weeklyEmail = effectiveWeeklyEmail(ritual.weeklyEmail);
  // A plan run exists in this page (a reload after it finished has nothing to narrate: just the questions).
  const hasPlan = !answers.skippedClass && generation.weekStart !== "";
  const { topicsStatus, topicsStartedAt, weekStatus, rows } = generation;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const submittingRef = useRef(false);
  const [now, setNow] = useState(() => Date.now());

  // Leaving the step sends the debounced draft right away.
  useEffect(() => () => void flushDraft(), []);

  const topicsRunning = topicsStatus === "running" || topicsStatus === "idle";
  const weekRunning = weekStatus === "loading" || weekStatus === "generating";
  const working = hasPlan && (topicsRunning || weekRunning);
  useEffect(() => {
    if (!working) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [working]);

  const readyCount = rows.filter((row) => row.status === "ready").length;
  const weekReady = weekStatus === "done" && readyCount > 0;
  const failed = topicsStatus === "failed" || weekStatus === "failed";

  let percent = 10;
  if (topicsStatus === "done") {
    percent = 40;
    if (weekStatus === "done" || weekStatus === "empty") percent = 100;
    else if (weekStatus === "generating" || weekStatus === "failed") {
      percent = 40 + 60 * (rows.length > 0 ? readyCount / rows.length : 0);
    }
  } else if (topicsStatus === "running" && topicsStartedAt) {
    const elapsed = Math.max(0, now - topicsStartedAt);
    percent = 10 + 28 * (1 - Math.exp(-elapsed / ASSUMED_TOPICS_MS));
  }

  const today = new Date();
  const dayMonth = (date: Date) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" }).format(date);
  const parse = (iso: string) => new Date(`${iso}T00:00:00`);
  const term = termAndWeek(today);
  const first = answers.firstClass;
  const context = [
    dayMonth(today),
    term ? t("wait.term", { term: term.term, week: term.week }) : null,
    first ? t("wait.classOf", { subject: first.subjectLabel, year: first.year }) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // What Scooli is doing, said with the teacher's own answers.
  const topicLines = [
    first
      ? answers.role === "vocational"
        ? t("wait.lines.readingUnit", { subject: first.subjectLabel })
        : t("wait.lines.reading", { subject: first.subjectLabel, year: first.year })
      : t("wait.lines.readingGeneric"),
    ...(first && first.taught.length > 0
      ? [
          t("wait.lines.skipping", {
            topics:
              first.taught.slice(0, TOPICS_SHOWN_IN_LINE).join(", ") +
              (first.taught.length > TOPICS_SHOWN_IN_LINE ? "…" : ""),
          }),
        ]
      : []),
    t("wait.lines.planning"),
  ];
  const elapsedTopics = topicsStartedAt ? Math.max(0, now - topicsStartedAt) : 0;
  const lessonDays = new Intl.ListFormat(locale, { type: "conjunction" }).format(
    rows.map((row) =>
      new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric" }).format(parse(row.slotDate)),
    ),
  );
  let line: string;
  if (topicsStatus === "failed") line = t("wait.lines.topicsFailed");
  else if (topicsRunning) line = topicLines[Math.floor(elapsedTopics / LINE_MS) % topicLines.length];
  else if (weekStatus === "failed") line = t("wait.lines.weekFailed");
  else if (weekStatus === "empty") line = t("wait.lines.empty");
  else if (weekStatus === "done") line = t("wait.lines.done");
  else if (rows.length > 0) line = t("wait.lines.week", { days: lessonDays });
  else line = t("wait.lines.weekStarting");

  /** "9, 11 e 13 de novembro" (one month) or "30 de outubro e 2 de novembro". */
  const readyDates = () => {
    const dates = rows.filter((row) => row.status === "ready").map((row) => parse(row.slotDate));
    const list = new Intl.ListFormat(locale, { type: "conjunction" });
    const sameMonth = dates.every((date) => date.getMonth() === dates[0].getMonth());
    if (!sameMonth) return list.format(dates.map(dayMonth));
    const days = dates.map((date) => String(date.getDate()));
    days[days.length - 1] = dayMonth(dates[dates.length - 1]);
    return list.format(days);
  };

  const handleFinish = async () => {
    if (saving || submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);
    setError(false);
    // Flush pending drafts, wait for any in flight (keepalive too), then lock: complete()
    // below carries the full current state and nothing may land after it.
    await finalizeDrafts();
    try {
      await onboardingV2Service.complete(buildCompletePayload(ritual, answers.skippedClass));
      const baseline = baselineAnalytics(ritual);
      trackCompleted(4, {
        planning_day: planningDay,
        weekly_email: weeklyEmail,
        acquisition_source: source,
        plan: hasPlan ? (weekReady ? "ready" : failed ? "failed" : "working") : "none",
        ...baseline,
      });
      posthog.capture("onboarding_v2_completed", {
        planning_day: planningDay,
        weekly_email: weeklyEmail,
        skipped_class: answers.skippedClass,
      });
      posthog.setPersonProperties({
        teacher_role: answers.role,
        has_school: !answers.noSchool,
        school_years: answers.years,
        planning_day: planningDay,
        weekly_email: weeklyEmail,
        subjects: answers.subjectIds,
        ...baseline,
      });
      onFinished();
    } catch (err) {
      posthog.captureException(err);
      unlockDrafts();
      submittingRef.current = false;
      setError(true);
      setSaving(false);
    }
  };

  useStepFooter({
    stepId: 4,
    canContinue: true,
    busy: saving,
    continueLabel: !hasPlan
      ? t("wait.finish")
      : weekReady
        ? t("wait.seeWeek")
        : working
          ? t("wait.continueAnyway")
          : t("wait.goHome"),
    onContinue: () => void handleFinish(),
  });

  const toggleTool = (tool: CurrentTool) =>
    updateRitual({
      currentTools: currentTools.includes(tool)
        ? currentTools.filter((item) => item !== tool)
        : [...currentTools, tool],
    });

  return (
    <div>
      <StepHeading
        title={hasPlan ? (weekReady ? t("wait.titleReady") : t("wait.title")) : t("wait.titleNoClass")}
        subtitle={hasPlan ? undefined : t("wait.subtitleNoClass")}
      />

      {hasPlan && (
        <div className="mb-4 space-y-1.5">
          {weekReady ? (
            // Replaces the progress line, so it's seen on a phone too (the questions push the bottom off screen).
            <p
              role="status"
              className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
            >
              <Check className="h-4 w-4 shrink-0" aria-hidden />
              {t("wait.ready", { count: readyCount, dates: readyDates() })}
            </p>
          ) : (
            <>
              <p
                className="flex min-h-6 items-center gap-2 text-sm font-medium text-foreground sm:text-base"
                role="status"
                aria-live="polite"
              >
                {failed ? (
                  <AlertCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
                ) : weekStatus === "done" || weekStatus === "empty" ? (
                  <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                ) : (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
                )}
                <span className="min-w-0">{line}</span>
              </p>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(percent)}
                aria-label={t("wait.progressLabel")}
                className="h-1.5 w-full overflow-hidden rounded-full bg-primary/15"
              >
                {/* Progress is essential feedback: it animates even under reduced motion. */}
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={false}
                  animate={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
            </>
          )}
          <p className="text-xs text-muted-foreground">{context}</p>
          {failed && (
            <Button
              type="button"
              variant="outline"
              className="mt-1 h-9 rounded-xl px-4"
              onClick={topicsStatus === "failed" ? generation.retryTopics : generation.retryWeek}
            >
              {t("retry")}
            </Button>
          )}
        </div>
      )}

      {hasPlan && (
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
          {working ? t("wait.meanwhile") : t("wait.optional")}
        </p>
      )}
      <div>
        <Row label={t("baseline.prepTitle")}>
          {PREP_HOURS.map((value) => (
            <ChoiceChip key={value} selected={prepHours === value} onClick={() => updateRitual({ prepHours: value })}>
              {t(`baseline.prep.${value}`)}
            </ChoiceChip>
          ))}
        </Row>
        <Row label={t("baseline.classTitle")}>
          {CLASS_COUNTS.map((value) => (
            <ChoiceChip
              key={value}
              selected={classCount === value}
              onClick={() => updateRitual({ classCount: value })}
            >
              {t(`baseline.classes.${value}`)}
            </ChoiceChip>
          ))}
        </Row>
        <Row label={t("baseline.toolsTitle")} stacked>
          {TOOLS.map((tool) => (
            <ChoiceChip key={tool} showCheck selected={currentTools.includes(tool)} onClick={() => toggleTool(tool)}>
              {t(`baseline.tools.${tool}`)}
            </ChoiceChip>
          ))}
        </Row>
        <Row label={t("wait.emailTitle")}>
          <ChoiceChip
            selected={weeklyEmail && planningDay === SUNDAY}
            onClick={() => updateRitual({ weeklyEmail: true, planningDay: SUNDAY })}
          >
            {t("wait.emailSunday")}
          </ChoiceChip>
          <ChoiceChip
            selected={weeklyEmail && planningDay !== SUNDAY}
            onClick={() =>
              updateRitual({ weeklyEmail: true, planningDay: planningDay === SUNDAY ? 6 : planningDay })
            }
          >
            {t("wait.emailOtherDay")}
          </ChoiceChip>
          <ChoiceChip selected={!weeklyEmail} onClick={() => updateRitual({ weeklyEmail: false })}>
            {t("wait.emailNo")}
          </ChoiceChip>
          {weeklyEmail && planningDay !== SUNDAY && (
            <Select value={String(planningDay)} onValueChange={(value) => updateRitual({ planningDay: Number(value) })}>
              <SelectTrigger aria-label={t("wait.emailDay")} className="h-10 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[10000]">
                {OTHER_DAYS.map((day) => (
                  <SelectItem key={day} value={String(day)} className="min-h-10 text-base">
                    {t(`wait.days.${day}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Row>
        <Row label={t("wait.sourceTitle")}>
          <Select value={source ?? ""} onValueChange={(value) => updateRitual({ source: value as AcquisitionSource })}>
            <SelectTrigger aria-label={t("wait.sourceTitle")} className="h-10 w-full min-w-0 sm:w-56">
              <SelectValue placeholder={t("wait.sourcePlaceholder")} />
            </SelectTrigger>
            <SelectContent className="z-[10000]">
              {/* Compact rows: all 8 options fit the list on a phone, "Outro" included, with no scrolling. */}
              {SOURCES.map((value) => (
                <SelectItem key={value} value={value} className="min-h-9 text-sm">
                  {tEnum(`acquisitionSource.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {source === "OTHER" && (
            <Input
              value={sourceOther}
              onChange={(event) => updateRitual({ sourceOther: event.target.value })}
              placeholder={t("wait.sourceOtherPlaceholder")}
              // Appears below the fold on a phone: focusing scrolls to it and opens the keyboard.
              autoFocus
              maxLength={200}
              className="h-10 sm:w-56"
            />
          )}
        </Row>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {t("saveFailed")}
        </p>
      )}
    </div>
  );
}
