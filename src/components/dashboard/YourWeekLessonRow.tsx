"use client";

import { Badge } from "@/components/ui/badge";
import { SLOT_STATUS_CONFIG } from "@/shared/constants/lessonSlotStatus";
import { Routes } from "@/shared/types";
import type { MyWeekLesson } from "@/shared/types/my-week";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface YourWeekLessonRowProps {
  lesson: MyWeekLesson;
  locale: string;
}

/** One lesson of the week: weekday, topic and a status pill; completed lessons open their document. */
export function YourWeekLessonRow({ lesson, locale }: YourWeekLessonRowProps) {
  const t = useTranslations("yourWeek");
  const tTimetable = useTranslations("timetable");
  const cfg = SLOT_STATUS_CONFIG[lesson.status];

  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
    new Date(`${lesson.slotDate}T00:00:00`),
  );
  const topic = lesson.topicTitle || t("noTopic");
  const href =
    lesson.status === "completed" && lesson.documentId
      ? `${Routes.LESSON_PLAN}/${lesson.documentId}`
      : null;

  const content = (
    <>
      <span className="w-10 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {weekday}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{topic}</span>
      <Badge className={`shrink-0 gap-1 border text-xs ${cfg.badgeCls}`}>
        {cfg.icon}
        {tTimetable(`status.${lesson.status}`)}
      </Badge>
    </>
  );

  const base = "flex items-center gap-3 rounded-lg px-2 py-1.5";
  return href ? (
    <Link
      href={href}
      className={`${base} transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
    >
      {content}
    </Link>
  ) : (
    <div className={base}>{content}</div>
  );
}
