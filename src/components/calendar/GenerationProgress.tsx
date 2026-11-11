"use client";

import { Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { cn } from "@/shared/utils/utils";

export const PROGRESS_STEPS = ["s1", "s2", "s3", "s4", "s5", "s6"] as const;
/** How long each phrase stays before the next one, while nothing else says how far along the writing is. */
const STEP_MS = 4500;
/** Characters of streamed text that move the indicator one step further. */
const CHARS_PER_STEP = 900;

/**
 * Which phrase to show. Time moves it on; streamed text, when the caller has it, moves it on faster. The first
 * streamed text means the reading is done, so it starts at the writing steps. It never passes the last phrase, so
 * a long run stays on "A rever…" instead of looping.
 */
export function progressStep(elapsedMs: number, streamLength = 0): number {
  const last = PROGRESS_STEPS.length - 1;
  const byTime = Math.floor(elapsedMs / STEP_MS);
  const byStream = streamLength > 0 ? 2 + Math.floor(streamLength / CHARS_PER_STEP) : 0;
  return Math.min(last, Math.max(byTime, byStream));
}

interface GenerationProgressProps {
  /** What is being prepared, e.g. "A preparar o plano de aula". */
  title: string;
  /** Length of the text streamed so far, if the caller follows the stream. */
  streamLength?: number;
}

/**
 * The lesson dialog's "being prepared" panel: plain phrases about what the AI is doing, instead of the raw text it
 * is writing. Restarts when mounted again (a new run).
 */
export function GenerationProgress({ title, streamLength = 0 }: GenerationProgressProps) {
  const t = useTranslations("calendar.slotDialog.progress");
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(startedAt);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  const step = progressStep(now - startedAt, streamLength);
  // A bar that eases towards the end without reaching it: the run ends when the server says so.
  const percent = Math.round(((step + 1) / (PROGRESS_STEPS.length + 1)) * 100);

  return (
    <section aria-label={title} className="space-y-2.5 rounded-md border border-primary/20 bg-primary/5 p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        {title}
      </p>
      <div className="h-1 w-full overflow-hidden rounded-full bg-primary/10">
        <div className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out" style={{ width: `${percent}%` }} />
      </div>
      <ol className="space-y-1" aria-live="polite">
        {PROGRESS_STEPS.map((key, i) => {
          // Only the step just done, the current one and the next: a short, moving list.
          if (i < step - 1 || i > step + 1) return null;
          const done = i < step;
          const current = i === step;
          return (
            <li
              key={key}
              className={cn(
                "flex items-center gap-2 text-sm transition-opacity duration-500",
                done && "text-muted-foreground",
                current && "font-medium text-foreground",
                i === step + 1 && "text-muted-foreground/50",
              )}
              aria-current={current ? "step" : undefined}
            >
              {done ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
              ) : current ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" aria-hidden />
              ) : (
                <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-current" aria-hidden />
              )}
              {t(`steps.${key}`)}
              {current && "…"}
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-muted-foreground">{t("hint")}</p>
    </section>
  );
}
