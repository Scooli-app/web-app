"use client";

import { PlanIllustration } from "@/components/onboarding-v2/illustrations/StepIllustrations";
import { StepHeading } from "@/components/onboarding-v2/StepHeading";
import type { OnboardingFlowController } from "@/components/onboarding-v2/useOnboardingV2";
import { useStepFooter } from "@/components/onboarding-v2/useStepFooter";
import { WeekLessonRow } from "@/components/onboarding-v2/steps/WeekLessonRow";
import { Button } from "@/components/ui/button";
import { useMotionSafe } from "@/lib/motion/useMotionSafe";
import { cn } from "@/shared/utils/utils";
import { AlertCircle, Check, ExternalLink, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";

type StageState = "pending" | "active" | "done" | "failed";

const TOPICS_HINT_COUNT = 4;
const WEEK_HINT_COUNT = 3;
/** Rows shown at once: the step never scrolls, so the rest is summarised as "+N". */
const MAX_VISIBLE_ROWS = 3;
const TICK_MS = 500;
const HINT_EVERY_TICKS = 7;
const ASSUMED_TOPICS_MS = 15000;

interface StageRowProps {
  state: StageState;
  label: string;
  children?: ReactNode;
}

/** One line of the checklist: pending dot, spinner (always animated), check or alert. */
function StageRow({ state, label, children }: StageRowProps) {
  return (
    <li className="space-y-2">
      <div className="flex min-h-9 items-center gap-3">
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
            state === "done" && "border-primary bg-primary text-primary-foreground",
            state === "active" && "border-primary/40 bg-primary/10 text-primary",
            state === "failed" && "border-destructive/40 text-destructive",
            state === "pending" && "border-border text-muted-foreground",
          )}
          aria-hidden
        >
          {state === "done" && <Check className="h-4 w-4" strokeWidth={3} />}
          {state === "active" && <Loader2 className="h-4 w-4 animate-spin" />}
          {state === "failed" && <AlertCircle className="h-4 w-4" />}
          {state === "pending" && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
        </span>
        <span
          className={cn(
            "min-w-0 text-base",
            state === "pending" ? "text-muted-foreground" : "font-medium text-foreground",
          )}
        >
          {label}
        </span>
      </div>
      {children && <div className="ml-10 pb-1">{children}</div>}
    </li>
  );
}

interface FirstWeekStepProps {
  flow: OnboardingFlowController;
}

/**
 * Step 4: a live checklist (class created, year topics, first-week lessons). The work
 * itself runs in `flow.generation`, so "Continue" is available at any time.
 */
export function FirstWeekStep({ flow }: FirstWeekStepProps) {
  const t = useTranslations("onboardingV2");
  const locale = useLocale();
  const { stagger, item } = useMotionSafe();
  const { next, trackCompleted, generation } = flow;
  const { topicsStatus, topics, topicsStartedAt, weekStatus, rows, firstLessonHref, weekStart } =
    generation;

  const [now, setNow] = useState(() => Date.now());
  const [tick, setTick] = useState(0);

  const topicsRunning = topicsStatus === "running" || topicsStatus === "idle";
  const weekRunning = weekStatus === "loading" || weekStatus === "generating";
  const working = topicsRunning || weekRunning;

  useEffect(() => {
    if (!working) return;
    const id = window.setInterval(() => {
      setNow(Date.now());
      setTick((value) => value + 1);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [working]);

  const readyCount = rows.filter((row) => row.status === "ready").length;
  const weekFraction = rows.length > 0 ? readyCount / rows.length : 0;

  let percent = 10;
  if (topicsStatus === "done") {
    percent = 40;
    if (weekStatus === "done" || weekStatus === "empty") percent = 100;
    else if (weekStatus === "generating" || weekStatus === "failed") {
      percent = 40 + 60 * weekFraction;
    }
  } else if (topicsStatus === "running" && topicsStartedAt) {
    const elapsed = Math.max(0, now - topicsStartedAt);
    percent = 10 + 28 * (1 - Math.exp(-elapsed / ASSUMED_TOPICS_MS));
  }
  percent = Math.min(100, Math.max(0, percent));

  const topicsState: StageState =
    topicsStatus === "done" ? "done" : topicsStatus === "failed" ? "failed" : "active";
  const weekState: StageState =
    weekStatus === "done" || weekStatus === "empty"
      ? "done"
      : weekStatus === "failed"
        ? "failed"
        : topicsStatus === "done"
          ? "active"
          : "pending";
  const allDone = topicsState === "done" && weekState === "done";

  const hintIndex = Math.floor(tick / HINT_EVERY_TICKS);
  const hint = topicsRunning
    ? t(`plan.topicsHints.${(hintIndex % TOPICS_HINT_COUNT) + 1}`)
    : weekRunning || (topicsStatus === "done" && weekState === "active")
      ? t(`plan.weekHints.${(hintIndex % WEEK_HINT_COUNT) + 1}`)
      : null;

  useStepFooter({
    stepId: 4,
    canContinue: true,
    hideBack: true,
    onContinue: () => {
      trackCompleted(4, {
        outcome: allDone ? "done" : working ? "background" : "error",
        topics: topicsStatus,
        week: weekStatus,
        lessons_ready: readyCount,
      });
      next();
    },
  });

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" }).format(
      new Date(`${iso}T00:00:00`),
    );

  const formatRange = () => {
    const start = new Date(`${weekStart}T00:00:00`);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    const format = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
    return `${format.format(start)} – ${format.format(end)}`;
  };

  return (
    <div>
      <StepHeading
        title={allDone ? t("plan.titleDone") : t("plan.title")}
        subtitle={allDone ? undefined : t("plan.subtitle")}
        illustration={<PlanIllustration progress={percent / 100} />}
      />

      <div className="mb-3 space-y-1.5">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percent)}
          aria-label={t("plan.progressLabel")}
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
        >
          {/* Progress is essential feedback: it animates even under reduced motion. */}
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={false}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
        <p className="min-h-5 text-xs text-muted-foreground sm:text-sm" role="status" aria-live="polite">
          {hint ?? (allDone ? t("plan.allDone") : "")}
        </p>
      </div>

      <ul className="space-y-0.5">
        <StageRow state="done" label={t("plan.stages.created")} />

        <StageRow
          state={topicsState}
          label={topicsState === "done" ? t("plan.stages.topicsDone") : t("plan.stages.topics")}
        >
          {topicsStatus === "failed" && (
            <div className="space-y-2">
              <p role="alert" className="text-sm text-destructive">
                {t("plan.topicsFailed")}
              </p>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl px-5"
                onClick={generation.retryTopics}
              >
                {t("retry")}
              </Button>
            </div>
          )}
          {/* The week's lessons replace the topic preview once they exist (no scrolling). */}
          {topicsStatus === "done" && topics.length > 0 && rows.length === 0 && (
            <motion.ol variants={stagger} initial="initial" animate="animate" className="space-y-1.5">
              {topics.slice(0, MAX_VISIBLE_ROWS).map((slot) => (
                <motion.li
                  key={slot.id}
                  variants={item}
                  className="flex items-baseline gap-3 rounded-xl border border-border bg-card px-3 py-1.5"
                >
                  <span className="w-20 shrink-0 text-xs font-medium capitalize text-muted-foreground sm:w-24">
                    {formatDate(slot.slotDate)}
                  </span>
                  <span className="min-w-0 truncate text-sm text-foreground">{slot.topicTitle}</span>
                </motion.li>
              ))}
            </motion.ol>
          )}
        </StageRow>

        <StageRow
          state={weekState}
          label={weekState === "done" ? t("plan.stages.weekDone") : t("plan.stages.week")}
        >
          {weekStatus === "empty" && (
            <p className="text-sm text-muted-foreground">{t("week.noLessons")}</p>
          )}
          {weekState === "active" && rows.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t("plan.weekRange", { range: formatRange() })}
            </p>
          )}
          {topicsStatus === "done" && rows.length > 0 && (
            <motion.ul variants={stagger} initial="initial" animate="animate" className="space-y-1.5">
              {rows.slice(0, MAX_VISIBLE_ROWS).map((row, index) => (
                <motion.li key={row.id} variants={item}>
                  <WeekLessonRow row={row} position={index + 1} locale={locale} />
                </motion.li>
              ))}
              {rows.length > MAX_VISIBLE_ROWS && (
                <li className="px-1 text-xs text-muted-foreground">
                  {t("plan.moreLessons", { count: rows.length - MAX_VISIBLE_ROWS })}
                </li>
              )}
            </motion.ul>
          )}
          {weekStatus === "failed" && (
            <div className="mt-2 space-y-2">
              <p role="alert" className="text-sm text-destructive">
                {t("plan.weekFailed")}
              </p>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl px-5"
                onClick={generation.retryWeek}
              >
                {t("retry")}
              </Button>
            </div>
          )}
          {weekStatus === "done" && firstLessonHref && (
            <Button asChild variant="outline" className="mt-2 h-10 rounded-xl px-5">
              <a href={firstLessonHref} target="_blank" rel="noopener noreferrer">
                {t("week.openLesson")}
                <ExternalLink aria-hidden />
              </a>
            </Button>
          )}
        </StageRow>
      </ul>
    </div>
  );
}
