"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useSelector } from "react-redux";

import { Button } from "@/components/ui/button";

import { Routes } from "@/shared/types";
import { selectIsHorarioPlanosEnabled } from "@/store/features/selectors";
import { generationStore } from "@/store/generationStore";
import { useAppDispatch } from "@/store/hooks";
import type { RootState } from "@/store/store";
import { fetchTimetables } from "@/store/timetable/timetableSlice";

import {
  generateLesson as generateLessonStream,
  generateWeek as generateWeekStream,
  listLessons,
  regenerateLesson as regenerateLessonStream,
  skipLesson as skipLessonService,
  updateLesson as updateLessonService,
  type LessonSlot,
  type LessonSlotType,
} from "@/services/api/timetable.service";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Sparkles,
} from "lucide-react";

import { SLOT_STATUS_CONFIG } from "@/shared/constants/lessonSlotStatus";
import { SlotDialog } from "@/components/calendar/SlotDialog";
import { SlotSkeleton } from "@/components/calendar/SlotSkeleton";
import type { SlotWithTimetable, DayMap } from "@/shared/types/calendar";
import { toIso, addDays, getWeekStart, formatWeekLabel, hexToRgb, DAY_LABELS } from "@/shared/utils/calendar";

// ─────────────────────── Local helpers ───────────────────────────────────────

const STATUS_CONFIG = SLOT_STATUS_CONFIG;

/**
 * Full week-grid skeleton shown while timetables are still loading.
 * Uses the real week-day dates so it looks contextual, not generic.
 */
function CalendarGridSkeleton({
  weekDays,
  today,
}: {
  weekDays: Date[];
  today: string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border w-full">
      <div className="min-w-[640px] w-full">
        {/* Real day headers */}
        <div className="grid grid-cols-7 divide-x divide-border border-b bg-muted/20">
          {weekDays.map((day, i) => {
            const iso = toIso(day);
            const isToday = iso === today;
            return (
              <div
                key={iso}
                className={`px-2 py-2 text-center ${isToday ? "bg-primary/5" : ""}`}
              >
                <p
                  className={`text-xs font-semibold uppercase tracking-wider ${
                    isToday ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {DAY_LABELS[i]}
                </p>
                <div className="mt-0.5 flex justify-center">
                  <span
                    className={`flex h-7 w-7 items-center justify-center text-sm font-bold leading-none ${
                      isToday
                        ? "rounded-full bg-primary text-primary-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        {/* Skeleton slot cells — only weekdays (index 0–4) get cards */}
        <div className="grid grid-cols-7 divide-x divide-border">
          {weekDays.map((day, i) => (
            <div key={toIso(day)} className="min-h-[180px] p-2 space-y-1.5">
              {i < 5 && (
                <>
                  <SlotSkeleton />
                  {i % 3 !== 1 && <SlotSkeleton />}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────── Lesson card ─────────────────────────────────────────

interface LessonCardProps {
  slot: SlotWithTimetable;
  onOpen: (slot: SlotWithTimetable) => void;
  onDragStart: (e: React.DragEvent, slot: SlotWithTimetable) => void;
  onCardDrop: (e: React.DragEvent, slot: SlotWithTimetable) => void;
  highlightPending?: boolean;
}

function LessonCard({
  slot,
  onOpen,
  onDragStart,
  onCardDrop,
  highlightPending = false,
}: LessonCardProps) {
  const { timetable } = slot;
  const color = timetable.color || "#7F77DD";
  const cfg = STATUS_CONFIG[slot.status];
  const isHoliday = slot.slotType === "HOLIDAY";
  const isAssessment = slot.slotType === "ASSESSMENT";
  const isFailed = slot.status === "failed";
  const rgb = hexToRgb(color);
  const tintBg = rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.07)` : undefined;
  const [isDropTarget, setIsDropTarget] = useState(false);

  return (
    <div
      draggable={!isHoliday}
      onDragStart={(e) => !isHoliday && onDragStart(e, slot)}
      onDragEnter={(e) => {
        if (!isHoliday) {
          e.preventDefault();
          setIsDropTarget(true);
        }
      }}
      onDragOver={(e) => {
        if (!isHoliday) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node))
          setIsDropTarget(false);
      }}
      onDrop={(e) => {
        if (!isHoliday) {
          e.preventDefault();
          e.stopPropagation();
          setIsDropTarget(false);
          onCardDrop(e, slot);
        }
      }}
      className={`group rounded-md border text-left transition-all ${
        isDropTarget ? "ring-2 ring-primary/50 ring-offset-1" : ""
      } ${
        highlightPending && slot.status === "pending" && !isHoliday
          ? "ring-2 ring-primary/40 ring-offset-1 animate-pulse"
          : ""
      } ${
        isHoliday
          ? "cursor-default opacity-50"
          : "cursor-grab active:cursor-grabbing hover:shadow-sm hover:border-primary/30"
      } ${isFailed ? "border-red-300 bg-red-50 dark:bg-red-950/20" : "border-border"}`}
      style={{
        borderLeftWidth: "3px",
        borderLeftColor: isFailed
          ? "#ef4444"
          : isAssessment
            ? "#f59e0b"
            : color,
        backgroundColor: !isFailed && !isHoliday ? tintBg : undefined,
      }}
    >
      <button
        type="button"
        disabled={isHoliday}
        onClick={() => !isHoliday && onOpen(slot)}
        className="w-full text-left"
      >
        <div className="px-2 py-1.5">
          <div className="flex items-start gap-1">
            <span className="shrink-0 font-mono text-[10px] text-muted-foreground/50 mt-0.5">
              {slot.sequenceNumber}
            </span>
            <p
              className={`line-clamp-2 text-xs font-medium leading-tight ${
                isHoliday
                  ? "line-through text-muted-foreground"
                  : "text-foreground"
              }`}
            >
              {isHoliday
                ? "Feriado"
                : isAssessment
                  ? `📋 ${slot.topicTitle || "Avaliação"}`
                  : slot.topicTitle || "Sem tópico"}
            </p>
          </div>
          {!isHoliday && (
            <p
              className="mt-0.5 truncate text-[11px] font-medium"
              style={{ color }}
            >
              {timetable.subject}
              {timetable.classLabel ? ` · ${timetable.classLabel}` : ""}
            </p>
          )}
          {!isHoliday && (
            <div className="mt-1 flex items-center gap-1">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dotCls}`}
              />
              <span className="text-[10px] text-muted-foreground">
                {cfg.label}
              </span>
              {slot.durationMinutes > 0 && (
                <span className="text-[10px] text-muted-foreground/60 ml-1">
                  · {slot.durationMinutes}m
                </span>
              )}
            </div>
          )}
        </div>
      </button>
    </div>
  );
}

// ─────────────────────── Main page ───────────────────────────────────────────

/** Suspense wrapper required by useSearchParams in Next.js App Router. */
export default function CalendarPage() {
  return (
    <Suspense>
      <CalendarPageInner />
    </Suspense>
  );
}

function CalendarPageInner() {
  const enabled = useSelector(selectIsHorarioPlanosEnabled);
  const { timetables, isLoading: isLoadingTimetables } = useSelector(
    (state: RootState) => state.timetable,
  );
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { getToken } = useAuth();

  const searchParams = useSearchParams();
  const [weekStart, setWeekStart] = useState<Date>(() => {
    // Jump to a specific week when navigated from the dashboard widget (?week=YYYY-MM-DD)
    const param = searchParams.get("week");
    if (param) {
      const d = new Date(`${param}T00:00:00`);
      if (!isNaN(d.getTime())) return d;
    }
    return getWeekStart();
  });

  // Reactively update when the ?week param changes (e.g. widget → calendar navigation)
  useEffect(() => {
    const param = searchParams.get("week");
    if (param) {
      const d = new Date(`${param}T00:00:00`);
      if (!isNaN(d.getTime())) setWeekStart(d);
    }
    // Only run when the param value itself changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get("week")]);
  const [slotsByTimetable, setSlotsByTimetable] = useState<
    Map<string, LessonSlot[]>
  >(new Map());
  const [isSlotsLoading, setIsSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotWithTimetable | null>(
    null,
  );
  const [filterIds, setFilterIds] = useState<Set<string>>(new Set());
  /** Local generations started from THIS page. */
  const [localGeneratingSlots, setLocalGeneratingSlots] = useState<Set<string>>(
    new Set(),
  );
  /** Cross-page generation state (e.g. started from the dashboard widget). */
  const globalGeneratingSlots = useSyncExternalStore(
    generationStore.subscribe,
    generationStore.getSnapshot,
    () => new Set<string>(),
  );
  /** Union of local + global — used everywhere a "is this slot generating?" check is needed. */
  const generatingSlots = useMemo(
    () => new Set([...localGeneratingSlots, ...globalGeneratingSlots]),
    [localGeneratingSlots, globalGeneratingSlots],
  );
  const [generatingWeek, setGeneratingWeek] = useState(false);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [previewGenerating, setPreviewGenerating] = useState(false);

  // Feature gate
  useEffect(() => {
    if (!enabled) {
      router.replace(Routes.DASHBOARD);
      return;
    }
    dispatch(fetchTimetables());
  }, [enabled, dispatch, router]);

  // Stable key — only changes when timetable IDs actually change (not on every Redux render)
  const weekIso = toIso(weekStart);
  const timetableKey = useMemo(
    () =>
      timetables
        .filter((t) => t.status === "active")
        .map((t) => t.id)
        .join(","),
    [timetables],
  );

  // Fetch slots for current week; deps use stable key to avoid duplicate requests
  useEffect(() => {
    const active = timetables.filter((t) => t.status === "active");
    if (active.length === 0) {
      setSlotsByTimetable(new Map());
      return;
    }
    setIsSlotsLoading(true);
    Promise.all(
      active.map(async (t) => {
        try {
          const slots = await listLessons(t.id, weekIso);
          return { timetableId: t.id, slots };
        } catch {
          return { timetableId: t.id, slots: [] as LessonSlot[] };
        }
      }),
    )
      .then((results) => {
        setSlotsByTimetable(
          new Map(results.map((r) => [r.timetableId, r.slots])),
        );
      })
      .catch(() => {
        /* ignore */
      })
      .finally(() => setIsSlotsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timetableKey, weekIso]); // timetableKey is stable — prevents duplicate requests

  // Build week days Mon–Sun
  const weekDays = useMemo<Date[]>(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  // All slots for the week (optionally filtered by sequence).
  // Status is overridden to "generating" if the global store says so —
  // this bridges the gap when the API still returns "pending" due to a
  // race between navigation and the backend updating the DB.
  const allSlots = useMemo<SlotWithTimetable[]>(() => {
    const result: SlotWithTimetable[] = [];
    for (const t of timetables) {
      if (filterIds.size > 0 && !filterIds.has(t.id)) continue;
      const slots = slotsByTimetable.get(t.id) ?? [];
      for (const s of slots) {
        const status = generatingSlots.has(s.id) ? "generating" : s.status;
        result.push({ ...s, status, timetable: t });
      }
    }
    return result;
  }, [timetables, slotsByTimetable, filterIds, generatingSlots]);

  // Group by ISO date
  const dayMap = useMemo<DayMap>(() => {
    const map: DayMap = new Map();
    for (const slot of allSlots) {
      if (!map.has(slot.slotDate)) map.set(slot.slotDate, []);
      const arr = map.get(slot.slotDate);
      if (arr) arr.push(slot);
    }
    return map;
  }, [allSlots]);

  const pendingThisWeek = useMemo(
    () =>
      allSlots.filter((s) => s.status === "pending" && s.slotType !== "HOLIDAY")
        .length,
    [allSlots],
  );

  // Keep selectedSlot in sync with store updates
  useEffect(() => {
    if (!selectedSlot) return;
    const slots = slotsByTimetable.get(selectedSlot.timetable.id) ?? [];
    const updated = slots.find((s) => s.id === selectedSlot.id);
    if (updated) {
      setSelectedSlot({ ...updated, timetable: selectedSlot.timetable });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotsByTimetable]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const prevWeek = () => setWeekStart((p) => addDays(p, -7));
  const nextWeek = () => setWeekStart((p) => addDays(p, 7));
  const goToday = () => setWeekStart(getWeekStart());

  // Keyboard shortcuts: ← prev week, → next week, T = today
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (selectedSlot !== null) return;
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      )
        return;
      if (e.key === "ArrowLeft") { e.preventDefault(); prevWeek(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); nextWeek(); }
      else if (e.key === "t" || e.key === "T") { e.preventDefault(); goToday(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [selectedSlot]);
  const toggleFilter = (id: string) =>
    setFilterIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const refreshTimetable = useCallback(
    async (timetableId: string) => {
      try {
        const slots = await listLessons(timetableId, weekIso);
        setSlotsByTimetable((prev) => new Map(prev).set(timetableId, slots));
      } catch {
        /* ignore */
      }
    },
    [weekIso],
  );

  const patchSlotStatus = (
    timetableId: string,
    slotId: string,
    status: LessonSlot["status"],
  ) => {
    setSlotsByTimetable((prev) => {
      const slots = (prev.get(timetableId) ?? []).map((s) =>
        s.id === slotId ? { ...s, status } : s,
      );
      return new Map(prev).set(timetableId, slots);
    });
  };

  // ── Drag and drop ─────────────────────────────────────────────────────────
  const handleDragStart = useCallback(
    (e: React.DragEvent, slot: SlotWithTimetable) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("slotId", slot.id);
      e.dataTransfer.setData("timetableId", slot.timetable.id);
      e.dataTransfer.setData("fromDate", slot.slotDate);
    },
    [],
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetDate: string) => {
      e.preventDefault();
      setDragOverDay(null);
      const slotId = e.dataTransfer.getData("slotId");
      const timetableId = e.dataTransfer.getData("timetableId");
      const fromDate = e.dataTransfer.getData("fromDate");
      if (!slotId || !timetableId || fromDate === targetDate) return;

      // Optimistic update
      setSlotsByTimetable((prev) => {
        const slots = (prev.get(timetableId) ?? []).map((s) =>
          s.id === slotId ? { ...s, slotDate: targetDate } : s,
        );
        return new Map(prev).set(timetableId, slots);
      });

      try {
        await updateLessonService(timetableId, slotId, {
          slotDate: targetDate,
        });
      } catch {
        // Revert on failure
        void refreshTimetable(timetableId);
      }
    },
    [refreshTimetable],
  );

  // ── Card-level drop (same-day reorder OR cross-day onto a card) ──────────
  const handleCardDrop = useCallback(
    async (e: React.DragEvent, targetSlot: SlotWithTimetable) => {
      setDragOverDay(null);
      const slotId = e.dataTransfer.getData("slotId");
      const timetableId = e.dataTransfer.getData("timetableId");
      const fromDate = e.dataTransfer.getData("fromDate");

      if (!slotId || slotId === targetSlot.id) return;

      if (
        fromDate !== targetSlot.slotDate ||
        timetableId !== targetSlot.timetable.id
      ) {
        // Cross-day or cross-timetable: move dragged card to target's date
        setSlotsByTimetable((prev) => {
          const slots = (prev.get(timetableId) ?? []).map((s) =>
            s.id === slotId ? { ...s, slotDate: targetSlot.slotDate } : s,
          );
          return new Map(prev).set(timetableId, slots);
        });
        try {
          await updateLessonService(timetableId, slotId, {
            slotDate: targetSlot.slotDate,
          });
        } catch {
          void refreshTimetable(timetableId);
        }
        return;
      }

      // Same timetable + same day → swap sequence numbers
      const sourceSeq = (slotsByTimetable.get(timetableId) ?? []).find(
        (s) => s.id === slotId,
      )?.sequenceNumber;
      if (sourceSeq === undefined) return;
      const targetSeq = targetSlot.sequenceNumber;
      if (sourceSeq === targetSeq) return;

      // Optimistic update
      setSlotsByTimetable((prev) => {
        const slots = (prev.get(timetableId) ?? []).map((s) => {
          if (s.id === slotId) return { ...s, sequenceNumber: targetSeq };
          if (s.id === targetSlot.id)
            return { ...s, sequenceNumber: sourceSeq };
          return s;
        });
        return new Map(prev).set(timetableId, slots);
      });

      try {
        await Promise.all([
          updateLessonService(timetableId, slotId, {
            sequenceNumber: targetSeq,
          }),
          updateLessonService(timetableId, targetSlot.id, {
            sequenceNumber: sourceSeq,
          }),
        ]);
      } catch {
        void refreshTimetable(timetableId);
      }
    },
    [slotsByTimetable, refreshTimetable],
  );

  // ── Individual generate (parallel-safe) ──────────────────────────────────
  const startSlotGenerating = useCallback((slotId: string) => {
    setLocalGeneratingSlots((prev) => new Set([...prev, slotId]));
    generationStore.start(slotId);
  }, []);

  const stopSlotGenerating = useCallback((slotId: string) => {
    setLocalGeneratingSlots((prev) => {
      const next = new Set(prev);
      next.delete(slotId);
      return next;
    });
    generationStore.finish(slotId);
  }, []);

  const handleGenerateLesson = useCallback(
    async (slot: SlotWithTimetable, message?: string) => {
      startSlotGenerating(slot.id);
      patchSlotStatus(slot.timetable.id, slot.id, "generating");
      try {
        await generateLessonStream(
          slot.timetable.id,
          slot.id,
          message,
          {
            onDone: () => {
              patchSlotStatus(slot.timetable.id, slot.id, "completed");
              void refreshTimetable(slot.timetable.id);
              setSelectedSlot(null);
            },
            onError: () =>
              patchSlotStatus(slot.timetable.id, slot.id, "failed"),
          },
          getToken,
        );
      } finally {
        stopSlotGenerating(slot.id);
      }
    },
    [getToken, refreshTimetable, startSlotGenerating, stopSlotGenerating],
  );

  const handleRegenerateLesson = useCallback(
    async (slot: SlotWithTimetable, message?: string) => {
      startSlotGenerating(slot.id);
      patchSlotStatus(slot.timetable.id, slot.id, "generating");
      try {
        await regenerateLessonStream(
          slot.timetable.id,
          slot.id,
          message,
          {
            onDone: () => {
              patchSlotStatus(slot.timetable.id, slot.id, "completed");
              void refreshTimetable(slot.timetable.id);
              setSelectedSlot(null);
            },
            onError: () =>
              patchSlotStatus(slot.timetable.id, slot.id, "failed"),
          },
          getToken,
        );
      } finally {
        stopSlotGenerating(slot.id);
      }
    },
    [getToken, refreshTimetable, startSlotGenerating, stopSlotGenerating],
  );

  // ── Generate whole week ───────────────────────────────────────────────────
  const handleGenerateWeek = useCallback(async () => {
    setGeneratingWeek(true);
    const active = timetables.filter((t) => t.status === "active");
    try {
      await Promise.all(
        active.map(async (t) => {
          const slots = slotsByTimetable.get(t.id) ?? [];
          const hasPending = slots.some(
            (s) => s.status === "pending" && s.slotType !== "HOLIDAY",
          );
          if (!hasPending) return;
          await generateWeekStream(
            t.id,
            weekIso,
            {
              onSlotStart: (id) => patchSlotStatus(t.id, id, "generating"),
              onSlotDone: (id) => patchSlotStatus(t.id, id, "completed"),
              onSlotError: (id) => patchSlotStatus(t.id, id, "failed"),
              onDone: () => void refreshTimetable(t.id),
            },
            getToken,
          );
        }),
      );
    } finally {
      setGeneratingWeek(false);
    }
  }, [timetables, slotsByTimetable, weekIso, getToken, refreshTimetable]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const handleSkip = useCallback(async (slot: SlotWithTimetable) => {
    setSelectedSlot(null);
    try {
      const updated = await skipLessonService(slot.timetable.id, slot.id);
      setSlotsByTimetable((prev) => {
        const slots = (prev.get(slot.timetable.id) ?? []).map((s) =>
          s.id === slot.id ? updated : s,
        );
        return new Map(prev).set(slot.timetable.id, slots);
      });
    } catch {
      /* ignore */
    }
  }, []);

  const handleTypeChange = useCallback(
    async (slot: SlotWithTimetable, type: LessonSlotType) => {
      try {
        const updated = await updateLessonService(slot.timetable.id, slot.id, {
          slotType: type,
        });
        setSlotsByTimetable((prev) => {
          const slots = (prev.get(slot.timetable.id) ?? []).map((s) =>
            s.id === slot.id ? updated : s,
          );
          return new Map(prev).set(slot.timetable.id, slots);
        });
        setSelectedSlot((prev) =>
          prev?.id === slot.id
            ? { ...updated, timetable: prev.timetable }
            : prev,
        );
      } catch {
        /* ignore */
      }
    },
    [],
  );

  const handleTitleChange = useCallback(
    async (slot: SlotWithTimetable, title: string) => {
      try {
        const updated = await updateLessonService(slot.timetable.id, slot.id, {
          topicTitle: title,
        });
        setSlotsByTimetable((prev) => {
          const slots = (prev.get(slot.timetable.id) ?? []).map((s) =>
            s.id === slot.id ? updated : s,
          );
          return new Map(prev).set(slot.timetable.id, slots);
        });
        setSelectedSlot((prev) =>
          prev?.id === slot.id
            ? { ...updated, timetable: prev.timetable }
            : prev,
        );
      } catch {
        /* ignore */
      }
    },
    [],
  );

  // ── Render ────────────────────────────────────────────────────────────────
  const today = toIso(new Date());
  const activeTimetables = timetables.filter((t) => t.status === "active");

  if (!enabled) return null;

  return (
    <div className="flex w-full flex-col">
      {/* ── Top bar ───────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur px-4 pt-2.5 pb-2">
        <div className="mx-auto max-w-[1400px] space-y-2">
          {/* Row 1: navigation + action buttons */}
          <div className="flex items-center gap-2">
            <h1 className="mr-2 text-lg font-semibold">Calendário</h1>

            {/* View toggle */}
            <div className="flex items-center rounded-lg border border-border overflow-hidden">
              <span className="px-3 py-1 text-xs font-medium bg-primary text-primary-foreground">
                Semana
              </span>
              <Link
                href={Routes.CALENDAR_MONTH}
                className="px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Mês
              </Link>
            </div>

            <Button variant="outline" size="sm" onClick={goToday} className="h-8">
              Hoje
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevWeek}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextWeek}>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <span className="min-w-[160px] text-sm font-medium text-foreground">
              {formatWeekLabel(weekStart)}
            </span>

            <div className="flex-1" />

            <Button variant="outline" size="sm" asChild className="h-8">
              <Link href={Routes.CALENDAR_SEQUENCES}>
                <CalendarDays className="mr-1 h-3.5 w-3.5" />
                Minhas sequências
              </Link>
            </Button>

            <Button variant="outline" size="sm" asChild className="h-8">
              <Link href={Routes.CALENDAR_NEW}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Nova sequência
              </Link>
            </Button>

            {pendingThisWeek > 0 && (
              <Button
                size="sm"
                className="h-8"
                onClick={() => { setPreviewGenerating(false); void handleGenerateWeek(); }}
                onMouseEnter={() => setPreviewGenerating(true)}
                onMouseLeave={() => setPreviewGenerating(false)}
                disabled={generatingWeek}
              >
                {generatingWeek ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                )}
                Gerar semana ({pendingThisWeek})
              </Button>
            )}
          </div>

          {/* Row 2: sequence filter chips — always rendered to hold height */}
          <div className="flex flex-wrap items-center gap-1.5 min-h-[28px]">
            {isLoadingTimetables ? (
              <>
                <div className="h-7 w-20 animate-pulse rounded-full bg-muted" />
                <div className="h-7 w-28 animate-pulse rounded-full bg-muted" />
                <div className="h-7 w-24 animate-pulse rounded-full bg-muted" />
              </>
            ) : (
              activeTimetables.map((t) => {
                const isActive = filterIds.size === 0 || filterIds.has(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleFilter(t.id)}
                    className={`flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-all ${
                      isActive
                        ? "border-transparent text-white shadow-sm"
                        : "border-border bg-transparent text-muted-foreground/50 hover:text-muted-foreground hover:border-border/80"
                    }`}
                    style={isActive ? { backgroundColor: t.color || "#7F77DD" } : {}}
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: t.color || "#7F77DD" }}
                    />
                    {t.subject}
                    {t.classLabel ? ` · ${t.classLabel}` : ""}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Calendar grid ─────────────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-[1400px] px-4 pb-8 pt-4">
        {isLoadingTimetables && timetables.length === 0 ? (
          <CalendarGridSkeleton weekDays={weekDays} today={today} />
        ) : activeTimetables.length === 0 ? (
          <div className="py-20 text-center">
            <CalendarDays className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">Nenhuma sequência de aulas</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Cria a tua primeira sequência para começar a planificar.
            </p>
            <Button asChild className="mt-5">
              <Link href={Routes.CALENDAR_NEW}>
                <Plus className="mr-2 h-4 w-4" />
                Criar sequência
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {/* ── Mobile: vertical day list (hidden on md+) ────────── */}
            <div className="md:hidden space-y-3">
              {weekDays.map((day, i) => {
                const iso = toIso(day);
                const isToday = iso === today;
                const daySlots = (dayMap.get(iso) ?? []).sort(
                  (a, b) => a.sequenceNumber - b.sequenceNumber,
                );
                const isWeekday = day.getDay() >= 1 && day.getDay() <= 5;
                const hasContent = isSlotsLoading
                  ? isWeekday
                  : daySlots.length > 0;
                if (!hasContent) return null;
                return (
                  <div
                    key={iso}
                    className="rounded-lg border border-border overflow-hidden"
                  >
                    {/* Day header */}
                    <div
                      className={`flex items-center gap-2 px-3 py-2 border-b border-border ${isToday ? "bg-primary/5" : "bg-muted/20"}`}
                    >
                      <span
                        className={`text-xs font-semibold uppercase tracking-wider ${isToday ? "text-primary" : "text-muted-foreground"}`}
                      >
                        {DAY_LABELS[i]}
                      </span>
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold ${isToday ? "bg-primary text-primary-foreground" : "text-foreground"}`}
                      >
                        {day.getDate()}
                      </span>
                      {isToday && (
                        <span className="text-xs font-medium text-primary">
                          Hoje
                        </span>
                      )}
                    </div>
                    {/* Cards */}
                    <div className="p-2 space-y-1.5">
                      {isSlotsLoading
                        ? activeTimetables
                            .slice(0, 2)
                            .map((t) => (
                              <SlotSkeleton key={t.id} color={t.color} />
                            ))
                        : daySlots.map((slot, slotIdx) => (
                            <div key={slot.id} className="flex items-stretch gap-1">
                              <div className="flex flex-col gap-0.5">
                                <button
                                  type="button"
                                  disabled={slotIdx === 0}
                                  onClick={() => {
                                    const prev = daySlots[slotIdx - 1];
                                    if (prev) void handleCardDrop(
                                      { dataTransfer: { getData: (k: string) => k === "slotId" ? slot.id : k === "timetableId" ? slot.timetable.id : slot.slotDate } } as unknown as React.DragEvent,
                                      prev,
                                    );
                                  }}
                                  className="flex-1 rounded px-0.5 text-muted-foreground hover:bg-muted disabled:opacity-20"
                                  aria-label="Mover para cima"
                                >
                                  <ChevronUp className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={slotIdx === daySlots.length - 1}
                                  onClick={() => {
                                    const next = daySlots[slotIdx + 1];
                                    if (next) void handleCardDrop(
                                      { dataTransfer: { getData: (k: string) => k === "slotId" ? slot.id : k === "timetableId" ? slot.timetable.id : slot.slotDate } } as unknown as React.DragEvent,
                                      next,
                                    );
                                  }}
                                  className="flex-1 rounded px-0.5 text-muted-foreground hover:bg-muted disabled:opacity-20"
                                  aria-label="Mover para baixo"
                                >
                                  <ChevronDown className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <div className="flex-1">
                                <LessonCard
                                  slot={slot}
                                  onOpen={setSelectedSlot}
                                  onDragStart={handleDragStart}
                                  onCardDrop={handleCardDrop}
                                  highlightPending={previewGenerating}
                                />
                              </div>
                            </div>
                          ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Desktop: 7-column grid (hidden on mobile) ────────── */}
            <div className="hidden md:block overflow-x-auto rounded-lg border border-border w-full">
              <div className="min-w-[640px] w-full">
                {/* Day headers */}
                <div className="grid grid-cols-7 divide-x divide-border border-b bg-muted/20">
                  {weekDays.map((day, i) => {
                    const iso = toIso(day);
                    const isToday = iso === today;
                    return (
                      <div
                        key={iso}
                        className={`px-2 py-2 text-center ${isToday ? "bg-primary/5" : ""}`}
                      >
                        <p
                          className={`text-xs font-semibold uppercase tracking-wider ${isToday ? "text-primary" : "text-muted-foreground"}`}
                        >
                          {DAY_LABELS[i]}
                        </p>
                        <div className="mt-0.5 flex justify-center">
                          <span
                            className={`flex h-7 w-7 items-center justify-center text-sm font-bold leading-none ${isToday ? "rounded-full bg-primary text-primary-foreground" : "text-foreground"}`}
                          >
                            {day.getDate()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Slot cells */}
                <div className="grid grid-cols-7 divide-x divide-border">
                  {weekDays.map((day) => {
                    const iso = toIso(day);
                    const isToday = iso === today;
                    const isDragTarget = dragOverDay === iso;
                    const daySlots = (dayMap.get(iso) ?? []).sort(
                      (a, b) => a.sequenceNumber - b.sequenceNumber,
                    );
                    return (
                      <div
                        key={iso}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          setDragOverDay(iso);
                        }}
                        onDragLeave={(e) => {
                          if (
                            !e.currentTarget.contains(e.relatedTarget as Node)
                          )
                            setDragOverDay(null);
                        }}
                        onDrop={(e) => void handleDrop(e, iso)}
                        className={`min-h-[180px] space-y-1.5 p-2 transition-colors ${isToday ? "bg-primary/[0.03]" : ""} ${isDragTarget ? "bg-primary/10 ring-1 ring-inset ring-primary/30" : ""}`}
                      >
                        {isSlotsLoading ? (
                          day.getDay() >= 1 && day.getDay() <= 5 ? (
                            <div className="space-y-1.5">
                              {activeTimetables.slice(0, 2).map((t) => (
                                <SlotSkeleton key={t.id} color={t.color} />
                              ))}
                            </div>
                          ) : (
                            // Weekend placeholder — keeps the column sized during load
                            <div className="min-h-[180px]" />
                          )
                        ) : (
                          daySlots.map((slot) => (
                            <LessonCard
                              key={slot.id}
                              slot={slot}
                              onOpen={setSelectedSlot}
                              onDragStart={handleDragStart}
                              onCardDrop={handleCardDrop}
                              highlightPending={previewGenerating}
                            />
                          ))
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Slot dialog ───────────────────────────────────────────────── */}
      <SlotDialog
        slot={selectedSlot}
        isSlotGenerating={
          selectedSlot ? generatingSlots.has(selectedSlot.id) : false
        }
        onClose={() => setSelectedSlot(null)}
        onGenerate={handleGenerateLesson}
        onRegenerate={handleRegenerateLesson}
        onSkip={handleSkip}
        onTypeChange={handleTypeChange}
        onTitleChange={handleTitleChange}
      />
    </div>
  );
}
