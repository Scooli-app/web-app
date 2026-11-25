"use client";

import { useCountry } from "@/hooks/useCountry";
import { Button } from "@/components/ui/button";
import { LoadError } from "@/components/ui/load-error";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { Locale } from "@/i18n/locales";
import { getDirectionTurma } from "@/services/api/school-direction.service";
import type { DirectionTurmaDetail } from "@/shared/types/school-direction";
import { toIntlLocale } from "@/shared/utils/calendar";
import { cn } from "@/shared/utils/utils";
import { ChevronDown, Copy } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { formatClass, formatDay, formatSubject } from "./format";
import { STATE_CLASSES, StatePill } from "./StatePill";
import { TeacherContact } from "./TeacherContact";

/** Shown before "Ver mais": the newest problems, enough to read the class's recent weeks. */
const TIMELINE_SHOWN = 4;
const BEHIND_SHOWN = 5;
/** A teacher note longer than this starts clamped to 3 lines, with "Ler tudo". */
const LONG_NOTE = 120;

/** "26/11" in Portuguese, "26 Nov" in English: short enough for a tile or a timeline column. */
function shortDay(iso: string, locale: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString(toIntlLocale(locale as Locale), {
    day: "numeric",
    month: "short",
  });
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</h3>;
}

function Kpi({ value, label, title }: { value: ReactNode; label: string; title?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-xl bg-muted px-3 py-2.5" title={title}>
      <span className="truncate text-xl font-bold tabular-nums text-foreground">{value}</span>
      <span className="text-xs leading-tight text-muted-foreground">{label}</span>
    </div>
  );
}

function MoreButton({ expanded, onClick, children }: { expanded: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      onClick={onClick}
      className="self-start rounded-sm text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </button>
  );
}

type MissedLesson = DirectionTurmaDetail["missedLessons"][number];

/** One lesson of "O que aconteceu": date, a ½ or ✕, the topic, and the teacher's note only when there is one. */
function MissedItem({ lesson, locale }: { lesson: MissedLesson; locale: string }) {
  const t = useTranslations("schoolDirection.drawer");
  const [noteOpen, setNoteOpen] = useState(false);
  const notHeld = lesson.teachingStatus === "not_held";
  const title = lesson.topicTitle ?? t("lessonNumber", { n: lesson.sequenceNumber });
  const longNote = (lesson.note?.length ?? 0) > LONG_NOTE;

  return (
    <li className="grid grid-cols-[3.25rem_1.375rem_minmax(0,1fr)] items-start gap-2.5 border-t border-border/60 py-2.5 first:border-t-0">
      <time dateTime={lesson.date} className="pt-0.5 text-xs tabular-nums text-muted-foreground">
        {shortDay(lesson.date, locale)}
      </time>
      <span
        aria-hidden
        className={cn(
          "grid size-5.5 place-items-center rounded-full text-[0.7rem] font-bold",
          notHeld ? STATE_CLASSES.behind : STATE_CLASSES.watch,
        )}
      >
        {notHeld ? "✕" : "½"}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="line-clamp-2 wrap-anywhere text-sm font-medium text-foreground" title={title}>
          {title}
        </p>
        <p className="text-xs text-muted-foreground">{t(notHeld ? "notHeld" : "leftHalfway")}</p>
        {lesson.note && (
          <>
            <p
              className={cn(
                "mt-1 whitespace-pre-line wrap-anywhere border-l-2 border-border pl-2.5 text-sm italic text-muted-foreground",
                longNote && !noteOpen && "line-clamp-3",
              )}
            >
              “{lesson.note}”
            </p>
            {longNote && (
              <button
                type="button"
                aria-expanded={noteOpen}
                onClick={() => setNoteOpen((open) => !open)}
                className="self-start rounded-sm text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t(noteOpen ? "readLess" : "readAll")}
              </button>
            )}
          </>
        )}
      </div>
    </li>
  );
}

function DrawerBody({ detail }: { detail: DirectionTurmaDetail }) {
  const t = useTranslations("schoolDirection.drawer");
  const locale = useLocale();
  const countryCode = useCountry();
  const { turma, missedLessons, behindTopics, difficulties, teacherPlan, nextAssessment } = detail;
  const [allMissed, setAllMissed] = useState(false);
  const [allBehind, setAllBehind] = useState(false);
  const day = (iso: string) => formatDay(iso, locale);
  const shownMissed = allMissed ? missedLessons : missedLessons.slice(0, TIMELINE_SHOWN);
  const shownBehind = allBehind ? behindTopics : behindTopics.slice(0, BEHIND_SHOWN);
  const { email } = turma.teacher;

  const copyEmail = (address: string) => {
    const copied = () => toast.success(t("emailCopied"));
    const failed = () => toast.error(t("copyFailed"));
    try {
      navigator.clipboard.writeText(address).then(copied, failed);
    } catch {
      failed(); // no clipboard outside a secure context
    }
  };

  return (
    <div className="flex flex-col gap-6 p-5 sm:p-8">
      <header className="flex min-w-0 flex-col items-start gap-1.5 pr-10">
        <p className="max-w-full truncate text-sm text-muted-foreground">
          {formatSubject(turma.subjectKey, turma.subjectLabel, countryCode)} · {t("yearLabel", { grade: turma.grade })}
        </p>
        <SheetTitle className="max-w-full wrap-anywhere text-3xl font-bold tracking-tight">
          {formatClass(turma.grade, turma.classLabel, locale, countryCode)}
        </SheetTitle>
        <StatePill state={turma.state} lessonsBehind={turma.lessonsBehind} />
      </header>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="text-foreground">{t("executionLabel")}</span>
          <span className="font-semibold tabular-nums text-foreground">
            {turma.executionPercent === null ? "—" : `${turma.executionPercent}%`}
          </span>
        </div>
        {/* The track takes the state's tint, the fill its colour. */}
        <div aria-hidden className={cn("h-2.5 overflow-hidden rounded-full", STATE_CLASSES[turma.state])}>
          <div className="h-full rounded-full bg-current" style={{ width: `${turma.executionPercent ?? 0}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Kpi value={turma.lessonsBehind} label={t("kpiBehind", { count: turma.lessonsBehind })} />
        <Kpi value={missedLessons.length} label={t("kpiMissed", { count: missedLessons.length })} />
        <Kpi
          value={nextAssessment ? shortDay(nextAssessment.date, locale) : "—"}
          label={t("nextTest")}
          title={
            nextAssessment
              ? [day(nextAssessment.date), nextAssessment.topicTitle].filter(Boolean).join(" · ")
              : undefined
          }
        />
      </div>

      {missedLessons.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <SectionTitle>{t("missedTitle")}</SectionTitle>
          <ol>
            {shownMissed.map((lesson) => (
              <MissedItem key={lesson.slotId} lesson={lesson} locale={locale} />
            ))}
          </ol>
          {missedLessons.length > TIMELINE_SHOWN && (
            <MoreButton expanded={allMissed} onClick={() => setAllMissed((open) => !open)}>
              {allMissed ? t("showLess") : t("showMore", { count: missedLessons.length - TIMELINE_SHOWN })}
            </MoreButton>
          )}
        </section>
      )}

      {behindTopics.length > 0 && (
        <section className="flex flex-col gap-2">
          <SectionTitle>{t("behindTitle")}</SectionTitle>
          <ul className="flex flex-wrap gap-1.5">
            {shownBehind.map((topic, i) => {
              // Behind with no whole lesson missing: part of it was left from a lesson that stopped halfway.
              const partly = topic.lessonsBehind === 0;
              const full = [topic.label, t("plannedFor", { date: day(topic.plannedDate) }), partly && t("partlyLeft")]
                .filter(Boolean)
                .join(" · ");
              return (
                <li
                  key={i}
                  title={full}
                  className={cn(
                    "flex min-w-0 max-w-full items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs text-foreground",
                    partly ? "border-dashed" : "bg-muted",
                  )}
                >
                  <span className="max-w-56 truncate">{topic.label}</span>
                  {partly && <span className="shrink-0 text-muted-foreground">· {t("partlyLeft")}</span>}
                </li>
              );
            })}
            {behindTopics.length > BEHIND_SHOWN && (
              <li>
                <button
                  type="button"
                  aria-expanded={allBehind}
                  onClick={() => setAllBehind((open) => !open)}
                  className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {allBehind ? t("showLess") : `+${behindTopics.length - BEHIND_SHOWN}`}
                </button>
              </li>
            )}
          </ul>
        </section>
      )}

      {difficulties.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <SectionTitle>{t("difficultiesTitle")}</SectionTitle>
          <ul className="flex flex-col gap-2 text-sm">
            {difficulties.map((difficulty) => (
              <li key={difficulty.outcomeId} className="min-w-0">
                <span className="line-clamp-2 wrap-anywhere text-foreground" title={difficulty.text}>
                  {difficulty.text}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t("flagged", { count: difficulty.difficultyCount })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {teacherPlan && (
        <details className="group rounded-xl border border-border">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-3.5 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 truncate">
              <span className="font-medium text-foreground">{t("planTitle")}</span>
              <span className="text-muted-foreground">
                {" · "}
                {teacherPlan.status === "pending"
                  ? t("planPending", { date: day(teacherPlan.createdAt) })
                  : t("planAdjusted", { date: day(teacherPlan.decidedAt ?? teacherPlan.createdAt) })}
              </span>
            </span>
            <ChevronDown
              className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          {/* The summary was written to the teacher ("you ran out of time…"): show it as that message, quoted. */}
          {teacherPlan.summary && (
            <figure className="px-3.5 pb-3.5">
              <blockquote className="whitespace-pre-line wrap-anywhere border-l-2 border-primary/30 pl-3 text-sm italic text-foreground">
                “{teacherPlan.summary}”
              </blockquote>
              <figcaption className="mt-1.5 text-xs text-muted-foreground">{t("planSummaryLabel")}</figcaption>
            </figure>
          )}
        </details>
      )}

      <div className="flex items-center gap-3 rounded-xl bg-muted p-3 text-sm">
        <div className="min-w-0 flex-1">
          <TeacherContact teacher={turma.teacher} />
        </div>
        {email && (
          <Button size="sm" variant="outline" className="shrink-0" onClick={() => copyEmail(email)}>
            <Copy aria-hidden />
            {t("copyEmail")}
          </Button>
        )}
      </div>
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
            <DrawerBody key={current.id} detail={current.detail} />
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
