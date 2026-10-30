"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/shared/utils/utils";
import { canRestoreVersion, versionLabelKey } from "@/shared/utils/document-versions";
import type { DocumentVersionSummary } from "@/shared/types/document-versions";
import { RotateCcw } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";

interface RowProps {
  version: DocumentVersionSummary;
  selected: boolean;
  onSelect: (version: DocumentVersionSummary) => void;
}

/** One version in the list. Shows the kind, relative time (full date on hover) and the "Atual" badge. */
export function DocumentVersionRow({ version, selected, onSelect }: RowProps) {
  const t = useTranslations("editor.documentVersions");
  const format = useFormatter();
  // An explicit "now" (refreshed each minute): without one next-intl warns and falls back to the render time.
  const now = useNow({ updateInterval: 60_000 });
  const createdAt = new Date(version.createdAt);
  const fullDate = format.dateTime(createdAt, { dateStyle: "long", timeStyle: "short" });
  const isCurrent = version.status === "current";

  return (
    <button
      type="button"
      onClick={() => onSelect(version)}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
        "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        selected ? "border-primary bg-primary/5" : "border-border bg-card"
      )}
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm font-medium text-foreground">
          {t(`kind.${versionLabelKey(version)}`)}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <time dateTime={version.createdAt} className="text-xs text-muted-foreground">
              {format.relativeTime(createdAt, now)}
            </time>
          </TooltipTrigger>
          <TooltipContent>{fullDate}</TooltipContent>
        </Tooltip>
      </span>
      {isCurrent && <Badge variant="secondary">{t("currentBadge")}</Badge>}
    </button>
  );
}

interface RestoreProps {
  version: DocumentVersionSummary;
  onRestore: (version: DocumentVersionSummary) => void;
}

/** Restore action for a preview. Hidden on the current version. */
export function DocumentVersionRestoreButton({ version, onRestore }: RestoreProps) {
  const t = useTranslations("editor.documentVersions");

  if (!canRestoreVersion(version)) return null;

  return (
    <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => onRestore(version)}>
      <RotateCcw className="h-3.5 w-3.5" />
      {t("restoreButton")}
    </Button>
  );
}
