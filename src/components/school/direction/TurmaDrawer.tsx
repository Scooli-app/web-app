"use client";

import { LoadError } from "@/components/ui/load-error";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { getDirectionTurma } from "@/services/api/school-direction.service";
import type { DirectionTurmaDetail } from "@/shared/types/school-direction";
import { cn } from "@/shared/utils/utils";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";
import { formatClass, formatDay, formatSubject } from "./format";
import { STATE_CLASSES, StatePill } from "./StatePill";
import { TeacherContact } from "./TeacherContact";

function DrawerCard({ title, tone, children }: { title: string; tone?: "plan"; children: ReactNode }) {
  return (
    <section
      className={cn(
        "rounded-2xl border p-4 sm:p-5",
        tone === "plan" ? "border-primary/20 bg-primary/5" : "border-border bg-card",
      )}
    >
      <h3 className={cn("text-base font-semibold", tone === "plan" ? "text-primary" : "text-foreground")}>{title}</h3>
      {children}
    </section>
  );
}

function WhyGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      <ul className="mt-1 divide-y divide-border/60 text-sm">{children}</ul>
    </div>
  );
}

function DrawerBody({ detail }: { detail: DirectionTurmaDetail }) {
  const t = useTranslations("schoolDirection.drawer");
  const locale = useLocale();
  const { turma, missedLessons, behindTopics, difficulties, teacherPlan, nextAssessment } = detail;
  const day = (iso: string) => formatDay(iso, locale);
  const hasWhy = missedLessons.length + behindTopics.length + difficulties.length > 0;

  return (
    <div className="flex flex-col gap-5 p-5 sm:p-8">
      <div className="flex flex-col gap-1.5 pr-8 text-sm text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <StatePill state={turma.state} lessonsBehind={turma.lessonsBehind} />
          <span>{formatSubject(turma.subjectKey, turma.subjectLabel)}</span>
        </div>
        <TeacherContact teacher={turma.teacher} />
      </div>

      <SheetTitle className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {formatClass(turma.grade, turma.classLabel, locale)}
      </SheetTitle>

      <div>
        <p className="font-medium text-foreground">
          {turma.executionPercent === null
            ? t("executionUnknown")
            : t("execution", { percent: turma.executionPercent })}
        </p>
        {/* The track takes the state's tint, the fill its colour. */}
        <div aria-hidden className={cn("mt-2 h-3 overflow-hidden rounded-full", STATE_CLASSES[turma.state])}>
          <div className="h-full rounded-full bg-current" style={{ width: `${turma.executionPercent ?? 0}%` }} />
        </div>
      </div>

      {hasWhy && (
        <DrawerCard title={t("why")}>
          {missedLessons.length > 0 && (
            <WhyGroup title={t("missedTitle")}>
              {missedLessons.map((lesson) => (
                <li key={lesson.slotId} className="py-3">
                  <p className="font-medium text-foreground">
                    {lesson.topicTitle ?? t("lessonNumber", { n: lesson.sequenceNumber })}
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    {day(lesson.date)} · {t(lesson.teachingStatus === "not_held" ? "notHeld" : "leftHalfway")}
                  </p>
                  {lesson.note && <p className="mt-1.5 whitespace-pre-line text-foreground">“{lesson.note}”</p>}
                </li>
              ))}
            </WhyGroup>
          )}
          {behindTopics.length > 0 && (
            <WhyGroup title={t("behindTitle")}>
              {behindTopics.map((topic, i) => (
                <li key={i} className="py-3">
                  <span className="font-medium text-foreground">{topic.label}</span>{" "}
                  <span className="text-muted-foreground">· {t("plannedFor", { date: day(topic.plannedDate) })}</span>
                </li>
              ))}
            </WhyGroup>
          )}
          {difficulties.length > 0 && (
            <WhyGroup title={t("difficultiesTitle")}>
              {difficulties.map((difficulty) => (
                <li key={difficulty.outcomeId} className="py-3">
                  <span className="font-medium text-foreground">{difficulty.text}</span>{" "}
                  <span className="text-muted-foreground">· {t("flagged", { count: difficulty.difficultyCount })}</span>
                </li>
              ))}
            </WhyGroup>
          )}
        </DrawerCard>
      )}

      {teacherPlan && (
        <DrawerCard title={t("planTitle")} tone="plan">
          <p className="mt-2 text-sm text-muted-foreground">
            {teacherPlan.status === "pending"
              ? t("planPending", { date: day(teacherPlan.createdAt) })
              : t("planAdjusted", { date: day(teacherPlan.decidedAt ?? teacherPlan.createdAt) })}
          </p>
          {teacherPlan.summary && (
            <p className="mt-2 whitespace-pre-line text-sm text-foreground">{teacherPlan.summary}</p>
          )}
        </DrawerCard>
      )}

      {nextAssessment && (
        <DrawerCard title={t("nextTest")}>
          <p className="mt-2 text-sm">
            <span className="font-medium text-foreground">{day(nextAssessment.date)}</span>
            {nextAssessment.topicTitle && <span className="text-muted-foreground"> · {nextAssessment.topicTitle}</span>}
          </p>
        </DrawerCard>
      )}
    </div>
  );
}

interface Loaded {
  id: string;
  detail?: DirectionTurmaDetail;
  failed?: boolean;
}

/** Why one class is where it is, and who teaches it. Opens while `turmaId` is set. */
export function TurmaDrawer({ turmaId, onClose }: { turmaId: string | null; onClose: () => void }) {
  const t = useTranslations("schoolDirection.drawer");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!turmaId) return;
    let cancelled = false;
    setLoaded({ id: turmaId });
    getDirectionTurma(turmaId).then(
      (detail) => {
        if (!cancelled) setLoaded({ id: turmaId, detail });
      },
      () => {
        if (!cancelled) setLoaded({ id: turmaId, failed: true });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [turmaId, attempt]);

  // While closing (id null) keep showing the last class; never show another class's data under a new id.
  const current = loaded && (turmaId === null || loaded.id === turmaId) ? loaded : null;

  return (
    <Sheet open={turmaId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent aria-describedby={undefined} largeClose className="w-full gap-0 p-0 sm:max-w-xl">
        {/* Only the body scrolls, so the close button stays in reach on a full-width phone sheet. */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {current?.detail ? (
            <DrawerBody detail={current.detail} />
          ) : (
            <div className="flex flex-col gap-5 p-5 sm:p-8">
              <SheetTitle className="sr-only">{t("fallbackTitle")}</SheetTitle>
              {current?.failed ? (
                <LoadError className="mt-8" onRetry={() => setAttempt((n) => n + 1)} />
              ) : (
                <>
                  <Skeleton className="h-6 w-64 max-w-full" />
                  <Skeleton className="h-9 w-24" />
                  <Skeleton className="h-3 w-full rounded-full" />
                  <Skeleton className="h-56 w-full rounded-2xl" />
                </>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
