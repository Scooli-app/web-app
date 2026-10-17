"use client";

import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { translateSubject } from "@/components/document-creation/constants";
import { meService } from "@/services/api/me.service";
import { toIso } from "@/shared/utils/calendar";
import { formatClassName } from "@/shared/utils/className";
import { CalendarDays } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { lessonChoices, type LessonChoice } from "../lessonPicker";

/** How far ahead the picker looks: this week and the next. */
const WINDOW_DAYS = 14;
const NONE = "__none__";

interface LessonSectionProps {
  documentType: string;
  selectedLessonId: string | null;
  onChange: (choice: LessonChoice | null) => void;
  /** A lesson to select once the list arrives (the form was opened from that lesson). */
  initialLessonId?: string | null;
}

/**
 * "Para que aula?": the teacher's lessons for the next two weeks, so a document made here lands in
 * its turma and lesson instead of "Sem turma". Optional, and hidden when there are no lessons.
 */
export function LessonSection({ documentType, selectedLessonId, onChange, initialLessonId }: LessonSectionProps) {
  const t = useTranslations("documentCreation.lesson");
  const tTimetable = useTranslations("timetable");
  const locale = useLocale();
  const [choices, setChoices] = useState<LessonChoice[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    meService
      .getWindow(toIso(new Date()), WINDOW_DAYS)
      .then((week) => {
        if (cancelled) return;
        const list = lessonChoices(week, documentType);
        setChoices(list);
        const initial = initialLessonId ? list.find((c) => c.lessonId === initialLessonId && !c.disabled) : null;
        if (initial) onChange(initial);
      })
      .catch(() => {
        if (!cancelled) setChoices([]); // the form works without it: the document just has no turma
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentType, initialLessonId]);

  if (!choices || choices.length === 0) return null;

  const day = (iso: string) => {
    const date = new Date(`${iso}T00:00:00`);
    const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date).replace(/\./g, "");
    return `${weekday.slice(0, 3)} ${date.getDate()}`;
  };
  const className = (choice: LessonChoice) =>
    formatClassName(choice.klass, {
      gradeShort: (grade) => tTimetable("gradeShort", { grade }),
      subject: translateSubject,
    });

  return (
    <Card className="border-border p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent sm:h-10 sm:w-10 sm:rounded-xl">
            <CalendarDays className="h-4 w-4 text-primary sm:h-5 sm:w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground sm:text-lg">{t("title")}</h2>
            <p className="text-xs text-muted-foreground sm:text-sm">{t("description")}</p>
          </div>
        </div>
        <Select
          value={selectedLessonId ?? NONE}
          onValueChange={(v) => onChange(v === NONE ? null : choices.find((c) => c.lessonId === v) ?? null)}
        >
          <SelectTrigger className="h-11 w-full sm:w-80" aria-label={t("title")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>{t("none")}</SelectItem>
            {choices.map((choice) => (
              <SelectItem key={choice.lessonId} value={choice.lessonId} disabled={choice.disabled}>
                <span className="tabular-nums text-muted-foreground">{day(choice.slotDate)}</span>
                {" · "}
                {className(choice)} · {choice.topicTitle}
                {choice.disabled ? ` (${t("alreadyHas")})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </Card>
  );
}
