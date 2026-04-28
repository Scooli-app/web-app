"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  APP_FEEDBACK_SURVEY_PROMPT_KEY,
  FeedbackSurveySentiment,
  type FeedbackSurveySubmitRequest,
  type FeedbackSurveyTag,
} from "@/shared/types/feedbackSurvey";
import { cn } from "@/shared/utils/utils";
import {
  ArrowLeft,
  BadgeCheck,
  Clock3,
  Frown,
  HeartHandshake,
  Lightbulb,
  Loader2,
  Sparkles,
  ThumbsUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface AppFeedbackSurveyModalProps {
  open: boolean;
  isBusy: boolean;
  onMaybeLater: () => Promise<void> | void;
  onSubmit: (payload: FeedbackSurveySubmitRequest) => Promise<void> | void;
}

type SentimentOption = {
  value: FeedbackSurveySentiment;
  label: string;
  hint: string;
  icon: typeof HeartHandshake;
  cardClassName: string;
  iconClassName: string;
};

type TagOption = {
  value: FeedbackSurveyTag;
  label: string;
};

const sentimentOptions: SentimentOption[] = [
  {
    value: FeedbackSurveySentiment.VERY_USEFUL,
    label: "Muito útil",
    hint: "Está mesmo a ajudar-me no dia a dia.",
    icon: HeartHandshake,
    cardClassName:
      "border-emerald-500/30 bg-emerald-500/12 hover:border-emerald-500/45 hover:bg-emerald-500/18",
    iconClassName:
      "border-emerald-500/25 bg-emerald-500/18 text-emerald-700 dark:text-emerald-300",
  },
  {
    value: FeedbackSurveySentiment.USEFUL_BUT_CAN_IMPROVE,
    label: "Útil, mas pode melhorar",
    hint: "Já traz valor, mas ainda há margem para evoluir.",
    icon: ThumbsUp,
    cardClassName:
      "border-lime-400/26 bg-lime-400/8 hover:border-lime-400/40 hover:bg-lime-400/12",
    iconClassName:
      "border-lime-400/24 bg-lime-400/12 text-lime-700 dark:text-lime-300",
  },
  {
    value: FeedbackSurveySentiment.NOT_SURE_YET,
    label: "Ainda não percebi bem",
    hint: "Ainda estou a tentar encaixar a Scooli no meu fluxo.",
    icon: Lightbulb,
    cardClassName:
      "border-amber-400/25 bg-amber-400/10 hover:border-amber-400/40 hover:bg-amber-400/14",
    iconClassName:
      "border-amber-400/20 bg-amber-400/14 text-amber-700 dark:text-amber-400",
  },
  {
    value: FeedbackSurveySentiment.FRUSTRATING,
    label: "Está a ser frustrante",
    hint: "Há obstáculos a impedir-me de aproveitar a plataforma.",
    icon: Frown,
    cardClassName:
      "border-red-500/25 bg-red-500/10 hover:border-red-500/40 hover:bg-red-500/14",
    iconClassName:
      "border-red-500/20 bg-red-500/14 text-red-700 dark:text-red-400",
  },
];

const positiveTagOptions: TagOption[] = [
  { value: "saves_time", label: "Poupa-me tempo" },
  { value: "good_content_quality", label: "Os conteúdos são bons" },
  { value: "easy_to_use", label: "É simples de usar" },
  { value: "easy_to_edit", label: "Consigo editar facilmente" },
  {
    value: "has_needed_document_types",
    label: "Tem os tipos de documento que preciso",
  },
];

const improvementTagOptions: TagOption[] = [
  {
    value: "quality_not_good_enough",
    label: "Os resultados ainda não têm qualidade suficiente",
  },
  { value: "platform_confusing", label: "A plataforma é confusa" },
  { value: "too_slow", label: "Está lenta" },
  { value: "found_bugs", label: "Encontrei erros" },
  { value: "missing_features", label: "Faltam funcionalidades" },
];

export function AppFeedbackSurveyModal({
  open,
  isBusy,
  onMaybeLater,
  onSubmit,
}: AppFeedbackSurveyModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [sentiment, setSentiment] = useState<FeedbackSurveySentiment | null>(
    null,
  );
  const [selectedTags, setSelectedTags] = useState<FeedbackSurveyTag[]>([]);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!open) {
      setStep(1);
      setSentiment(null);
      setSelectedTags([]);
      setComment("");
    }
  }, [open]);

  const isPositivePath =
    sentiment === FeedbackSurveySentiment.VERY_USEFUL ||
    sentiment === FeedbackSurveySentiment.USEFUL_BUT_CAN_IMPROVE;

  const tagOptions = useMemo(
    () => (isPositivePath ? positiveTagOptions : improvementTagOptions),
    [isPositivePath],
  );

  const canSubmit = selectedTags.length > 0 && sentiment !== null && !isBusy;

  const handleSelectSentiment = (value: FeedbackSurveySentiment) => {
    setSentiment(value);
    setSelectedTags([]);
    setComment("");
    setStep(2);
  };

  const toggleTag = (value: FeedbackSurveyTag) => {
    setSelectedTags((current) => {
      if (current.includes(value)) {
        return current.filter((tag) => tag !== value);
      }

      if (current.length >= 2) {
        return current;
      }

      return [...current, value];
    });
  };

  const handleSubmit = async () => {
    if (!sentiment || selectedTags.length === 0 || isBusy) {
      return;
    }

    await onSubmit({
      promptKey: APP_FEEDBACK_SURVEY_PROMPT_KEY,
      sentiment,
      selectedTags,
      comment: comment.trim() || undefined,
    });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      return;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        data-feedback-survey-modal
        hideCloseButton
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        className="max-w-xl overflow-hidden border-border/80 bg-card p-0 shadow-xl shadow-black/10"
      >
        <div className="bg-gradient-to-br from-accent/80 via-card to-muted/60 px-6 pb-5 pt-6 sm:px-8 sm:pt-7 dark:from-accent/60 dark:via-card dark:to-background">
          <div className="flex items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" />
              Leva menos de 20 segundos
            </div>
            <div className="text-sm font-semibold text-muted-foreground">
              {step}/2
            </div>
          </div>

          <div className="mt-4 h-2 rounded-full bg-muted/80">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: step === 1 ? "50%" : "100%" }}
            />
          </div>

          <div className="mt-5 space-y-2">
            <div
              className={cn(
                "inline-flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm",
                step === 1
                  ? "border-primary/10 bg-primary/10 text-primary"
                  : "border-border bg-background text-primary",
              )}
            >
              {step === 1 ? (
                <Sparkles className="h-6 w-6" />
              ) : (
                <BadgeCheck className="h-6 w-6" />
              )}
            </div>

            <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground">
              {step === 1
                ? "Como tem sido a tua experiência com a Scooli?"
                : isPositivePath
                  ? "O que mais te tem ajudado?"
                  : "O que mais te está a bloquear?"}
            </DialogTitle>

            <DialogDescription className="max-w-lg text-sm leading-6 text-muted-foreground">
              {step === 1
                ? "A tua resposta ajuda-nos a perceber rapidamente o que está a funcionar e o que precisa de atenção."
                : isPositivePath
                  ? "Escolhe até 2 opções. Queremos perceber o que já está a gerar valor real."
                  : "Escolhe até 2 opções. Queremos ir direto aos maiores pontos de fricção."}
            </DialogDescription>
          </div>
        </div>

        <div className="space-y-6 px-6 pb-6 pt-5 sm:px-8 sm:pb-8">
          {step === 1 ? (
            <div className="grid gap-3">
              {sentimentOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelectSentiment(option.value)}
                    disabled={isBusy}
                    className={cn(
                      "group flex w-full items-start gap-4 rounded-2xl border px-4 py-4 text-left text-foreground transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60",
                      option.cardClassName,
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-sm transition-transform group-hover:scale-[1.02]",
                        option.iconClassName,
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-base font-semibold">{option.label}</div>
                      <div className="mt-1 text-sm leading-5 text-muted-foreground">
                        {option.hint}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2 text-xs font-medium text-muted-foreground">
                <span className="rounded-full border border-border bg-muted/70 px-3 py-1">
                  Selecionadas: {selectedTags.length}/2
                </span>
                <span className="rounded-full border border-border bg-muted/70 px-3 py-1">
                  Resposta rápida
                </span>
              </div>

              <div className="flex flex-wrap gap-3">
                {tagOptions.map((option) => {
                  const isSelected = selectedTags.includes(option.value);
                  const isDisabled =
                    !isSelected && selectedTags.length >= 2 && !isBusy;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={isBusy || isDisabled}
                      onClick={() => toggleTag(option.value)}
                      className={cn(
                        "rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-45",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-border bg-muted/60 text-foreground hover:border-primary/20 hover:bg-accent/70",
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="feedback-survey-comment"
                  className="text-sm font-medium text-foreground"
                >
                  Se quiser, diga-nos numa frase o que faria mais diferença.
                </label>
                <Textarea
                  id="feedback-survey-comment"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Opcional"
                  className="min-h-[110px] rounded-2xl border-border bg-muted/50 px-4 py-3 text-foreground placeholder:text-muted-foreground"
                  disabled={isBusy}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              {step === 2 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={isBusy}
                  className="rounded-xl border-border bg-background"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="ghost"
                onClick={() => void onMaybeLater()}
                disabled={isBusy}
                className="rounded-xl text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                Talvez mais tarde
              </Button>

              {step === 2 && (
                <Button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={!canSubmit}
                  className="h-11 rounded-xl px-5 shadow-sm"
                >
                  {isBusy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      A enviar...
                    </>
                  ) : (
                    "Enviar feedback"
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
