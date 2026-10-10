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
  const [planningDay, setPlanningDay] = useState(7);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      userService.getCurrentUser().catch(() => null),
      meService.getEmailPreferences().catch(() => null),
    ]).then(([user, prefs]) => {
      if (cancelled) return;
      if (user) setPlanningDay(user.planningDay ?? 7);
      if (prefs) setWeeklyDigest(prefs.weeklyDigest);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const changeDay = (day: number) => {
    const previous = planningDay;
    setPlanningDay(day);
    meService.setPlanningDay(day).catch(() => {
      setPlanningDay(previous);
      toast.error(t("saveError"));
    });
  };

  const changeDigest = (value: boolean) => {
    const previous = weeklyDigest;
    setWeeklyDigest(value);
    meService.setEmailPreferences(value).catch(() => {
      setWeeklyDigest(previous);
      toast.error(t("saveError"));
    });
  };

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
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={!loaded}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium capitalize text-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
            >
              {weekdayName(planningDay, locale)}
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
        </div>
        <Switch
          aria-labelledby="weekly-digest-label"
          checked={weeklyDigest}
          disabled={!loaded}
          onCheckedChange={changeDigest}
        />
      </div>
    </div>
  );
}
