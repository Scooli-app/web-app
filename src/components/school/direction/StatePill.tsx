"use client";

import type { TurmaState } from "@/shared/types/school-direction";
import { cn } from "@/shared/utils/utils";
import { useTranslations } from "next-intl";

// Colours are the --direction-* tokens in globals.css.
export const STATE_CLASSES: Record<TurmaState, string> = {
  on_track: "bg-direction-ok-bg text-direction-ok",
  watch: "bg-direction-watch-bg text-direction-watch",
  behind: "bg-direction-late-bg text-direction-late",
  no_records: "bg-direction-idle-bg text-direction-idle",
  not_started: "bg-direction-idle-bg text-direction-idle",
};

export function StatePill({ state, lessonsBehind }: { state: TurmaState; lessonsBehind: number }) {
  const t = useTranslations("schoolDirection");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATE_CLASSES[state],
      )}
    >
      {t(`states.${state}`)}
      {(state === "watch" || state === "behind") && (
        <span className="font-normal">· {t("states.lessonsBehind", { count: lessonsBehind })}</span>
      )}
    </span>
  );
}
