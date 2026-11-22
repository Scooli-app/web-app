"use client";

import type { DirectionLastLesson } from "@/shared/types/school-direction";
import { useLocale, useTranslations } from "next-intl";
import { formatDay } from "./format";

/** How a class's last lessons went, newest first: the date, topic, how it went and the teacher's note. */
export function ClassHistory({ history }: { history: DirectionLastLesson[] }) {
  const t = useTranslations("schoolDirection.substitutions");
  const locale = useLocale();
  if (history.length === 0) {
    return <p className="mt-1.5 text-sm text-foreground">{t("leftOffNone")}</p>;
  }
  return (
    <ol className="mt-1.5 flex flex-col gap-3">
      {history.map((lesson, i) => {
        const status = t.has(`status.${lesson.teachingStatus}`)
          ? t(`status.${lesson.teachingStatus}`)
          : lesson.teachingStatus;
        return (
          <li key={`${lesson.date}-${i}`}>
            <p className="text-sm font-medium text-foreground">
              {[formatDay(lesson.date, locale), lesson.topicTitle, status].filter(Boolean).join(" · ")}
            </p>
            {lesson.note && <p className="mt-0.5 whitespace-pre-line text-sm text-foreground">“{lesson.note}”</p>}
          </li>
        );
      })}
    </ol>
  );
}
