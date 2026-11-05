"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { meService } from "@/services/api/me.service";
import { userService } from "@/services/api/user.service";
import { Check, ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const DAYS = [1, 2, 3, 4, 5, 6, 7];

/** 2024-01-01 is a Monday, so ISO day n maps to January n. */
function weekdayName(day: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "long" }).format(new Date(2024, 0, day));
}

/**
 * The weekly-email switch and the day it arrives (both saved on change, optimistically). The day only drives the
 * email now (the dashboard always shows today and the next six days), so it sits under the switch and shows while
 * the email is on.
 */
export function PlanningRitualPreferences() {
  const t = useTranslations("settings.planning");
  const locale = useLocale();
  const [weeklyDigest, setWeeklyDigest] = useState<boolean | null>(null);
  const [planningDay, setPlanningDay] = useState<number | null>(null);
  const [digestFailed, setDigestFailed] = useState(false);
  const [dayFailed, setDayFailed] = useState(false);
  const [digestAttempt, setDigestAttempt] = useState(0);
  const [dayAttempt, setDayAttempt] = useState(0);

  // Each control stays disabled until the server has confirmed its value.
  useEffect(() => {
    let cancelled = false;
    setDigestFailed(false);
    meService
      .getEmailPreferences()
      .then((prefs) => {
        if (!cancelled) setWeeklyDigest(prefs.weeklyDigest);
      })
      .catch(() => {
        if (!cancelled) setDigestFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [digestAttempt]);

  useEffect(() => {
    let cancelled = false;
    setDayFailed(false);
    userService
      .getCurrentUser()
      .then((user) => {
        // No stored day means Sunday, as the digest job reads it (WeekMath.DEFAULT_PLANNING_DAY).
        if (!cancelled) setPlanningDay(user.planningDay ?? 7);
      })
      .catch(() => {
        if (!cancelled) setDayFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [dayAttempt]);

  // The weekly email links here (/settings#planning). On a full page load the browser looks for the anchor before the
  // page has rendered, so scroll once both values are in (the day row only appears then) and the layout has settled.
  const hashScrolled = useRef(false);
  useEffect(() => {
    if (hashScrolled.current || weeklyDigest === null || planningDay === null) return;
    if (window.location.hash !== "#planning") return;
    hashScrolled.current = true;
    requestAnimationFrame(() => document.getElementById("planning")?.scrollIntoView({ block: "center" }));
  }, [weeklyDigest, planningDay]);

  const changeDigest = (value: boolean) => {
    if (weeklyDigest === null) return;
    const previous = weeklyDigest;
    setWeeklyDigest(value);
    meService.setEmailPreferences(value).catch(() => {
      setWeeklyDigest(previous);
      toast.error(t("saveError"));
    });
  };

  const changeDay = (day: number) => {
    if (planningDay === null) return;
    const previous = planningDay;
    setPlanningDay(day);
    meService.setPlanningDay(day).catch(() => {
      setPlanningDay(previous);
      toast.error(t("saveError"));
    });
  };

  const LoadError = ({ onRetry }: { onRetry: () => void }) => (
    <p className="mt-1 text-xs text-destructive">
      {t("loadError")}{" "}
      <button type="button" onClick={onRetry} className="font-medium underline">
        {t("retry")}
      </button>
    </p>
  );

  return (
    <div id="planning" className="scroll-mt-24 space-y-3">
      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        {t("title")}
      </p>

      <div className="space-y-4 rounded-xl bg-muted p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p id="weekly-digest-label" className="font-medium text-foreground">
              {t("digestTitle")}
            </p>
            <p className="text-xs text-muted-foreground">{t("digestDescription")}</p>
            {digestFailed && <LoadError onRetry={() => setDigestAttempt((n) => n + 1)} />}
          </div>
          <Switch
            aria-labelledby="weekly-digest-label"
            checked={weeklyDigest ?? false}
            disabled={weeklyDigest === null}
            onCheckedChange={changeDigest}
          />
        </div>

        {weeklyDigest && (
          <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-4">
            <div className="min-w-0">
              <p className="font-medium text-foreground">{t("dayTitle")}</p>
              <p className="text-xs text-muted-foreground">{t("dayDescription")}</p>
              {dayFailed && <LoadError onRetry={() => setDayAttempt((n) => n + 1)} />}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  disabled={planningDay === null}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium capitalize text-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
                >
                  {planningDay === null ? "…" : weekdayName(planningDay, locale)}
                  <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {DAYS.map((day) => (
                  <DropdownMenuItem
                    key={day}
                    onClick={() => changeDay(day)}
                    className="flex items-center justify-between capitalize"
                  >
                    <span>{weekdayName(day, locale)}</span>
                    {day === planningDay && <Check className="h-4 w-4 text-primary" aria-hidden />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
}
