"use client";

import type { Locale } from "@/i18n/locales";
import { Button } from "@/components/ui/button";
import type { ReviewItem } from "@/shared/types/review-feed";
import { CalendarClock, FileText, Lightbulb, Loader2, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { lessonDateLabel, reviewAction, type ReviewAction } from "./reviewFeedLogic";

const KIND_ICON: Record<ReviewItem["kind"], LucideIcon> = {
  replan: CalendarClock,
  document_suggestion: FileText,
  topic_proposal: Lightbulb,
};

interface ReviewFeedRowProps {
  item: ReviewItem;
  locale: Locale;
  onAction: (item: ReviewItem, action: ReviewAction) => void;
}

/** One item of "Por rever": kind icon, title, lesson date, a muted summary, and the one action. */
export function ReviewFeedRow({ item, locale, onAction }: ReviewFeedRowProps) {
  const t = useTranslations("reviewFeed");
  const tReplan = useTranslations("replan");
  const Icon = KIND_ICON[item.kind];
  const action = reviewAction(item);
  const date = lessonDateLabel(item.slotDate, locale);

  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {item.title}
          {date && <span className="ml-2 text-xs font-normal text-muted-foreground">{date}</span>}
        </p>
        {item.summary && <p className="truncate text-xs text-muted-foreground">{item.summary}</p>}
      </div>

      {action.kind === "generating" ? (
        <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden />
          {t("preparing")}
        </span>
      ) : action.kind === "none" ? null : (
        <Button
          size="sm"
          variant={action.kind === "dismiss" ? "ghost" : action.kind === "shiftFallback" ? "outline" : "default"}
          className="h-8 shrink-0"
          onClick={() => onAction(item, action)}
        >
          {action.kind === "shiftFallback"
            ? tReplan("shiftFallback")
            : action.kind === "dismiss"
              ? tReplan("dismiss")
              : tReplan("review")}
        </Button>
      )}
    </li>
  );
}
