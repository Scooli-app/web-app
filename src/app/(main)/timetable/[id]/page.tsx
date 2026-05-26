"use client";

import { use, useCallback, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/store";
import {
  fetchSession,
  fetchSlots,
  fetchLessons,
  generateTimetableTopics,
  generateTimetableLesson,
  skipTimetableLesson,
} from "@/store/timetable/timetableSlice";
import TimetableCalendar from "@/components/timetable/TimetableCalendar";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";

interface TimetableDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function TimetableDetailPage({ params }: TimetableDetailPageProps) {
  const { id } = use(params);
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();

  const {
    currentSession,
    slots,
    lessons,
    isLoadingSession,
    isLoadingLessons,
    generatingLesson,
    isGeneratingTopics,
    error,
  } = useSelector((state: RootState) => state.timetable);

  useEffect(() => {
    if (id) {
      dispatch(fetchSession(id));
      dispatch(fetchSlots(id));
      dispatch(fetchLessons({ sessionId: id }));
    }
  }, [dispatch, id]);

  const handleWeekChange = useCallback(
    (weekStart: string) => {
      dispatch(fetchLessons({ sessionId: id, weekStart }));
    },
    [dispatch, id]
  );

  const handleGenerate = useCallback(
    (_sessionId: string, lessonId: string) => {
      dispatch(generateTimetableLesson({ sessionId: id, lessonId, request: {} }));
    },
    [dispatch, id]
  );

  const handleSkip = useCallback(
    (_sessionId: string, lessonId: string) => {
      dispatch(skipTimetableLesson({ sessionId: id, lessonId }));
    },
    [dispatch, id]
  );

  const handleViewDocument = useCallback(
    (documentId: string) => {
      router.push(`/lesson-plan/${documentId}`);
    },
    [router]
  );

  const handleGenerateTopics = useCallback(() => {
    dispatch(generateTimetableTopics(id));
  }, [dispatch, id]);

  // Build a map from lessonId -> documentId from lesson documents
  const linkedDocuments = useMemo(() => {
    const map: Record<string, string> = {};
    for (const lesson of lessons) {
      if (lesson.documents && lesson.documents.length > 0) {
        map[lesson.id] = lesson.documents[0].documentId;
      }
    }
    return map;
  }, [lessons]);

  // Build a map from timetableSlotId -> color
  const slotColors = useMemo(() => {
    const map: Record<string, string> = {};
    for (const slot of slots) {
      if (slot.color) {
        map[slot.id] = slot.color;
      }
    }
    return map;
  }, [slots]);

  const isLoading = isLoadingSession || isLoadingLessons;

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/timetable")}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {currentSession?.title ?? "Horário"}
            </h1>
            {currentSession?.schoolYearLabel && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {currentSession.schoolYearLabel}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerateTopics}
          disabled={isGeneratingTopics || isLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isGeneratingTopics ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {isGeneratingTopics ? "A gerar tópicos…" : "Gerar tópicos"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Calendar */}
      {isLoading && lessons.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <TimetableCalendar
          lessons={lessons}
          sessionId={id}
          onWeekChange={handleWeekChange}
          onGenerate={handleGenerate}
          onSkip={handleSkip}
          onViewDocument={handleViewDocument}
          generatingLesson={generatingLesson}
          linkedDocuments={linkedDocuments}
          slotColors={slotColors}
        />
      )}
    </div>
  );
}
