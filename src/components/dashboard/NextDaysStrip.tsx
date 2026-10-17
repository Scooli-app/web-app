"use client";

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
  onOpen: (item: StripLesson) => void;
}

/** A day tile lists this many lessons; the rest are counted ("+3 aulas") and live in the pop-ups. */
const MAX_PER_DAY = 2;

/** The days after today at a glance: one column per day, topics only, turma colour dots. */
export function NextDaysStrip({ days, lessonsByDay, locale, onOpen }: NextDaysStripProps) {
  const t = useTranslations("yourWeek");
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" });

  return (
    // One row of equal, fixed-height tiles that scrolls sideways on a phone: however many turmas
    // there are, the strip never makes the dashboard taller. 5 or 6 days (the focus day is above).
    <div className="-mx-1 grid auto-cols-[minmax(8.5rem,1fr)] grid-flow-col gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
      {days.map((iso) => {
        const date = new Date(`${iso}T00:00:00`);
        const items = lessonsByDay.get(iso) ?? [];
        const empty = items.length === 0;
        return (
          <div
            key={iso}
            // On a phone an empty day isn't worth a tile.
            className={cn("h-[6.5rem] overflow-hidden rounded-xl p-2.5", empty ? "bg-muted/50" : "bg-background")}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {weekday.format(date).replace(".", "").slice(0, 3)} {date.getDate()}
            </p>
            {empty ? (
              <p className="mt-1.5 text-xs text-muted-foreground">{t("noLessonsDay")}</p>
            ) : (
              <ul className="mt-1.5 space-y-1">
                {items.slice(0, MAX_PER_DAY).map((item) => (
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
                      <span className="line-clamp-1 min-w-0 wrap-anywhere" title={item.lesson.topicTitle}>{item.lesson.topicTitle}</span>
                    </button>
                  </li>
                ))}
                {items.length > MAX_PER_DAY && (
                  <li className="text-xs font-medium text-muted-foreground">
                    {t("moreLessons", { count: items.length - MAX_PER_DAY })}
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
