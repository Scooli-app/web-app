"use client";

import { useMotionSafe } from "@/lib/motion/useMotionSafe";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";

interface ProgressRailProps {
  /** 1-based position of the current step. */
  current: number;
  total: number;
}

export function ProgressRail({ current, total }: ProgressRailProps) {
  const t = useTranslations("onboardingV2");
  const { reduce } = useMotionSafe();
  const percent = Math.min(100, Math.max(0, (current / total) * 100));

  return (
    <div className="flex items-center gap-4">
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        aria-label={t("progress", { step: current, total })}
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
      >
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={
            reduce
              ? { duration: 0.15 }
              : { type: "spring", stiffness: 140, damping: 24 }
          }
        />
      </div>
      <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
        {t("progress", { step: current, total })}
      </span>
    </div>
  );
}
