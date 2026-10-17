"use client";

import { LessonDocumentChips, writeLessonPlan } from "@/components/dashboard/LessonDocumentChips";
import { usePrepareLessonSet } from "@/components/dashboard/usePrepareLessonSet";
import { isDocumentInProgress, objectiveItems } from "@/components/dashboard/weekWindow";
import { Button } from "@/components/ui/button";
import type { MyWeekClass, MyWeekLesson } from "@/shared/types/my-week";
import { useAppDispatch } from "@/store/hooks";
import { useAuth } from "@clerk/nextjs";
import { Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

interface LessonDetailBlockProps {
  klass: MyWeekClass;
  className: string;
  lesson: MyWeekLesson;
  onOpen: () => void;
  onChanged: () => void;
}

/** One of the focus day's lessons: turma, topic, objectives, its documents and what can be added. */
export function LessonDetailBlock({ klass, className, lesson, onOpen, onChanged }: LessonDetailBlockProps) {
  const t = useTranslations("yourWeek");
  const tDialog = useTranslations("calendar.slotDialog");
  const dispatch = useAppDispatch();
  const { getToken } = useAuth();
  // Same suggestion as the lesson pop-up, so the card and the pop-up never disagree.
  const { suggested, label, preparing, prepare } = usePrepareLessonSet({
    timetableId: klass.timetableId,
    lessonId: lesson.id,
    slotDate: lesson.slotDate,
    slotType: lesson.slotType,
    subject: klass.subject,
    documents: lesson.documents,
    ready: lesson.status !== "generating" && !lesson.documents.some((d) => isDocumentInProgress(d.status)),
    generatePlan: () => writeLessonPlan(klass.timetableId, lesson.id, t, dispatch, getToken),
    onDone: onChanged,
    surface: "dashboard",
  });
  const objectives = objectiveItems(lesson.description);
  const meta = [
    lesson.sequenceNumber ? t("lessonNumber", { number: lesson.sequenceNumber }) : null,
    lesson.durationMinutes ? t("lessonMinutes", { minutes: lesson.durationMinutes }) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="rounded-xl bg-background p-3 sm:p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground sm:text-sm">
          <span
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: klass.color || "#7F77DD" }}
          />
          <span className="truncate">{className}</span>
        </p>
        {meta && <span className="shrink-0 text-xs text-muted-foreground">{meta}</span>}
      </div>
      <button
        type="button"
        onClick={onOpen}
        title={lesson.topicTitle}
        className="mt-1 line-clamp-2 block wrap-anywhere text-left text-base font-semibold leading-snug text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:text-lg"
      >
        {lesson.topicTitle}
      </button>
      {objectives.length > 0 ? (
        <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm text-muted-foreground marker:text-primary/60">
          {objectives.slice(0, 3).map((item) => (
            <li key={item} className="line-clamp-1 wrap-anywhere">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">{t("noObjectivesYet")}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {(suggested.length > 0 || preparing) && (
          <Button size="sm" className="h-8 rounded-full" disabled={preparing} onClick={() => void prepare()}>
            {preparing ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="mr-1 h-3.5 w-3.5" aria-hidden />
            )}
            {preparing ? tDialog("generating") : label}
          </Button>
        )}
        <LessonDocumentChips timetableId={klass.timetableId} lesson={lesson} onChanged={onChanged} planAsChip />
      </div>
    </article>
  );
}
