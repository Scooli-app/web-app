"use client";

import type { LessonSlot } from "@/shared/types/timetable";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import SlotCard from "./SlotCard";

const DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toIsoDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

interface TimetableCalendarProps {
  lessons: LessonSlot[];
  onWeekChange?: (weekStart: string) => void;
  onGenerate?: (sessionId: string, lessonId: string) => void;
  onSkip?: (sessionId: string, lessonId: string) => void;
  onViewDocument?: (documentId: string) => void;
  sessionId: string;
  generatingLesson?: string | null;
  linkedDocuments?: Record<string, string>; // lessonId -> documentId
  slotColors?: Record<string, string>;       // timetableSlotId -> color
}

export default function TimetableCalendar({
  lessons,
  onWeekChange,
  onGenerate,
  onSkip,
  onViewDocument,
  sessionId,
  generatingLesson,
  linkedDocuments = {},
  slotColors = {},
}: TimetableCalendarProps) {
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const lessonsByDate = useMemo(() => {
    const map: Record<string, LessonSlot[]> = {};
    for (const lesson of lessons) {
      if (!map[lesson.slotDate]) map[lesson.slotDate] = [];
      map[lesson.slotDate].push(lesson);
    }
    return map;
  }, [lessons]);

  const goToPrevWeek = () => {
    const prev = new Date(weekStart);
    prev.setDate(prev.getDate() - 7);
    setWeekStart(prev);
    onWeekChange?.(toIsoDate(prev));
  };

  const goToNextWeek = () => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + 7);
    setWeekStart(next);
    onWeekChange?.(toIsoDate(next));
  };

  const goToToday = () => {
    const today = getMonday(new Date());
    setWeekStart(today);
    onWeekChange?.(toIsoDate(today));
  };

  const weekLabel = `${weekDates[0].toLocaleDateString("pt-PT", { day: "numeric", month: "short" })} – ${weekDates[6].toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" })}`;

  return (
    <div className="flex flex-col gap-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToPrevWeek}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            aria-label="Semana anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium min-w-[180px] text-center">{weekLabel}</span>
          <button
            type="button"
            onClick={goToNextWeek}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            aria-label="Próxima semana"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={goToToday}
          className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors"
        >
          Hoje
        </button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDates.map((date, i) => {
          const isoDate = toIsoDate(date);
          const dayLessons = lessonsByDate[isoDate] ?? [];
          const isToday = toIsoDate(new Date()) === isoDate;

          return (
            <div key={isoDate} className="flex flex-col gap-1 min-h-[120px]">
              {/* Day header */}
              <div
                className={`text-center py-1 rounded-md text-xs font-medium ${
                  isToday
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }`}
              >
                <div>{DAYS[i].slice(0, 3)}</div>
                <div className="text-sm font-bold">{date.getDate()}</div>
              </div>

              {/* Lesson slots */}
              <div className="flex flex-col gap-1.5">
                {dayLessons
                  .sort((a, b) => (a.slotStartTime ?? "").localeCompare(b.slotStartTime ?? ""))
                  .map((lesson) => (
                    <SlotCard
                      key={lesson.id}
                      lesson={lesson}
                      color={lesson.timetableSlotId ? slotColors[lesson.timetableSlotId] : undefined}
                      isGenerating={generatingLesson === lesson.id}
                      linkedDocumentId={linkedDocuments[lesson.id]}
                      onGenerate={(lessonId) => onGenerate?.(sessionId, lessonId)}
                      onSkip={(lessonId) => onSkip?.(sessionId, lessonId)}
                      onViewDocument={onViewDocument}
                    />
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
