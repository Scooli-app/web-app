"use client";

import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SlotDialog } from "@/components/calendar/SlotDialog";
import { patchOpenSlot } from "@/components/dashboard/patchOpenSlot";
import {
  generateLesson as generateLessonStream,
  getTimetable,
  listLessons,
  regenerateLesson as regenerateLessonStream,
  updateLesson as updateLessonService,
  type LessonSlot,
  type LessonSlotType,
} from "@/services/api/timetable.service";
import type { SlotWithTimetable } from "@/shared/types/calendar";
import { isUpgradeReason } from "@/shared/types/plan-limits";
import { generationStore } from "@/store/generationStore";
import { useAppDispatch } from "@/store/hooks";
import { openUpgradeModalForReason, setUpgradeModalOpen } from "@/store/ui/uiSlice";
import { useAuth } from "@clerk/nextjs";
import posthog from "posthog-js";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

export interface WeekLessonTarget {
  timetableId: string;
  lessonId: string;
  weekStart: string;
}

interface WeekLessonDialogProps {
  target: WeekLessonTarget | null;
  onClose: () => void;
  /** Called after anything that changes the lesson, so the week list can reload. */
  onChanged: () => void;
  /** The lesson arrived and the pop-up is showing it. */
  onLoaded?: () => void;
  /** The lesson couldn't be loaded; the pop-up stays closed. */
  onLoadFailed?: () => void;
}

/**
 * The calendar's lesson pop-up, opened from the dashboard week. Lessons open here
 * (not straight into their document) because a lesson will hold more than one document.
 */
export function WeekLessonDialog({
  target,
  onClose,
  onChanged,
  onLoaded,
  onLoadFailed,
}: WeekLessonDialogProps) {
  const dispatch = useAppDispatch();
  const tShared = useTranslations("calendar.shared");
  const { getToken } = useAuth();
  const [slot, setSlot] = useState<SlotWithTimetable | null>(null);
  // Callbacks from the parent change identity on every render: read them through refs so the
  // load effect only re-runs when the lesson to open changes (otherwise it loops and never opens).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;
  const onLoadFailedRef = useRef(onLoadFailed);
  onLoadFailedRef.current = onLoadFailed;

  const generating = useSyncExternalStore(
    generationStore.subscribe,
    generationStore.getSnapshot,
    generationStore.getServerSnapshot,
  );

  useEffect(() => {
    setSlot(null);
    if (!target) return;
    let cancelled = false;
    const fail = () => (onLoadFailedRef.current ?? onCloseRef.current)();
    Promise.all([getTimetable(target.timetableId), listLessons(target.timetableId, target.weekStart)])
      .then(([timetable, lessons]) => {
        if (cancelled) return;
        const found = lessons.find((l) => l.id === target.lessonId);
        if (!found) return fail();
        setSlot({ ...found, timetable });
        onLoadedRef.current?.();
      })
      .catch((err) => {
        posthog.captureException(err);
        if (!cancelled) fail();
      });
    return () => {
      cancelled = true;
    };
  }, [target]);

  const applyUpdate = useCallback((updated: LessonSlot) => {
    setSlot((prev) => patchOpenSlot(prev, updated.id, updated));
  }, []);

  const runGeneration = useCallback(
    async (current: SlotWithTimetable, mode: "generate" | "regenerate", message?: string) => {
      const stream = mode === "generate" ? generateLessonStream : regenerateLessonStream;
      const setStatus = (status: LessonSlot["status"]) =>
        setSlot((prev) => patchOpenSlot(prev, current.id, { status }));
      posthog.capture("your_week_lesson_generate_clicked", { mode });
      generationStore.start(current.id);
      setStatus("generating");
      try {
        await stream(
          current.timetable.id,
          current.id,
          message,
          {
            // The pop-up stays open: the teacher may still be preparing the lesson's other documents.
            onDone: () => setStatus("completed"),
            onError: () => setStatus("failed"),
            onFreeLimit: (code) => {
              setStatus(current.status);
              if (isUpgradeReason(code)) dispatch(openUpgradeModalForReason(code));
            },
            onQuotaExceeded: () => {
              setStatus(current.status);
              dispatch(setUpgradeModalOpen(true));
            },
          },
          getToken,
        );
      } catch (err) {
        setStatus("failed");
        posthog.captureException(err);
      } finally {
        generationStore.finish(current.id);
        onChanged();
      }
    },
    [dispatch, getToken, onChanged],
  );

  const handleUpdate = useCallback(
    async (current: SlotWithTimetable, patch: { slotType?: LessonSlotType; topicTitle?: string }) => {
      try {
        applyUpdate(await updateLessonService(current.timetable.id, current.id, patch));
        onChanged();
      } catch (err) {
        toast.error(tShared("saveError"));
        posthog.captureException(err);
      }
    },
    [applyUpdate, onChanged, tShared],
  );

  // The lesson takes a moment to load: open the pop-up right away with a spinner so the click is acknowledged.
  if (target && !slot) {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
          <DialogTitle className="sr-only">{tShared("openingLesson")}</DialogTitle>
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {tShared("openingLesson")}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <SlotDialog
      slot={slot}
      isSlotGenerating={slot ? generating.has(slot.id) : false}
      onClose={onClose}
      onGenerate={(s, message) => runGeneration(s, "generate", message)}
      onRegenerate={(s, message) => void runGeneration(s, "regenerate", message)}
      onTypeChange={(s, slotType) => void handleUpdate(s, { slotType })}
      onTitleChange={(s, topicTitle) => void handleUpdate(s, { topicTitle })}
      onDocumentsChanged={onChanged}
      onFollowUpStarted={onChanged}
      onProposalResolved={onChanged}
      onPreviousCheckedIn={onChanged}
      onLessonsShifted={onChanged}
    />
  );
}
