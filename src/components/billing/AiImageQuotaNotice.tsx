"use client";

import { Button } from "@/components/ui/button";
import { useAccountAccess } from "@/hooks/useAccountAccess";
import { formatQuotaDate } from "@/lib/formatQuotaDate";
import { Routes } from "@/shared/types";
import { cn } from "@/shared/utils/utils";
import { ImageIcon, Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";

interface Props {
  /** "editor": dismissible strip above a presentation; "picker": inside the image dialog; "progress": while generating. */
  variant: "editor" | "picker" | "progress";
  /** Picker only: switch to the free image search. */
  onSearch?: () => void;
  className?: string;
}

const DISMISS_KEY = "scooli-ai-image-quota-dismissed";

/**
 * Explains why images are now stock photos (or why "Gerar imagem" is off) once the AI image cap ran out, and what
 * the teacher can do: wait for the renewal, search free photos, or (trial) subscribe. Renders nothing otherwise.
 */
export function AiImageQuotaNotice({ variant, onSearch, className }: Props) {
  const t = useTranslations("imageQuota");
  const locale = useLocale();
  const { aiImagesExhausted, aiImagesResetAt, isTrial } = useAccountAccess();
  // The renewal the teacher dismissed the strip for: it comes back after the next renewal runs out.
  const [dismissedFor, setDismissedFor] = useState<string | null>(() => {
    if (variant !== "editor") return null;
    try {
      return localStorage.getItem(DISMISS_KEY);
    } catch {
      return null;
    }
  });

  if (!aiImagesExhausted || (dismissedFor !== null && dismissedFor === aiImagesResetAt)) return null;

  const date = aiImagesResetAt ? formatQuotaDate(aiImagesResetAt, locale) : "";
  const title = t(isTrial ? "trialTitle" : "monthTitle");
  const body = t(isTrial ? `${variant}Trial` : `${variant}Month`, { date });

  const dismiss = () => {
    setDismissedFor(aiImagesResetAt);
    try {
      if (aiImagesResetAt) localStorage.setItem(DISMISS_KEY, aiImagesResetAt);
    } catch {
      // Private mode: it just comes back next time.
    }
  };

  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900/60 dark:bg-amber-950/30",
        className,
      )}
    >
      <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-muted-foreground">{body}</p>
        {(onSearch || isTrial) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {onSearch && (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={onSearch}>
                <Search className="h-3.5 w-3.5" aria-hidden />
                {t("searchFree")}
              </Button>
            )}
            {isTrial && (
              <Button size="sm" variant={onSearch ? "ghost" : "outline"} asChild>
                <Link href={Routes.CHECKOUT}>{t("subscribe")}</Link>
              </Button>
            )}
          </div>
        )}
      </div>
      {variant === "editor" && (
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("dismiss")}
          className="rounded p-1 text-muted-foreground hover:bg-amber-100 hover:text-foreground dark:hover:bg-amber-900/40"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  );
}
