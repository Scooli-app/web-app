"use client";

import { useMotionSafe } from "@/lib/motion/useMotionSafe";
import type { LessonSlot } from "@/services/api/timetable.service";
import { Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";

interface ClassTopicsRevealProps {
  /** null while the topics are still being generated. */
  topics: LessonSlot[] | null;
  failed: boolean;
}

/** "Building your plan…", then the first topics appearing one by one with their dates. */
export function ClassTopicsReveal({ topics, failed }: ClassTopicsRevealProps) {
  const t = useTranslations("onboardingV2.class");
  const locale = useLocale();
  const { stagger, item } = useMotionSafe();

  if (topics === null) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center" role="status">
        <Loader2 className="h-8 w-8 animate-spin motion-reduce:animate-none text-primary" aria-hidden />
        <p className="text-lg font-medium text-foreground">{t("building")}</p>
        <p className="text-sm text-muted-foreground">{t("buildingHint")}</p>
      </div>
    );
  }

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat(locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(new Date(`${iso}T00:00:00`));

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-foreground">{t("readyTitle")}</p>
      {failed ? (
        <p role="alert" className="text-sm text-destructive">
          {t("topicsFailed")}
        </p>
      ) : (
        <motion.ol
          variants={stagger}
          initial="initial"
          animate="animate"
          className="space-y-2"
        >
          {topics.map((slot) => (
            <motion.li
              key={slot.id}
              variants={item}
              className="flex items-baseline gap-3 rounded-xl border border-border bg-card px-4 py-3"
            >
              <span className="w-24 shrink-0 text-xs font-medium capitalize text-muted-foreground">
                {formatDate(slot.slotDate)}
              </span>
              <span className="min-w-0 text-sm text-foreground">{slot.topicTitle}</span>
            </motion.li>
          ))}
        </motion.ol>
      )}
    </div>
  );
}
