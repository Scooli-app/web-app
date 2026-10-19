"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/shared/utils/utils";
import { AlertCircle, RotateCw } from "lucide-react";
import { useTranslations } from "next-intl";

interface LoadErrorProps {
  message?: string;
  onRetry: () => void;
  className?: string;
}

/**
 * Inline "this failed to load" state with a retry. Use it instead of an empty
 * state when a fetch fails, so a network problem never reads as "you have nothing".
 */
export function LoadError({ message, onRetry, className }: LoadErrorProps) {
  const t = useTranslations("common.loadError");

  return (
    <div
      role="status"
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground",
        className,
      )}
    >
      <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
      <span className="min-w-0 flex-1">{message ?? t("message")}</span>
      <Button type="button" variant="outline" size="sm" onClick={onRetry} className="gap-1.5">
        <RotateCw className="h-3.5 w-3.5" />
        {t("retry")}
      </Button>
    </div>
  );
}
