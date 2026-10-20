"use client";

import { relativeDayLabel } from "@/components/dashboard/checkInDay";
import { Button } from "@/components/ui/button";
import { getTurmaProgress } from "@/services/api/progress.service";
import type { TurmaProgress } from "@/shared/types/progress";
import { selectIsClassStateEnabled } from "@/store/features/selectors";
import { useAppSelector } from "@/store/hooks";
import { isSupportedLocale, defaultLocale } from "@/i18n/locales";
import { toIntlLocale, toIso } from "@/shared/utils/calendar";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  FLAGGED_PREVIEW_LIMIT,
  coverageBarWidth,
  formatCoveragePercent,
  formatProgressDate,
  lessonsGiven,
  shouldLoadTurmaProgress,
  visibleFlaggedOutcomes,
} from "./turmaProgress";

interface TurmaProgressPanelProps {
  timetableId: string;
  /** Bump to reload the figures, e.g. after a check-in. */
  refreshKey?: number;
}

/**
 * The turma's progress at a glance (ENG-204): coverage of the AE, lessons given, what is behind
 * schedule, what to reinforce and the next test. Only with the `class_state_enabled` flag; with it
 * off this renders nothing and does not call the endpoint. A failed load renders nothing either.
 */
export function TurmaProgressPanel({ timetableId, refreshKey = 0 }: TurmaProgressPanelProps) {
  const enabled = useAppSelector(selectIsClassStateEnabled);
  const [loaded, setLoaded] = useState<{ timetableId: string; progress: TurmaProgress } | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  const shouldLoad = shouldLoadTurmaProgress(enabled, timetableId);

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
  }, [shouldLoad, timetableId, refreshKey]);

  if (!shouldLoad || failedId === timetableId) return null;
  if (loaded?.timetableId !== timetableId) return <TurmaProgressSkeleton />;
  return <TurmaProgressView progress={loaded.progress} todayIso={toIso(new Date())} />;
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
      <div className="grid gap-3 md:grid-cols-2">
        <div className="h-24 rounded bg-muted" />
        <div className="h-24 rounded bg-muted" />
      </div>
    </div>
  );
}

interface TurmaProgressViewProps {
  progress: TurmaProgress;
  /** YYYY-MM-DD, for the "hoje" / "há 3 dias" labels. */
  todayIso: string;
}

/** The panel's content for loaded figures. Exported so the rendering can be tested without a fetch. */
export function TurmaProgressView({ progress, todayIso }: TurmaProgressViewProps) {
  const t = useTranslations("calendar.progress");
  const tCheckIns = useTranslations("checkIns");
  const rawLocale = useLocale();
  const intlLocale = toIntlLocale(isSupportedLocale(rawLocale) ? rawLocale : defaultLocale);
  const [expanded, setExpanded] = useState(false);

  const { coverage, slots, behindSchedule, flaggedOutcomes, nextAssessment } = progress;
  const width = coverageBarWidth(coverage.percent);
  const shownOutcomes = visibleFlaggedOutcomes(flaggedOutcomes, expanded);
  const hiddenCount = flaggedOutcomes.length - shownOutcomes.length;

  // No linked plan: every figure below would read as "0 of 0" / "all on time", which is not true.
  if (coverage.outcomesTotal === 0) {
    return (
      <section aria-label={t("title")} className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        {t("noPlan")}
      </section>
    );
  }

  return (
    <section aria-label={t("title")} className="space-y-4 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("coverageLabel")}
          </p>
          <p className="text-3xl font-semibold tabular-nums">{formatCoveragePercent(coverage.percent)}</p>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <p>{t("coverageCount", { covered: coverage.outcomesCovered, total: coverage.outcomesTotal })}</p>
          <p className="text-xs">
            {t("coverageOfYear", { total: coverage.outcomesTotal, curriculum: coverage.curriculumTotal })}
          </p>
        </div>
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

      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Stat label={t("given")} value={lessonsGiven(slots.counts)} />
        <Stat label={t("partial")} value={slots.counts.partiallyTaught} />
        <Stat label={t("notHeld")} value={slots.counts.notHeld} />
        <Stat label={t("pending")} value={slots.pendingCheckIns} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">{t("behindTitle")}</h3>
          {behindSchedule.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("allOnTime")}</p>
          ) : (
            <ul className="space-y-2">
              {behindSchedule.items.map((item) => (
                <li key={item.unitOrder} className="text-sm">
                  <p className="font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("plannedFor", { date: formatProgressDate(item.plannedDate, intlLocale) })}
                    {" · "}
                    {t("behindLessons", { count: item.lessonsBehind })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">{t("reinforceTitle")}</h3>
          {flaggedOutcomes.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("reinforceEmpty")}</p>
          ) : (
            <ul className="space-y-2">
              {shownOutcomes.map((outcome) => (
                <li key={outcome.outcomeId} className="text-sm">
                  <p className="line-clamp-2">{outcome.text}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("difficulties", { count: outcome.difficultyCount })}
                    {" · "}
                    {t("lastSignal", {
                      when: relativeDayLabel(outcome.lastSignalDate, todayIso, intlLocale, {
                        today: tCheckIns("dayToday"),
                        yesterday: tCheckIns("dayYesterday"),
                        daysAgo: (count) => tCheckIns("daysAgo", { count }),
                      }),
                    })}
                  </p>
                </li>
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
        </div>
      </div>

      <div className="border-t pt-3 text-sm">
        <span className="font-semibold">{t("nextAssessmentTitle")}: </span>
        {nextAssessment ? (
          <span className="text-muted-foreground">
            {nextAssessment.topicTitle} · {formatProgressDate(nextAssessment.date, intlLocale)}
          </span>
        ) : (
          <span className="text-muted-foreground">{t("noAssessment")}</span>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
