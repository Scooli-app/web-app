"use client";

import { onboardingFreeWeek } from "@/components/onboarding-v2/freeWeek";
import type { WeekRow } from "@/components/onboarding-v2/steps/WeekLessonRow";
import { resolveEffectiveContentLanguage } from "@/i18n/clientLocale";
import { meService } from "@/services/api/me.service";
import {
  generateTopics,
  generateWeek,
  listLessons,
  type LessonSlot,
} from "@/services/api/timetable.service";
import { Routes } from "@/shared/types";
import type { UpgradeReason } from "@/shared/types/plan-limits";
import { useAppDispatch } from "@/store/hooks";
import type { RootState } from "@/store/store";
import { openUpgradeModalForReason, setUpgradeModalOpen } from "@/store/ui/uiSlice";
import { useAuth } from "@clerk/nextjs";
import posthog from "posthog-js";
import { useCallback, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";

export const TOPICS_SHOWN = 4;

export type TopicsStatus = "idle" | "running" | "done" | "failed";
export type WeekStatus = "idle" | "loading" | "generating" | "done" | "failed" | "empty";

function isUpgradeReason(code: string): code is UpgradeReason {
  return code === "free_class_limit" || code === "free_period_limit";
}

/**
 * Generates the year's topics and then the first week's lessons for the class
 * created in step 3. It lives in the flow shell (not in a step), so pressing
 * "Continue" while it runs never cancels it: the promises keep going and the
 * state keeps updating for step 5's inline status.
 */
export function usePlanGeneration() {
  const dispatch = useAppDispatch();
  const { getToken } = useAuth();
  const ui = useSelector((state: RootState) => state.ui);
  const uiRef = useRef(ui);
  uiRef.current = ui;
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const weekStart = useMemo(() => onboardingFreeWeek(new Date()), []);
  const [timetableId, setTimetableId] = useState<string | null>(null);
  const [topicsStatus, setTopicsStatus] = useState<TopicsStatus>("idle");
  const [topics, setTopics] = useState<LessonSlot[]>([]);
  const [topicsStartedAt, setTopicsStartedAt] = useState<number | null>(null);
  const [weekStatus, setWeekStatus] = useState<WeekStatus>("idle");
  const [rows, setRows] = useState<WeekRow[]>([]);
  const [firstLessonHref, setFirstLessonHref] = useState<string | null>(null);
  const runningRef = useRef({ topics: false, week: false });

  const patchRow = (id: string, status: WeekRow["status"]) =>
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, status } : row)));

  const runWeek = useCallback(
    async (id: string) => {
      if (runningRef.current.week) return;
      runningRef.current.week = true;
      setWeekStatus("loading");
      try {
        const week = await meService.getWeek(weekStart);
        const klass = week.classes.find((c) => c.timetableId === id);
        const lessons = (klass?.lessons ?? [])
          .filter((l) => l.slotType !== "HOLIDAY" && l.status !== "skipped")
          .sort((a, b) => a.slotDate.localeCompare(b.slotDate));
        if (lessons.length === 0) {
          setWeekStatus("empty");
          return;
        }
        setRows(
          lessons.map((l) => ({
            id: l.id,
            slotDate: l.slotDate,
            title: l.topicTitle,
            status:
              l.status === "completed" ? "ready" : l.status === "failed" ? "failed" : "pending",
          })),
        );
        setWeekStatus("generating");

        let problem = false;
        await generateWeek(
          id,
          weekStart,
          {
            onSlotStart: (slotId) => patchRow(slotId, "generating"),
            onSlotDone: (slotId) => patchRow(slotId, "ready"),
            onSlotError: (slotId) => {
              problem = true;
              patchRow(slotId, "failed");
            },
            onFreeLimit: (code) => {
              problem = true;
              if (isUpgradeReason(code)) dispatch(openUpgradeModalForReason(code));
            },
            onQuotaExceeded: () => {
              problem = true;
              dispatch(setUpgradeModalOpen(true));
            },
            onError: () => {
              problem = true;
            },
          },
          () => getTokenRef.current(),
        );

        // The first lesson that now has a document can be opened straight away.
        const refreshed = await meService.getWeek(weekStart).catch(() => null);
        const firstDocument = refreshed?.classes
          .find((c) => c.timetableId === id)
          ?.lessons.find((l) => l.documentId);
        if (firstDocument?.documentId) {
          setFirstLessonHref(`${Routes.LESSON_PLAN}/${firstDocument.documentId}`);
        }
        setWeekStatus(problem ? "failed" : "done");
      } catch (err) {
        posthog.captureException(err);
        setWeekStatus("failed");
      } finally {
        runningRef.current.week = false;
      }
    },
    [dispatch, weekStart],
  );

  const runTopics = useCallback(
    async (id: string) => {
      if (runningRef.current.topics) return;
      runningRef.current.topics = true;
      setTopicsStatus("running");
      setTopicsStartedAt(Date.now());
      let ok = false;
      try {
        const contentLanguage = resolveEffectiveContentLanguage(
          uiRef.current.contentLanguage,
          uiRef.current.interfaceLocale,
        );
        const result = await generateTopics(id, contentLanguage);
        const slots = await listLessons(id);
        setTopics(
          slots
            .filter((slot) => slot.slotType === "LESSON")
            .sort((a, b) => a.slotDate.localeCompare(b.slotDate))
            .slice(0, TOPICS_SHOWN),
        );
        ok = result.updated > 0;
        setTopicsStatus(ok ? "done" : "failed");
      } catch (err) {
        posthog.captureException(err);
        setTopicsStatus("failed");
      } finally {
        runningRef.current.topics = false;
      }
      if (ok) await runWeek(id);
    },
    [runWeek],
  );

  /** Called right after the class is created; the work continues whatever step is on screen. */
  const start = useCallback(
    (id: string) => {
      setTimetableId(id);
      void runTopics(id);
    },
    [runTopics],
  );

  const retryTopics = useCallback(() => {
    if (timetableId) void runTopics(timetableId);
  }, [timetableId, runTopics]);

  const retryWeek = useCallback(() => {
    if (timetableId) void runWeek(timetableId);
  }, [timetableId, runWeek]);

  const overall: "working" | "done" | "failed" =
    topicsStatus === "failed" || weekStatus === "failed"
      ? "failed"
      : weekStatus === "done" || weekStatus === "empty"
        ? "done"
        : "working";

  return {
    overall,
    weekStart,
    topicsStatus,
    topics,
    topicsStartedAt,
    weekStatus,
    rows,
    firstLessonHref,
    start,
    retryTopics,
    retryWeek,
  };
}

export type PlanGeneration = ReturnType<typeof usePlanGeneration>;
