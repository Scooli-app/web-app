"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { translateSubject } from "@/components/document-creation/constants";
import { Routes } from "@/shared/types";
import { selectIsHorarioPlanosEnabled } from "@/store/features/selectors";
import { useAppSelector } from "@/store/hooks";
import { meService } from "@/services/api/me.service";
import { toIso } from "@/shared/utils/calendar";
import { formatClassName } from "@/shared/utils/className";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import { lessonChoices, type LessonChoice } from "../lessonPicker";
import { FieldHeading, FormCard } from "./FormCard";

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
  const [loadFailed, setLoadFailed] = useState(false);
  const isTimetableEnabled = useAppSelector(selectIsHorarioPlanosEnabled);

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
        if (!cancelled) {
          setChoices([]); // the form works without it: the document just has no turma
          setLoadFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentType, initialLessonId]);

  if (!choices) return null;

  if (choices.length === 0) {
    // Optional field: stay quiet on a failed fetch or when the timetable feature is off.
    if (loadFailed || !isTimetableEnabled) return null;
    return (
      <FormCard>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
          <div className="min-w-0 sm:w-44 sm:shrink-0">
            <FieldHeading title={t("title")} optional className="mb-0" />
          </div>
          <p className="text-sm text-muted-foreground">
            {t("emptyHint")}{" "}
            <Link href={Routes.CALENDAR} className="font-medium text-primary hover:underline">
              {t("emptyLink")}
            </Link>
          </p>
        </div>
      </FormCard>
    );
  }

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
    <FormCard>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div className="min-w-0 sm:w-44 sm:shrink-0">
          <FieldHeading title={t("title")} optional className="mb-0" />
        </div>
        <Select
          value={selectedLessonId ?? NONE}
          onValueChange={(v) => onChange(v === NONE ? null : choices.find((c) => c.lessonId === v) ?? null)}
        >
          <SelectTrigger className="h-10 w-full min-w-0 sm:flex-1" aria-label={t("title")}>
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
    </FormCard>
  );
}
