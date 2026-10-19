"use client";

import { Switch } from "@/components/ui/switch";
import { meService } from "@/services/api/me.service";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * The weekly-email switch (saved on change, optimistically). The planning-day picker that sat here
 * went away: the dashboard now always shows today and the next six days, whatever the day.
 */
export function PlanningRitualPreferences() {
  const t = useTranslations("settings.planning");
  const [weeklyDigest, setWeeklyDigest] = useState<boolean | null>(null);
  const [digestFailed, setDigestFailed] = useState(false);
  const [digestAttempt, setDigestAttempt] = useState(0);

  // The switch stays disabled until the server has confirmed the value.
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
