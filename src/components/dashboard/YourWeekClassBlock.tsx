"use client";

import { YourWeekLessonRow } from "@/components/dashboard/YourWeekLessonRow";
import { Button } from "@/components/ui/button";
import { useMotionSafe } from "@/lib/motion/useMotionSafe";
import type { MyWeekClass, MyWeekLesson } from "@/shared/types/my-week";
import { Loader2, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";

interface YourWeekClassBlockProps {
  klass: MyWeekClass;
  locale: string;
  preparing: boolean;
  onPrepare: () => void;
}

/** One class of the week: color dot, title, its lessons and the "prepare the week" button. */
export function YourWeekClassBlock({
  klass,
  locale,
  preparing,
  onPrepare,
}: YourWeekClassBlockProps) {
  const t = useTranslations("yourWeek");
  const { stagger, item } = useMotionSafe();

  const lessons: MyWeekLesson[] = klass.lessons
    .filter((l) => l.slotType !== "HOLIDAY" && l.status !== "skipped")
    .sort((a, b) => a.slotDate.localeCompare(b.slotDate));
  if (lessons.length === 0) return null;

  const needsPreparing = lessons.some((l) => l.status === "pending" || l.status === "failed");

  return (
    <section className="rounded-xl border border-border bg-background p-3">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: klass.color || "#7F77DD" }}
          />
          <h3 className="truncate text-sm font-semibold text-foreground">{klass.title}</h3>
        </div>
        {(needsPreparing || preparing) && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 shrink-0 px-2 text-xs"
            disabled={preparing}
            onClick={onPrepare}
          >
            {preparing ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin motion-reduce:animate-none" aria-hidden />
            ) : (
              <Sparkles className="mr-1 h-3 w-3" aria-hidden />
            )}
            {t("prepare")}
          </Button>
        )}
      </div>
      <motion.ul variants={stagger} initial="initial" animate="animate" className="space-y-0.5">
        {lessons.map((lesson) => (
          <motion.li key={lesson.id} variants={item}>
            <YourWeekLessonRow lesson={lesson} locale={locale} />
          </motion.li>
        ))}
      </motion.ul>
    </section>
  );
}
