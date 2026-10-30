"use client";

import { translateSubject } from "@/components/document-creation/constants";
import { Routes } from "@/shared/types/routes";
import { formatClassName } from "@/shared/utils/className";
import type { TurmaReviewCount } from "@/shared/types/review-feed";
import Link from "next/link";
import { useTranslations } from "next-intl";

/** The chips themselves. Presentational, so the list can be rendered and checked on its own. */
export function ReviewFeedChipsView({ turmas }: { turmas: TurmaReviewCount[] }) {
  const t = useTranslations("reviewFeed");
  const tTimetable = useTranslations("timetable");
  if (turmas.length === 0) return null;
  const name = (turma: TurmaReviewCount) =>
    turma.subject && (turma.gradeLevel || turma.classLabel)
      ? formatClassName(
          { gradeLevel: turma.gradeLevel, subject: turma.subject, classLabel: turma.classLabel, title: turma.turmaTitle },
          { gradeShort: (grade) => tTimetable("gradeShort", { grade }), subject: translateSubject },
        )
      : turma.turmaTitle;

  return (
    <ul className="flex flex-wrap gap-2">
      {turmas.map((turma) => (
        <li key={turma.timetableId}>
          <Link
            href={`${Routes.CALENDAR}/${turma.timetableId}#por-rever`}
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-primary/10"
          >
            <span className="max-w-[12rem] truncate">{name(turma)}</span>
            <span className="text-primary">{t("chip", { count: turma.count })}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
