"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/utils/utils";
import { FeedbackSurveySentiment } from "@/shared/types/feedbackSurvey";

const COMMENT_MAX = 3000;

const EMOJI_KEYS: Array<{
  value: FeedbackSurveySentiment;
  emoji: string;
  labelKey: string;
}> = [
  { value: FeedbackSurveySentiment.FRUSTRATING, emoji: "😕", labelKey: "emojiFrustrating" },
  { value: FeedbackSurveySentiment.USEFUL_BUT_CAN_IMPROVE, emoji: "🙂", labelKey: "emojiOk" },
  { value: FeedbackSurveySentiment.VERY_USEFUL, emoji: "😍", labelKey: "emojiLove" },
];

interface FeatureFeedbackCardProps {
  isBusy: boolean;
  /** "Agora não" / dismiss — snoozes the prompt. */
  onDismiss: () => void;
  onSubmit: (payload: {
    sentiment: FeedbackSurveySentiment;
    comment?: string;
  }) => void;
}

export function FeatureFeedbackCard({
  isBusy,
  onDismiss,
  onSubmit,
}: FeatureFeedbackCardProps) {
  const t = useTranslations("feedback.featureCard");
  const [sentiment, setSentiment] = useState<FeedbackSurveySentiment | null>(null);
  const [comment, setComment] = useState("");

  const autoGrow = (el: HTMLTextAreaElement) => {
    const max = Math.round(window.innerHeight * 0.35);
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  };

  return (
    <div
      role="dialog"
      aria-label={t("ariaLabel")}
      className={cn(
        "fixed bottom-4 right-4 z-[110] w-[calc(100vw-2rem)] max-w-sm",
        "rounded-2xl border border-border bg-card p-4 shadow-xl shadow-black/10",
        "animate-in fade-in-0 slide-in-from-bottom-4 duration-300",
      )}
    >
      <button
        type="button"
        onClick={onDismiss}
        disabled={isBusy}
        aria-label={t("dismissAriaLabel")}
        className="absolute right-2.5 top-2.5 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
      >
        <X className="h-4 w-4" />
      </button>

      <p className="pr-6 text-sm font-semibold text-foreground">
        {t("prompt")}
      </p>

      <div className="mt-3 flex gap-2">
        {EMOJI_KEYS.map((option) => {
          const selected = sentiment === option.value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={isBusy}
              onClick={() => setSentiment(option.value)}
              title={t(option.labelKey as "emojiFrustrating" | "emojiOk" | "emojiLove")}
              aria-pressed={selected}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50",
                selected
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border bg-muted/50 hover:border-primary/30 hover:bg-accent/60",
              )}
            >
              <span
                className={cn(
                  "text-2xl leading-none transition-transform",
                  selected ? "scale-110" : "grayscale-[0.3]",
                )}
              >
                {option.emoji}
              </span>
              <span className="text-muted-foreground">{t(option.labelKey as "emojiFrustrating" | "emojiOk" | "emojiLove")}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3">
        <textarea
          value={comment}
          maxLength={COMMENT_MAX}
          disabled={isBusy}
          onChange={(e) => {
            setComment(e.target.value);
            autoGrow(e.currentTarget);
          }}
          placeholder={t("commentPlaceholder")}
          className="placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 min-h-[96px] w-full resize-none rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm outline-none transition-[color,box-shadow] focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
        />
        {comment.length > COMMENT_MAX * 0.8 && (
          <p className="mt-1 text-right text-[11px] text-muted-foreground">
            {comment.length}/{COMMENT_MAX}
          </p>
        )}
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isBusy}
          onClick={onDismiss}
          className="text-muted-foreground"
        >
          {t("dismiss")}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={isBusy || sentiment === null}
          onClick={() =>
            sentiment &&
            onSubmit({ sentiment, comment: comment.trim() || undefined })
          }
        >
          {isBusy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
          {t("send")}
        </Button>
      </div>
    </div>
  );
}
