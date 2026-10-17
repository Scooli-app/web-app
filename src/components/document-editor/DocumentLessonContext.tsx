"use client";

import { translateSubject } from "@/components/document-creation/constants";
import { listLessonDocuments, type LessonDocument } from "@/services/api/timetable.service";
import { Routes } from "@/shared/types";
import type { DocumentClassInfo } from "@/shared/types/document";
import { getWeekStart, toIso } from "@/shared/utils/calendar";
import { formatClassName } from "@/shared/utils/className";
import { ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";

const DOCUMENT_ROUTES: Record<string, string> = {
  lessonPlan: Routes.LESSON_PLAN,
  worksheet: Routes.WORKSHEET,
  quiz: Routes.QUIZ,
  presentation: Routes.PRESENTATION,
  test: Routes.TEST,
};

interface DocumentLessonContextProps {
  classInfo: DocumentClassInfo | null | undefined;
  documentId: string;
}

/**
 * Above an editor's title: which turma, lesson and day this document is for (opening that lesson
 * in the calendar), and the lesson's other documents, so the teacher never has to go back to find them.
 */
export function DocumentLessonContext({ classInfo, documentId }: DocumentLessonContextProps) {
  const t = useTranslations("editor.lessonContext");
  const tWeek = useTranslations("yourWeek");
  const tTimetable = useTranslations("timetable");
  const locale = useLocale();
  const [siblings, setSiblings] = useState<LessonDocument[]>([]);
  const timetableId = classInfo?.timetableId;
  const lessonId = classInfo?.lessonId;

  useEffect(() => {
    setSiblings([]);
    if (!timetableId || !lessonId) return;
    let cancelled = false;
    listLessonDocuments(timetableId, lessonId)
      .then((docs) => {
        if (!cancelled) {
          setSiblings(docs.filter((d) => d.documentId !== documentId && d.status !== "failed"));
        }
      })
      .catch(() => {
        /* the context line still shows; only the sibling chips are missing */
      });
    return () => {
      cancelled = true;
    };
  }, [timetableId, lessonId, documentId]);

  if (!classInfo || !lessonId) return null;

  const turma = formatClassName(
    { gradeLevel: classInfo.gradeLevel, subject: classInfo.subject, classLabel: classInfo.classLabel, title: classInfo.title },
    { gradeShort: (grade) => tTimetable("gradeShort", { grade }), subject: translateSubject },
  );
  const date = classInfo.lessonDate ? new Date(`${classInfo.lessonDate}T00:00:00`) : null;
  const dateLabel = date
    ? new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" })
        .format(date)
        .replace(/\./g, "")
    : null;
  const parts = [
    turma,
    classInfo.lessonNumber ? t("lessonNumber", { number: classInfo.lessonNumber }) : null,
    dateLabel,
  ].filter(Boolean);
  const week = date ? toIso(getWeekStart(date)) : null;
  const lessonHref = `${Routes.CALENDAR}?${new URLSearchParams({
    ...(week ? { week } : {}),
    lesson: lessonId,
  }).toString()}`;

  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
      <Link
        href={lessonHref}
        className="inline-flex min-w-0 items-center gap-1.5 font-medium text-muted-foreground hover:text-primary"
        title={t("openLesson")}
      >
        <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: classInfo.color || "#7F77DD" }} />
        <span className="truncate">{parts.join(" · ")}</span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
      </Link>
      {siblings.length > 0 && (
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{t("alsoHas")}</span>
          {siblings.map((doc) => {
            const type = doc.documentType ?? doc.documentRole;
            return (
              <Link
                key={doc.documentId}
                href={`${DOCUMENT_ROUTES[type] ?? Routes.DOCUMENTS}/${doc.documentId}`}
                className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary hover:bg-primary/20"
              >
                {tWeek.has(`types.${doc.documentRole}`) ? tWeek(`types.${doc.documentRole}`) : doc.title}
              </Link>
            );
          })}
        </span>
      )}
    </div>
  );
}
