"use client";

import { onboardingFreeWeek } from "@/components/onboarding-v2/freeWeek";
import { StepHeading } from "@/components/onboarding-v2/StepHeading";
import type { OnboardingFlowController } from "@/components/onboarding-v2/useOnboardingV2";
import { useStepFooter } from "@/components/onboarding-v2/useStepFooter";
import { WeekLessonRow, type WeekRow } from "@/components/onboarding-v2/steps/WeekLessonRow";
import { Button } from "@/components/ui/button";
import { useMotionSafe } from "@/lib/motion/useMotionSafe";
import { meService } from "@/services/api/me.service";
import { generateWeek } from "@/services/api/timetable.service";
import { Routes } from "@/shared/types";
import type { UpgradeReason } from "@/shared/types/plan-limits";
import { useAppDispatch } from "@/store/hooks";
import { openUpgradeModalForReason, setUpgradeModalOpen } from "@/store/ui/uiSlice";
import { useAuth } from "@clerk/nextjs";
import { ExternalLink } from "lucide-react";
import { motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import posthog from "posthog-js";
import { useEffect, useMemo, useRef, useState } from "react";

type Phase = "loading" | "generating" | "done" | "error" | "empty";

function isUpgradeReason(code: string): code is UpgradeReason {
  return code === "free_class_limit" || code === "free_period_limit";
}

interface FirstWeekStepProps {
  flow: OnboardingFlowController;
}

export function FirstWeekStep({ flow }: FirstWeekStepProps) {
  const t = useTranslations("onboardingV2");
  const locale = useLocale();
  const dispatch = useAppDispatch();
  const { getToken } = useAuth();
  const { stagger, item } = useMotionSafe();
  const { answers, next, trackCompleted } = flow;
  const { timetableId } = answers;

  const weekStart = useMemo(() => onboardingFreeWeek(new Date()), []);
  const [phase, setPhase] = useState<Phase>("loading");
  const [rows, setRows] = useState<WeekRow[]>([]);
  const [firstLessonHref, setFirstLessonHref] = useState<string | null>(null);
  const startedRef = useRef(false);

  const patchRow = (id: string, status: WeekRow["status"]) =>
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, status } : row)));

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const run = async () => {
      if (!timetableId) {
        setPhase("empty");
        return;
      }
      try {
        const week = await meService.getWeek(weekStart);
        const klass = week.classes.find((c) => c.timetableId === timetableId);
        const lessons = (klass?.lessons ?? [])
          .filter((l) => l.slotType !== "HOLIDAY" && l.status !== "skipped")
          .sort((a, b) => a.slotDate.localeCompare(b.slotDate));
        if (lessons.length === 0) {
          setPhase("empty");
          return;
        }
        setRows(
          lessons.map((l) => ({
            id: l.id,
            slotDate: l.slotDate,
            title: l.topicTitle,
            status:
              l.status === "completed"
                ? "ready"
                : l.status === "failed"
                  ? "failed"
                  : "pending",
          })),
        );
        setPhase("generating");

        let problem = false;
        await generateWeek(
          timetableId,
          weekStart,
          {
            onSlotStart: (id) => patchRow(id, "generating"),
            onSlotDone: (id) => patchRow(id, "ready"),
            onSlotError: (id) => {
              problem = true;
              patchRow(id, "failed");
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
          getToken,
        );

        // The first lesson that now has a document can be opened straight away.
        const refreshed = await meService.getWeek(weekStart).catch(() => null);
        const firstDocument = refreshed?.classes
          .find((c) => c.timetableId === timetableId)
          ?.lessons.find((l) => l.documentId);
        if (firstDocument?.documentId) {
          setFirstLessonHref(`${Routes.LESSON_PLAN}/${firstDocument.documentId}`);
        }
        setPhase(problem ? "error" : "done");
      } catch (err) {
        posthog.captureException(err);
        setPhase("error");
      }
    };

    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inProgress = phase === "loading" || phase === "generating";

  useStepFooter({
    stepId: 4,
    canContinue: phase !== "loading",
    hideBack: true,
    continueLabel: phase === "generating" ? t("week.continueBackground") : undefined,
    onContinue: () => {
      trackCompleted(4, {
        outcome: phase,
        lessons_ready: rows.filter((row) => row.status === "ready").length,
      });
      next();
    },
  });

  const formatRange = () => {
    const start = new Date(`${weekStart}T00:00:00`);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    const format = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
    return `${format.format(start)} – ${format.format(end)}`;
  };

  return (
    <div>
      <StepHeading
        title={phase === "done" ? t("week.doneTitle") : t("week.title")}
        subtitle={
          phase === "error"
            ? t("week.error")
            : phase === "empty"
              ? t("week.noLessons")
              : inProgress
                ? t("week.subtitle", { range: formatRange() })
                : undefined
        }
      />

      {rows.length > 0 && (
        <motion.ul
          variants={stagger}
          initial="initial"
          animate="animate"
          className="space-y-2"
        >
          {rows.map((row, index) => (
            <motion.li key={row.id} variants={item}>
              <WeekLessonRow row={row} position={index + 1} locale={locale} />
            </motion.li>
          ))}
        </motion.ul>
      )}

      {phase === "done" && firstLessonHref && (
        <Button asChild variant="outline" className="mt-6 h-11 rounded-xl px-5">
          <a href={firstLessonHref} target="_blank" rel="noopener noreferrer">
            {t("week.openLesson")}
            <ExternalLink aria-hidden />
          </a>
        </Button>
      )}
    </div>
  );
}
