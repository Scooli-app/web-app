"use client";

import type { StripLesson } from "@/components/dashboard/NextDaysStrip";
import { Routes } from "@/shared/types";
import type { MyWeekClass, MyWeekLesson } from "@/shared/types/my-week";
import { cn } from "@/shared/utils/utils";
import { Check, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

/** Rows shown before "Ver as N aulas": the card keeps one height however busy the day is. */
const MAX_ROWS = 3;

/** A lesson counts as ready once it has its plan (written in the week or made in the form). */
export function isLessonReady(lesson: MyWeekLesson): boolean {
  return (
    lesson.status === "completed" ||
    lesson.documents.some((d) => d.role === "lessonPlan" && d.status !== "failed")
  );
}

interface FocusDayListProps {
  lessons: StripLesson[];
  classLabel: (klass: MyWeekClass) => string;
  onOpen: (item: StripLesson) => void;
  /** Monday of the focus day's week, for "Ver todas no calendário". */
  weekStart: string;
}

/**
 * A day with several lessons, summarised: how many are ready, a few rows (turma, topic, state),
 * and the rest one click away in the calendar. Each row opens the lesson's pop-up.
 */
export function FocusDayList({ lessons, classLabel, onOpen, weekStart }: FocusDayListProps) {
  const t = useTranslations("yourWeek");
  const ready = lessons.filter((item) => isLessonReady(item.lesson)).length;
  const toPrepare = lessons.length - ready;

  return (
    <div className="rounded-xl bg-background p-2 sm:p-3">
      <p className="px-1 pb-1.5 text-xs font-medium text-muted-foreground">
        {[
          ready > 0 ? t("dayReady", { count: ready }) : null,
          toPrepare > 0 ? t("dayToPrepare", { count: toPrepare }) : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <ul>
        {lessons.slice(0, MAX_ROWS).map((item, index) => {
          const isReady = isLessonReady(item.lesson);
          return (
            // On a short phone screen the third row gives way, so the dashboard still needs no scroll.
            <li key={item.lesson.id} className={index === 2 ? "[@media(max-height:720px)]:hidden" : undefined}>
              <button
                type="button"
                onClick={() => onOpen(item)}
                className="flex w-full min-w-0 items-center gap-2 rounded-lg px-1.5 py-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.klass.color || "#7F77DD" }} />
                <span className="hidden w-36 shrink-0 truncate text-xs text-muted-foreground sm:block">
                  {classLabel(item.klass)}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium text-foreground">{item.lesson.topicTitle}</span>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                    isReady ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                  )}
                >
                  {isReady && <Check className="h-3 w-3" aria-hidden />}
                  {isReady ? t("ready") : t("toPrepare")}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {lessons.length > 2 && (
        <Link
          href={`${Routes.CALENDAR}?week=${weekStart}`}
          className="mt-1 flex items-center gap-0.5 rounded-lg px-1.5 py-1.5 text-xs font-semibold text-primary hover:bg-muted"
        >
          {t("seeAllInCalendar", { count: lessons.length })}
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}
