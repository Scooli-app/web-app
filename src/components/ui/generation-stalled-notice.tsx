"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Replaces an indefinite generation spinner once a document has been
 * "generating" for longer than the stall threshold.
 *
 * Refreshing is a full page reload, not a re-fetch: a re-fetch keeps the stuck
 * "generating" status on screen, while a reload re-attaches from scratch.
 */
export function GenerationStalledNotice() {
  const t = useTranslations("ui.generationStalled");

  return (
    <div role="status" className="flex flex-col items-center gap-3 px-4 text-center">
      <AlertTriangle className="h-8 w-8 text-amber-500" aria-hidden />
      <div>
        <p className="text-base font-medium text-foreground">{t("title")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.location.reload()}
        className="gap-1.5"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        {t("action")}
      </Button>
    </div>
  );
}
