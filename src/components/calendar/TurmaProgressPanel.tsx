"use client";

import { relativeDayLabel } from "@/components/dashboard/checkInDay";
import { WeekLessonDialog, type WeekLessonTarget } from "@/components/dashboard/WeekLessonDialog";
import { Button } from "@/components/ui/button";
import { reinforcementTarget, useCheckInFollowUps } from "@/hooks/useCheckInFollowUps";
import { getTurmaProgress } from "@/services/api/progress.service";
import type { TurmaProgress, TurmaProgressFlaggedOutcome } from "@/shared/types/progress";
import { selectIsClassStateEnabled } from "@/store/features/selectors";
import { useAppSelector } from "@/store/hooks";
import { isSupportedLocale, defaultLocale } from "@/i18n/locales";
import { toIntlLocale, toIso } from "@/shared/utils/calendar";
import { cn } from "@/shared/utils/utils";
import {
  CalendarCheck,
  CheckCircle2,
  CircleDashed,
  CircleDot,
  Clock,
  Loader2,
  Target,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";
import {
  FLAGGED_PREVIEW_LIMIT,
  coverageBarWidth,
  formatCoveragePercent,
  formatProgressDate,
  lessonsGiven,
  reinforcementState,
  shouldLoadTurmaProgress,
  visibleFlaggedOutcomes,
} from "./turmaProgress";

/** How often the figures reload while a reinforcement worksheet is still being written. */
const GENERATING_POLL_MS = 5000;

interface TurmaProgressPanelProps {
  timetableId: string;
  /** Bump to reload the figures, e.g. after a check-in. */
  refreshKey?: number;
}

/**
 * The turma's progress at a glance (ENG-204): coverage of the AE, lessons given, what is behind
 * schedule, what to reinforce (with the worksheet for each) and the next test. Only with the `class_state_enabled`
 * flag; with it off this renders nothing and does not call the endpoint. A failed load renders nothing either.
 */
export function TurmaProgressPanel({ timetableId, refreshKey = 0 }: TurmaProgressPanelProps) {
  const enabled = useAppSelector(selectIsClassStateEnabled);
  const { reinforce } = useCheckInFollowUps();
  const [loaded, setLoaded] = useState<{ timetableId: string; progress: TurmaProgress } | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [busyOutcomeId, setBusyOutcomeId] = useState<string | null>(null);
  const [openTarget, setOpenTarget] = useState<WeekLessonTarget | null>(null);
  const shouldLoad = shouldLoadTurmaProgress(enabled, timetableId);

  const generating =
    loaded?.progress.flaggedOutcomes.some((o) => o.reinforcement?.status === "generating") ?? false;

  useEffect(() => {
    if (!shouldLoad) return;
    let cancelled = false;
    getTurmaProgress(timetableId)
      .then((progress) => {
        if (cancelled) return;
        setFailedId(null);
        setLoaded({ timetableId, progress });
      })
      .catch(() => {
        // 403 (flag off on the backend) and 404 (not this teacher's turma) both end here: show nothing.
        if (!cancelled) setFailedId(timetableId);
      });
    return () => {
      cancelled = true;
    };
  }, [shouldLoad, timetableId, refreshKey, reloadTick]);

  // A worksheet still being written: refresh until it is ready, so "A preparar…" becomes "Ficha pronta".
  useEffect(() => {
    if (!generating) return;
    const id = window.setInterval(() => setReloadTick((n) => n + 1), GENERATING_POLL_MS);
    return () => window.clearInterval(id);
  }, [generating]);

  const requestReinforcement = async (outcome: TurmaProgressFlaggedOutcome) => {
    if (!outcome.lastSignalSlotId) return;
    setBusyOutcomeId(outcome.outcomeId);
    const started = await reinforce(timetableId, outcome.lastSignalSlotId, [outcome.outcomeId], setOpenTarget);
    setBusyOutcomeId(null);
    if (started) setReloadTick((n) => n + 1);
  };

  if (!shouldLoad || failedId === timetableId) return null;
  if (loaded?.timetableId !== timetableId) return <TurmaProgressSkeleton />;
  return (
    <>
      <TurmaProgressView
        progress={loaded.progress}
        todayIso={toIso(new Date())}
        busyOutcomeId={busyOutcomeId}
        onRequestReinforcement={(outcome) => void requestReinforcement(outcome)}
        onOpenLesson={(lessonId, date) => setOpenTarget(reinforcementTarget(timetableId, lessonId, date))}
      />
      <WeekLessonDialog
        target={openTarget}
        onClose={() => setOpenTarget(null)}
        onChanged={() => setReloadTick((n) => n + 1)}
      />
    </>
  );
}

function TurmaProgressSkeleton() {
  const t = useTranslations("calendar.progress");
  return (
    <div
      aria-busy="true"
      aria-label={t("loadingLabel")}
      className="animate-pulse space-y-4 rounded-xl border bg-card p-4"
    >
      <div className="h-10 w-28 rounded bg-muted" />
      <div className="h-2 w-full rounded-full bg-muted" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="h-12 rounded bg-muted" />
        <div className="h-12 rounded bg-muted" />
        <div className="h-12 rounded bg-muted" />
        <div className="h-12 rounded bg-muted" />
      </div>
    </div>
  );
}

interface TurmaProgressViewProps {
  progress: TurmaProgress;
  /** YYYY-MM-DD, for the "hoje" / "há 3 dias" labels. */
  todayIso: string;
  /** The outcome whose worksheet is being requested, so its button waits. */
  busyOutcomeId?: string | null;
  /** "Gerar ficha". Without it the reinforce list offers no action. */
  onRequestReinforcement?: (outcome: TurmaProgressFlaggedOutcome) => void;
  /** "Abrir" on a ready worksheet: the lesson it was written for, and that lesson's date. */
  onOpenLesson?: (lessonId: string, date: string) => void;
}

/** The panel's content for loaded figures. Exported so the rendering can be tested without a fetch. */
export function TurmaProgressView({
  progress,
  todayIso,
  busyOutcomeId = null,
  onRequestReinforcement,
  onOpenLesson,
}: TurmaProgressViewProps) {
  const t = useTranslations("calendar.progress");
  const tCheckIns = useTranslations("checkIns");
  const rawLocale = useLocale();
  const intlLocale = toIntlLocale(isSupportedLocale(rawLocale) ? rawLocale : defaultLocale);
  const [expanded, setExpanded] = useState(false);

  const { coverage, slots, behindSchedule, flaggedOutcomes, nextAssessment } = progress;
  const width = coverageBarWidth(coverage.percent);
  const shownOutcomes = visibleFlaggedOutcomes(flaggedOutcomes, expanded);
  const hiddenCount = flaggedOutcomes.length - shownOutcomes.length;
  const coverageLine = [
    t("coverageCount", { covered: coverage.outcomesCovered, total: coverage.outcomesTotal }),
    t("coverageOfYear", { total: coverage.outcomesTotal, curriculum: coverage.curriculumTotal }),
  ].join(" · ");

  return (
    <section aria-label={t("title")} className="space-y-5 rounded-xl border bg-card p-4">
      <h2 className="text-sm font-semibold">{t("title")}</h2>

      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div>
          <p className="text-3xl font-semibold tabular-nums">{formatCoveragePercent(coverage.percent)}</p>
          <p className="text-sm text-muted-foreground">{t("coverageCaption")}</p>
        </div>
        <p className="text-xs text-muted-foreground sm:text-right">{coverageLine}</p>
      </div>
      <div
        role="progressbar"
        aria-label={t("coverageLabel")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={width}
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${width}%` }} />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatChip icon={CheckCircle2} tone={TONE.emerald} label={t("given")} value={lessonsGiven(slots.counts)} />
        <StatChip icon={CircleDashed} tone={TONE.amber} label={t("partial")} value={slots.counts.partiallyTaught} />
        <StatChip icon={XCircle} tone={TONE.rose} label={t("notHeld")} value={slots.counts.notHeld} />
        <StatChip icon={CircleDot} tone={TONE.primary} label={t("pending")} value={slots.counts.planned} />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <PanelSection icon={Clock} tone={TONE.amber} title={t("behindTitle")}>
          {behindSchedule.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("allOnTime")}</p>
          ) : (
            <ul className="space-y-2">
              {behindSchedule.items.map((item) => (
                <li key={item.unitOrder ?? item.label} className="text-sm">
                  <p className="line-clamp-2 font-medium" title={item.label}>
                    {item.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("plannedFor", { date: formatProgressDate(item.plannedDate, intlLocale) })}
                    {" · "}
                    {t("behindLessons", { count: item.lessonsBehind })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </PanelSection>

        <PanelSection icon={Target} tone={TONE.rose} title={t("reinforceTitle")}>
          {flaggedOutcomes.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("reinforceEmpty")}</p>
          ) : (
            <ul className="space-y-3">
              {shownOutcomes.map((outcome) => (
                <ReinforceItem
                  key={outcome.outcomeId}
                  outcome={outcome}
                  todayIso={todayIso}
                  intlLocale={intlLocale}
                  busy={busyOutcomeId === outcome.outcomeId}
                  onRequest={onRequestReinforcement}
                  onOpen={onOpenLesson}
                  labels={{
                    difficulties: (count) => t("difficulties", { count }),
                    lastSignal: (when) => t("lastSignal", { when }),
                    today: tCheckIns("dayToday"),
                    yesterday: tCheckIns("dayYesterday"),
                    daysAgo: (count) => tCheckIns("daysAgo", { count }),
                  }}
                />
              ))}
              {flaggedOutcomes.length > FLAGGED_PREVIEW_LIMIT && (
                <li>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => setExpanded((v) => !v)}
                  >
                    {expanded ? t("showLess") : t("showMore", { count: hiddenCount })}
                  </Button>
                </li>
              )}
            </ul>
          )}
        </PanelSection>
      </div>

      <div className="flex items-start gap-2 border-t pt-3 text-sm">
        <CalendarCheck className={cn("mt-0.5 h-4 w-4 shrink-0", TONE.primary)} aria-hidden />
        <div className="min-w-0">
          <p className="font-semibold">{t("nextAssessmentTitle")}</p>
          {nextAssessment ? (
            <p className="text-muted-foreground">
              {nextAssessment.topicTitle} · {formatProgressDate(nextAssessment.date, intlLocale)}
            </p>
          ) : (
            <p className="text-muted-foreground">{t("noAssessment")}</p>
          )}
        </div>
      </div>
    </section>
  );
}

/** Tones shared by the chips and the section icons; the dark variants keep the contrast on dark cards. */
const TONE = {
  emerald: "text-emerald-600 dark:text-emerald-400",
  amber: "text-amber-600 dark:text-amber-400",
  rose: "text-rose-600 dark:text-rose-400",
  primary: "text-primary",
} as const;

function StatChip({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: LucideIcon;
  tone: string;
  label: string;
  value: number;
}) {
  return (
    <div className={cn("flex items-center gap-2.5 rounded-lg border px-3 py-2", value === 0 && "opacity-50")}>
      <Icon className={cn("h-4 w-4 shrink-0", tone)} aria-hidden />
      <div className="min-w-0">
        <p className="text-base font-semibold leading-none tabular-nums">{value}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function PanelSection({
  icon: Icon,
  tone,
  title,
  children,
}: {
  icon: LucideIcon;
  tone: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold">
        <Icon className={cn("h-4 w-4 shrink-0", tone)} aria-hidden />
        {title}
      </h3>
      {children}
    </div>
  );
}

interface ReinforceLabels {
  difficulties: (count: number) => string;
  lastSignal: (when: string) => string;
  today: string;
  yesterday: string;
  daysAgo: (count: number) => string;
}

function ReinforceItem({
  outcome,
  todayIso,
  intlLocale,
  busy,
  onRequest,
  onOpen,
  labels,
}: {
  outcome: TurmaProgressFlaggedOutcome;
  todayIso: string;
  intlLocale: string;
  busy: boolean;
  onRequest?: (outcome: TurmaProgressFlaggedOutcome) => void;
  onOpen?: (lessonId: string, date: string) => void;
  labels: ReinforceLabels;
}) {
  const t = useTranslations("calendar.progress");
  const state = reinforcementState(outcome);
  const reinforcement = outcome.reinforcement;
  const when = relativeDayLabel(outcome.lastSignalDate, todayIso, intlLocale, {
    today: labels.today,
    yesterday: labels.yesterday,
    daysAgo: labels.daysAgo,
  });

  return (
    <li className="space-y-1.5 text-sm">
      <p className="line-clamp-2 font-medium" title={outcome.text}>
        {outcome.text}
      </p>
      <p className="text-xs text-muted-foreground">
        {labels.difficulties(outcome.difficultyCount)}
        {" · "}
        {labels.lastSignal(when)}
      </p>

      {state === "generating" && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          {t("reinforcementGenerating")}
        </p>
      )}
      {state === "ready" && reinforcement && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-emerald-700 dark:text-emerald-300">
            {t("reinforcementReady", {
              day: formatProgressDate(reinforcement.targetDate, intlLocale),
            })}
          </p>
          {onOpen && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onOpen(reinforcement.targetSlotId, reinforcement.targetDate)}
            >
              {t("open")}
            </Button>
          )}
        </div>
      )}
      {state === "request" && (
        <div className="flex flex-wrap items-center gap-2">
          {reinforcement?.status === "failed" && (
            <p className="text-xs text-rose-600 dark:text-rose-400">{t("reinforcementFailed")}</p>
          )}
          {onRequest && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={busy}
              onClick={() => onRequest(outcome)}
            >
              {busy && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
              {reinforcement?.status === "failed" ? t("reinforcementRetry") : t("reinforcementGenerate")}
            </Button>
          )}
        </div>
      )}
    </li>
  );
}
