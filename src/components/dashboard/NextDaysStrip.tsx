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

/** The days after today at a glance: one column per day, topics only, turma colour dots. */
export function NextDaysStrip({ days, lessonsByDay, locale, onOpen }: NextDaysStripProps) {
  const t = useTranslations("yourWeek");
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" });

  return (
    // auto-fit: the strip may hold 5 or 6 days (the focus day is shown in full above it).
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-flow-col lg:auto-cols-fr lg:grid-cols-none">
      {days.map((iso) => {
        const date = new Date(`${iso}T00:00:00`);
        const items = lessonsByDay.get(iso) ?? [];
        const empty = items.length === 0;
        return (
          <div
            key={iso}
            // On a phone an empty day isn't worth a tile.
            className={cn("min-h-[5.5rem] rounded-xl p-2.5", empty ? "hidden bg-muted/50 sm:block" : "bg-background")}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {weekday.format(date).replace(".", "").slice(0, 3)} {date.getDate()}
            </p>
            {empty ? (
              <p className="mt-1.5 text-xs text-muted-foreground">{t("noLessonsDay")}</p>
            ) : (
              <ul className="mt-1.5 space-y-1">
                {items.map((item) => (
                  <li key={item.lesson.id}>
                    <button
                      type="button"
                      onClick={() => onOpen(item)}
                      className="flex w-full items-start gap-1.5 rounded text-left text-xs leading-snug text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:text-sm"
                    >
                      <span
                        aria-hidden
                        className="mt-1 h-2 w-2 shrink-0 rounded-full"
                        style={{ background: item.klass.color || "#7F77DD" }}
                      />
                      <span className="line-clamp-2">{item.lesson.topicTitle}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
