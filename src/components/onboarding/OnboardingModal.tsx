"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ACQUISITION_SOURCE_LABELS,
  ONBOARDING_PROMPT_KEY,
  SUBJECT_AREA_LABELS,
  TEACHING_LEVEL_LABELS,
  type AcquisitionSource,
  type OnboardingSubmitRequest,
  type SubjectArea,
  type TeachingLevel,
} from "@/shared/types/onboarding";
import { cn } from "@/shared/utils/utils";
import {
  ArrowLeft,
  Bot,
  Facebook,
  GraduationCap,
  Instagram,
  Linkedin,
  Loader2,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

interface OnboardingModalProps {
  open: boolean;
  isBusy: boolean;
  onSkip: () => Promise<void> | void;
  onSubmit: (payload: OnboardingSubmitRequest) => Promise<void> | void;
}

type AcquisitionOption = {
  value: AcquisitionSource;
  label: string;
  icon: typeof Search;
  cardClassName: string;
  iconClassName: string;
};

const acquisitionOptions: AcquisitionOption[] = [
  {
    value: "SEARCH_ENGINE",
    label: ACQUISITION_SOURCE_LABELS.SEARCH_ENGINE,
    icon: Search,
    cardClassName:
      "border-blue-500/30 bg-blue-500/8 hover:border-blue-500/45 hover:bg-blue-500/12",
    iconClassName:
      "border-blue-500/25 bg-blue-500/14 text-blue-700 dark:text-blue-300",
  },
  {
    value: "FACEBOOK",
    label: ACQUISITION_SOURCE_LABELS.FACEBOOK,
    icon: Facebook,
    cardClassName:
      "border-blue-600/30 bg-blue-600/8 hover:border-blue-600/45 hover:bg-blue-600/12",
    iconClassName:
      "border-blue-600/25 bg-blue-600/14 text-blue-800 dark:text-blue-300",
  },
  {
    value: "INSTAGRAM",
    label: ACQUISITION_SOURCE_LABELS.INSTAGRAM,
    icon: Instagram,
    cardClassName:
      "border-pink-500/30 bg-pink-500/8 hover:border-pink-500/45 hover:bg-pink-500/12",
    iconClassName:
      "border-pink-500/25 bg-pink-500/14 text-pink-700 dark:text-pink-300",
  },
  {
    value: "LINKEDIN",
    label: ACQUISITION_SOURCE_LABELS.LINKEDIN,
    icon: Linkedin,
    cardClassName:
      "border-sky-600/30 bg-sky-600/8 hover:border-sky-600/45 hover:bg-sky-600/12",
    iconClassName:
      "border-sky-600/25 bg-sky-600/14 text-sky-700 dark:text-sky-300",
  },
  {
    value: "COLLEAGUE_FRIEND",
    label: ACQUISITION_SOURCE_LABELS.COLLEAGUE_FRIEND,
    icon: Users,
    cardClassName:
      "border-emerald-500/30 bg-emerald-500/8 hover:border-emerald-500/45 hover:bg-emerald-500/12",
    iconClassName:
      "border-emerald-500/25 bg-emerald-500/14 text-emerald-700 dark:text-emerald-300",
  },
  {
    value: "EDUCATION_SUMMIT",
    label: ACQUISITION_SOURCE_LABELS.EDUCATION_SUMMIT,
    icon: GraduationCap,
    cardClassName:
      "border-orange-500/30 bg-orange-500/8 hover:border-orange-500/45 hover:bg-orange-500/12",
    iconClassName:
      "border-orange-500/25 bg-orange-500/14 text-orange-700 dark:text-orange-300",
  },
  {
    value: "AI_ASSISTANT",
    label: ACQUISITION_SOURCE_LABELS.AI_ASSISTANT,
    icon: Bot,
    cardClassName:
      "border-violet-500/30 bg-violet-500/8 hover:border-violet-500/45 hover:bg-violet-500/12",
    iconClassName:
      "border-violet-500/25 bg-violet-500/14 text-violet-700 dark:text-violet-300",
  },
  {
    value: "OTHER",
    label: ACQUISITION_SOURCE_LABELS.OTHER,
    icon: Sparkles,
    cardClassName:
      "border-amber-400/28 bg-amber-400/8 hover:border-amber-400/42 hover:bg-amber-400/12",
    iconClassName:
      "border-amber-400/24 bg-amber-400/14 text-amber-700 dark:text-amber-400",
  },
];

const subjectAreaOptions: { value: SubjectArea; label: string }[] = [
  { value: "MATH", label: SUBJECT_AREA_LABELS.MATH },
  { value: "PORTUGUESE", label: SUBJECT_AREA_LABELS.PORTUGUESE },
  { value: "NATURAL_SCIENCES", label: SUBJECT_AREA_LABELS.NATURAL_SCIENCES },
  { value: "PHYSICS_CHEMISTRY", label: SUBJECT_AREA_LABELS.PHYSICS_CHEMISTRY },
  { value: "HISTORY", label: SUBJECT_AREA_LABELS.HISTORY },
  { value: "GEOGRAPHY", label: SUBJECT_AREA_LABELS.GEOGRAPHY },
  { value: "ENGLISH", label: SUBJECT_AREA_LABELS.ENGLISH },
  { value: "FRENCH", label: SUBJECT_AREA_LABELS.FRENCH },
  { value: "SPANISH", label: SUBJECT_AREA_LABELS.SPANISH },
  { value: "PHYSICAL_EDUCATION", label: SUBJECT_AREA_LABELS.PHYSICAL_EDUCATION },
  { value: "VISUAL_ARTS", label: SUBJECT_AREA_LABELS.VISUAL_ARTS },
  { value: "MUSIC", label: SUBJECT_AREA_LABELS.MUSIC },
  { value: "ICT", label: SUBJECT_AREA_LABELS.ICT },
  { value: "PHILOSOPHY", label: SUBJECT_AREA_LABELS.PHILOSOPHY },
  { value: "OTHER", label: SUBJECT_AREA_LABELS.OTHER },
];

const teachingLevelOptions: { value: TeachingLevel; label: string }[] = [
  { value: "1ST_CYCLE", label: TEACHING_LEVEL_LABELS["1ST_CYCLE"] },
  { value: "2ND_CYCLE", label: TEACHING_LEVEL_LABELS["2ND_CYCLE"] },
  { value: "3RD_CYCLE", label: TEACHING_LEVEL_LABELS["3RD_CYCLE"] },
  { value: "SECONDARY", label: TEACHING_LEVEL_LABELS.SECONDARY },
];

export function OnboardingModal({
  open,
  isBusy,
  onSkip,
  onSubmit,
}: OnboardingModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [acquisitionSource, setAcquisitionSource] =
    useState<AcquisitionSource | null>(null);
  const [acquisitionSourceOther, setAcquisitionSourceOther] = useState("");
  const [subjectAreas, setSubjectAreas] = useState<SubjectArea[]>([]);
  const [subjectAreaOther, setSubjectAreaOther] = useState("");
  const [teachingLevels, setTeachingLevels] = useState<TeachingLevel[]>([]);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setAcquisitionSource(null);
      setAcquisitionSourceOther("");
      setSubjectAreas([]);
      setSubjectAreaOther("");
      setTeachingLevels([]);
    }
  }, [open]);

  const handleSelectSource = (value: AcquisitionSource) => {
    setAcquisitionSource(value);
    if (value !== "OTHER") {
      setStep(2);
    }
  };

  const toggleSubjectArea = (value: SubjectArea) => {
    setSubjectAreas((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value],
    );
  };

  const toggleTeachingLevel = (value: TeachingLevel) => {
    setTeachingLevels((prev) =>
      prev.includes(value) ? prev.filter((l) => l !== value) : [...prev, value],
    );
  };

  const handleSubmit = async () => {
    if (!acquisitionSource || isBusy) {
      return;
    }

    await onSubmit({
      promptKey: ONBOARDING_PROMPT_KEY,
      acquisitionSource,
      subjectArea: subjectAreas.length > 0 ? subjectAreas : null,
      teachingLevel: teachingLevels.length > 0 ? teachingLevels : null,
      acquisitionSourceOther: acquisitionSource === "OTHER" && acquisitionSourceOther.trim() ? acquisitionSourceOther.trim() : null,
      subjectAreaOther: subjectAreas.includes("OTHER") && subjectAreaOther.trim() ? subjectAreaOther.trim() : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen && !isBusy) void onSkip(); }}>
      <DialogContent
        data-onboarding-modal
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        className="max-w-lg overflow-hidden border-border/80 bg-card p-0 shadow-xl shadow-black/10"
      >
        <div className="bg-gradient-to-br from-accent/80 via-card to-muted/60 px-5 pb-4 pt-5 sm:px-6 sm:pt-6 dark:from-accent/60 dark:via-card dark:to-background">
          <div className="flex items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <GraduationCap className="h-3.5 w-3.5" />
              Bem-vindo à Scooli
            </div>
            <div className="text-sm font-semibold text-muted-foreground">
              {step}/2
            </div>
          </div>

          <div className="mt-3 h-1.5 rounded-full bg-muted/80">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: step === 1 ? "50%" : "100%" }}
            />
          </div>

          <div className="mt-4 space-y-1">
            <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
              {step === 1
                ? "Como nos encontraste?"
                : "Conta-nos mais sobre ti"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {step === 1
                ? "Ajuda-nos a perceber onde os professores nos descobrem."
                : "Informação opcional. Ajuda-nos a melhorar a plataforma."}
            </DialogDescription>
          </div>
        </div>

        <div className="space-y-4 px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
          {step === 1 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {acquisitionOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = acquisitionSource === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelectSource(option.value)}
                      disabled={isBusy}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-foreground transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60",
                        option.cardClassName,
                        isSelected && "ring-2 ring-primary/40",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border shadow-sm",
                          option.iconClassName,
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium leading-tight">
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              {acquisitionSource === "OTHER" && (
                <Input
                  autoFocus
                  placeholder="Conta-nos onde nos encontraste... (opcional)"
                  value={acquisitionSourceOther}
                  onChange={(e) => setAcquisitionSourceOther(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && setStep(2)}
                  disabled={isBusy}
                  className="rounded-xl"
                />
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="mb-2.5 text-sm font-medium text-foreground">
                  Nível de ensino
                </p>
                <div className="flex flex-wrap gap-2">
                  {teachingLevelOptions.map((option) => {
                    const isSelected = teachingLevels.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={isBusy}
                        onClick={() => toggleTeachingLevel(option.value)}
                        className={cn(
                          "rounded-xl border px-3.5 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-45",
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
              </div>

              <div>
                <p className="mb-2.5 text-sm font-medium text-foreground">
                  Disciplinas que ensinas
                </p>
                <div className="flex flex-wrap gap-2">
                  {subjectAreaOptions.map((option) => {
                    const isSelected = subjectAreas.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={isBusy}
                        onClick={() => toggleSubjectArea(option.value)}
                        className={cn(
                          "rounded-xl border px-3.5 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-45",
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
                {subjectAreas.includes("OTHER") && (
                  <Input
                    autoFocus
                    placeholder="Qual é a tua disciplina? (opcional)"
                    value={subjectAreaOther}
                    onChange={(e) => setSubjectAreaOther(e.target.value)}
                    disabled={isBusy}
                    className="mt-2.5 rounded-xl"
                  />
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-3">
            <div>
              {step === 2 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStep(1)}
                  disabled={isBusy}
                  className="rounded-xl border-border bg-background"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void onSkip()}
                disabled={isBusy}
                className="rounded-xl text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                Saltar
              </Button>

              {step === 1 && acquisitionSource === "OTHER" && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setStep(2)}
                  disabled={isBusy}
                  className="rounded-xl px-4 shadow-sm"
                >
                  Próximo
                </Button>
              )}

              {step === 2 && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleSubmit()}
                  disabled={isBusy}
                  className="rounded-xl px-4 shadow-sm"
                >
                  {isBusy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      A guardar...
                    </>
                  ) : (
                    "Começar"
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
