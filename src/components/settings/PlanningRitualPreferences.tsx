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
import { CalendarClock, Check, ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const DAYS = [1, 2, 3, 4, 5, 6, 7];

/** 2024-01-01 is a Monday, so ISO day n maps to January n. */
function weekdayName(day: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "long" }).format(new Date(2024, 0, day));
}

/** Planning day and weekly-email switch. Both save on change, optimistically. */
export function PlanningRitualPreferences() {
  const t = useTranslations("settings.planning");
  const locale = useLocale();
  const [planningDay, setPlanningDay] = useState<number | null>(null);
  const [weeklyDigest, setWeeklyDigest] = useState<boolean | null>(null);
  const [dayFailed, setDayFailed] = useState(false);
  const [digestFailed, setDigestFailed] = useState(false);
  const [dayAttempt, setDayAttempt] = useState(0);
  const [digestAttempt, setDigestAttempt] = useState(0);

  // A value stays null (control disabled) until the server has confirmed it.
  useEffect(() => {
    let cancelled = false;
    setDayFailed(false);
    userService
      .getCurrentUser()
      .then((user) => {
        if (!cancelled) setPlanningDay(user.planningDay ?? 7);
      })
      .catch(() => {
        if (!cancelled) setDayFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [dayAttempt]);

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

  const changeDay = (day: number) => {
    if (planningDay === null) return;
    const previous = planningDay;
    setPlanningDay(day);
    meService.setPlanningDay(day).catch(() => {
      setPlanningDay(previous);
      toast.error(t("saveError"));
    });
  };

  const changeDigest = (value: boolean) => {
    if (weeklyDigest === null) return;
    const previous = weeklyDigest;
    setWeeklyDigest(value);
    meService.setEmailPreferences(value).catch(() => {
      setWeeklyDigest(previous);
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

      <div className="flex items-center justify-between gap-3 rounded-xl bg-muted p-4">
        <div className="flex min-w-0 items-center gap-3">
          <CalendarClock className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0">
            <p className="font-medium text-foreground">{t("dayTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("dayDescription")}</p>
            {dayFailed && <LoadError onRetry={() => setDayAttempt((n) => n + 1)} />}
          </div>
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

      <div className="flex items-center justify-between gap-3 rounded-xl bg-muted p-4">
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
    </div>
  );
}
