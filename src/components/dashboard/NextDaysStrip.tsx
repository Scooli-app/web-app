"use client";

import { objectiveItems } from "@/components/dashboard/weekWindow";
import type { MyWeekClass, MyWeekLesson } from "@/shared/types/my-week";
import { cn } from "@/shared/utils/utils";
import { useTranslations } from "next-intl";

export interface StripLesson {
  klass: MyWeekClass;
  lesson: MyWeekLesson;
}

interface NextDaysStripProps {
  days: string[];
  lessonsByDay: Map<string, StripLesson[]>;
  locale: string;
  classLabel: (klass: MyWeekClass) => string;
  onOpen: (item: StripLesson) => void;
}

/** A day tile lists this many lessons; the rest are counted ("+3 aulas") and live in the pop-ups. */
const MAX_PER_DAY = 2;

/** The days after today at a glance: one column per day, topics only, turma colour dots. */
export function NextDaysStrip({ days, lessonsByDay, locale, classLabel, onOpen }: NextDaysStripProps) {
  const t = useTranslations("yourWeek");
  // One or two days leave the row mostly empty: give each lesson room for its turma, numbering and first objective.
  const roomy = days.length <= 2;
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" });

  return (
    // One row of equal, fixed-height tiles that scrolls sideways on a phone: however many turmas
    // there are, the strip never makes the dashboard taller. 5 or 6 days (the focus day is above).
    <div
      className={cn(
        "-mx-1 grid grid-flow-col gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]",
        roomy ? "auto-cols-[minmax(14rem,1fr)]" : "auto-cols-[minmax(8.5rem,1fr)]",
      )}
    >
      {days.map((iso) => {
        const date = new Date(`${iso}T00:00:00`);
        const items = lessonsByDay.get(iso) ?? [];
        const empty = items.length === 0;
        return (
          <div
            key={iso}
            // On a phone an empty day isn't worth a tile.
            className={cn("overflow-hidden rounded-xl p-2.5", !roomy && "h-[6.5rem]", empty ? "bg-muted/50" : "bg-background")}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {weekday.format(date).replace(".", "").slice(0, 3)} {date.getDate()}
            </p>
            {empty ? (
              <p className="mt-1.5 text-xs text-muted-foreground">{t("noLessonsDay")}</p>
            ) : (
              <ul className="mt-1.5 space-y-1">
                {items.slice(0, roomy ? 3 : MAX_PER_DAY).map((item) => {
                  const objective = roomy ? objectiveItems(item.lesson.description)[0] : undefined;
                  const meta = roomy
                    ? [
                        item.lesson.sequenceNumber ? t("lessonNumber", { number: item.lesson.sequenceNumber }) : null,
                        item.lesson.durationMinutes ? t("lessonMinutes", { minutes: item.lesson.durationMinutes }) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : "";
                  return (
                    <li key={item.lesson.id}>
                      <button
                        type="button"
                        onClick={() => onOpen(item)}
                        className="flex w-full items-start gap-1.5 rounded text-left text-xs leading-snug text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <span
                          aria-hidden
                          className="mt-1 h-2 w-2 shrink-0 rounded-full"
                          style={{ background: item.klass.color || "#7F77DD" }}
                        />
                        <span className="min-w-0 flex-1">
                          {roomy && (
                            <span className="flex items-baseline justify-between gap-3 text-muted-foreground">
                              <span className="truncate">{classLabel(item.klass)}</span>
                              <span className="shrink-0">{meta}</span>
                            </span>
                          )}
                          <span className={cn("line-clamp-1 wrap-anywhere", roomy && "mt-0.5 text-sm font-semibold")} title={item.lesson.topicTitle}>
                            {item.lesson.topicTitle}
                          </span>
                          {objective && <span className="mt-0.5 line-clamp-2 block text-muted-foreground wrap-anywhere">{objective}</span>}
                        </span>
                      </button>
                    </li>
                  );
                })}
                {items.length > (roomy ? 3 : MAX_PER_DAY) && (
                  <li className="text-xs font-medium text-muted-foreground">
                    {t("moreLessons", { count: items.length - (roomy ? 3 : MAX_PER_DAY) })}
                  </li>
                )}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
