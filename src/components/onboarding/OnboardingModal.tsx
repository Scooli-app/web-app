"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ACQUISITION_SOURCE_LABELS,
  ONBOARDING_GOAL_LABELS,
  ONBOARDING_PROMPT_KEY,
  SUBJECT_AREA_LABELS,
  TEACHING_LEVEL_LABELS,
  type AcquisitionSource,
  type OnboardingGoal,
  type OnboardingSubmitRequest,
  type SubjectArea,
  type TeachingLevel,
} from "@/shared/types/onboarding";
import { cn } from "@/shared/utils/utils";
import {
  ArrowLeft,
  ArrowRight,
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
import posthog from "posthog-js";
import { useEffect, useRef, useState } from "react";

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

const goalOptions: { value: OnboardingGoal; label: string; emoji: string }[] = [
  { value: "FASTER_DOCUMENTS", label: ONBOARDING_GOAL_LABELS.FASTER_DOCUMENTS, emoji: "⚡" },
  { value: "AI_ASSISTANCE", label: ONBOARDING_GOAL_LABELS.AI_ASSISTANCE, emoji: "🤖" },
  { value: "SAVE_TIME_TESTS", label: ONBOARDING_GOAL_LABELS.SAVE_TIME_TESTS, emoji: "📝" },
  { value: "REDUCE_REPETITIVE_WORK", label: ONBOARDING_GOAL_LABELS.REDUCE_REPETITIVE_WORK, emoji: "♻️" },
  { value: "DISCOVER_COMMUNITY", label: ONBOARDING_GOAL_LABELS.DISCOVER_COMMUNITY, emoji: "🌐" },
  { value: "CURIOSITY", label: ONBOARDING_GOAL_LABELS.CURIOSITY, emoji: "✨" },
];

const TOTAL_STEPS = 3;

const stepMeta = {
  1: {
    title: "Como nos encontraste?",
    description: "Ajuda-nos a perceber onde os professores nos descobrem.",
    eyebrow: "Bem-vindo à Scooli 👋",
  },
  2: {
    title: "Conta-nos sobre ti",
    description: "Opcional — ajuda-nos a personalizar a tua experiência.",
    eyebrow: "O teu perfil",
  },
  3: {
    title: "O que procuras na Scooli?",
    description: "Seleciona tudo o que se aplica. Podes escolher várias opções.",
    eyebrow: "Os teus objetivos",
  },
} as const;

export function OnboardingModal({
  open,
  isBusy,
  onSkip,
  onSubmit,
}: OnboardingModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [animKey, setAnimKey] = useState(0);

  const [acquisitionSource, setAcquisitionSource] =
    useState<AcquisitionSource | null>(null);
  const [acquisitionSourceOther, setAcquisitionSourceOther] = useState("");
  const [subjectAreas, setSubjectAreas] = useState<SubjectArea[]>([]);
  const [subjectAreaOther, setSubjectAreaOther] = useState("");
  const [teachingLevels, setTeachingLevels] = useState<TeachingLevel[]>([]);
  const [goals, setGoals] = useState<OnboardingGoal[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setDirection("forward");
      setAnimKey(0);
      setAcquisitionSource(null);
      setAcquisitionSourceOther("");
      setSubjectAreas([]);
      setSubjectAreaOther("");
      setTeachingLevels([]);
      setGoals([]);
    }
  }, [open]);

  // Scroll content to top on step change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [step]);

  // Track step views
  useEffect(() => {
    if (!open) return;
    posthog.capture("onboarding_step_viewed", { step });
  }, [open, step]);

  const goTo = (next: 1 | 2 | 3, dir: "forward" | "backward") => {
    if (dir === "forward") {
      posthog.capture("onboarding_step_completed", { step });
    }
    setDirection(dir);
    setAnimKey((k) => k + 1);
    setStep(next);
  };

  const handleSkipWithTracking = () => {
    posthog.capture("onboarding_skipped", { step });
    void onSkip();
  };

  const handleSelectSource = (value: AcquisitionSource) => {
    setAcquisitionSource(value);
    if (value !== "OTHER") {
      goTo(2, "forward");
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

  const toggleGoal = (value: OnboardingGoal) => {
    setGoals((prev) =>
      prev.includes(value) ? prev.filter((g) => g !== value) : [...prev, value],
    );
  };

  const handleSubmit = async () => {
    if (!acquisitionSource || isBusy) return;
    await onSubmit({
      promptKey: ONBOARDING_PROMPT_KEY,
      acquisitionSource,
      subjectArea: subjectAreas.length > 0 ? subjectAreas : null,
      teachingLevel: teachingLevels.length > 0 ? teachingLevels : null,
      acquisitionSourceOther:
        acquisitionSource === "OTHER" && acquisitionSourceOther.trim()
          ? acquisitionSourceOther.trim()
          : null,
      subjectAreaOther:
        subjectAreas.includes("OTHER") && subjectAreaOther.trim()
          ? subjectAreaOther.trim()
          : null,
      goals: goals.length > 0 ? goals : null,
    });
  };

  if (!open) return null;

  const meta = stepMeta[step];

  const slideInClass =
    direction === "forward"
      ? "animate-in fade-in-0 slide-in-from-right-6 duration-300"
      : "animate-in fade-in-0 slide-in-from-left-6 duration-300";

  return (
    <div
      data-onboarding-modal
      className="fixed inset-0 z-[9999] flex flex-col bg-background"
      aria-modal="true"
      role="dialog"
      aria-label="Bem-vindo à Scooli"
    >
      {/* Subtle background decoration */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden="true"
      >
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary/6 blur-3xl" />
      </div>

      {/* ── Top bar ── */}
      <header className="relative z-10 flex h-16 shrink-0 items-center justify-between px-6 sm:px-10">
        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/scooli.svg"
          alt="Scooli"
          className="h-7 w-auto"
          draggable={false}
        />

        {/* Step dots */}
        <div className="flex items-center gap-2" aria-label={`Passo ${step} de ${TOTAL_STEPS}`}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={cn(
                "rounded-full transition-all duration-300",
                i + 1 === step
                  ? "h-2.5 w-6 bg-primary"
                  : i + 1 < step
                    ? "h-2 w-2 bg-primary/50"
                    : "h-2 w-2 bg-muted-foreground/25",
              )}
            />
          ))}
        </div>

        {/* Skip */}
        <button
          type="button"
          onClick={handleSkipWithTracking}
          disabled={isBusy}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          Saltar
        </button>
      </header>

      {/* ── Main scrollable content ── */}
      <main
        ref={scrollRef}
        className="relative z-10 flex-1 overflow-y-auto"
      >
        <div className="mx-auto w-full max-w-2xl px-6 py-10 sm:px-10 sm:py-14">
          {/* Step header */}
          <div
            key={`header-${animKey}`}
            className={cn("mb-8", slideInClass)}
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary/80">
              {meta.eyebrow}
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {meta.title}
            </h1>
            <p className="mt-2 text-base text-muted-foreground">
              {meta.description}
            </p>
          </div>

          {/* Step content */}
          <div
            key={`content-${animKey}`}
            className={cn(slideInClass, "fill-mode-both")}
            style={{ animationDelay: "40ms" }}
          >
            {/* ── Step 1: acquisition source ── */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
                          "group flex flex-col items-center gap-3 rounded-2xl border p-4 text-center text-foreground transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60",
                          option.cardClassName,
                          isSelected && "ring-2 ring-primary/50 shadow-md",
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-sm transition-transform group-hover:scale-110",
                            option.iconClassName,
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-medium leading-tight">
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {acquisitionSource === "OTHER" && (
                  <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
                    <Input
                      autoFocus
                      placeholder="Conta-nos onde nos encontraste... (opcional)"
                      value={acquisitionSourceOther}
                      onChange={(e) => setAcquisitionSourceOther(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && goTo(2, "forward")}
                      disabled={isBusy}
                      className="rounded-xl text-base"
                    />
                  </div>
                )}
              </div>
            )}

            {/* ── Step 2: teaching level + subjects ── */}
            {step === 2 && (
              <div className="space-y-8">
                <div>
                  <p className="mb-3 text-sm font-semibold text-foreground">
                    Nível de ensino
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {teachingLevelOptions.map((option) => {
                      const isSelected = teachingLevels.includes(option.value);
                      return (
                        <button
                          key={option.value}
                          type="button"
                          disabled={isBusy}
                          onClick={() => toggleTeachingLevel(option.value)}
                          className={cn(
                            "rounded-2xl border px-5 py-2.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-45",
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground shadow-sm scale-[1.02]"
                              : "border-border bg-muted/50 text-foreground hover:border-primary/30 hover:bg-accent/80",
                          )}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-sm font-semibold text-foreground">
                    Disciplinas que ensinas
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {subjectAreaOptions.map((option) => {
                      const isSelected = subjectAreas.includes(option.value);
                      return (
                        <button
                          key={option.value}
                          type="button"
                          disabled={isBusy}
                          onClick={() => toggleSubjectArea(option.value)}
                          className={cn(
                            "rounded-2xl border px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-45",
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground shadow-sm scale-[1.02]"
                              : "border-border bg-muted/50 text-foreground hover:border-primary/30 hover:bg-accent/80",
                          )}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                  {subjectAreas.includes("OTHER") && (
                    <div className="mt-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
                      <Input
                        autoFocus
                        placeholder="Qual é a tua disciplina? (opcional)"
                        value={subjectAreaOther}
                        onChange={(e) => setSubjectAreaOther(e.target.value)}
                        disabled={isBusy}
                        className="rounded-xl text-base"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Step 3: goals ── */}
            {step === 3 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {goalOptions.map((option) => {
                  const isSelected = goals.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={isBusy}
                      onClick={() => toggleGoal(option.value)}
                      className={cn(
                        "flex items-center gap-4 rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-45",
                        isSelected
                          ? "border-primary bg-primary/8 shadow-sm ring-1 ring-primary/30"
                          : "border-border bg-muted/40 text-foreground hover:border-primary/25 hover:bg-accent/60",
                      )}
                    >
                      <span className="text-2xl leading-none select-none" aria-hidden="true">
                        {option.emoji}
                      </span>
                      <span className="text-sm font-medium leading-snug text-foreground">
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Bottom navigation bar ── */}
      <footer className="relative z-10 flex h-20 shrink-0 items-center justify-between border-t border-border/60 bg-background/80 px-6 backdrop-blur-sm sm:px-10">
        {/* Back */}
        <div className="w-28">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => goTo((step - 1) as 1 | 2 | 3, "backward")}
              disabled={isBusy}
              className="rounded-xl border-border bg-background"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          )}
        </div>

        {/* Step counter */}
        <span className="text-sm tabular-nums text-muted-foreground">
          {step} / {TOTAL_STEPS}
        </span>

        {/* Next / Submit */}
        <div className="flex w-28 justify-end">
          {step === 1 && acquisitionSource === "OTHER" && (
            <Button
              type="button"
              onClick={() => goTo(2, "forward")}
              disabled={isBusy}
              className="rounded-xl px-5 shadow-sm"
            >
              Próximo
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}

          {step === 2 && (
            <Button
              type="button"
              onClick={() => goTo(3, "forward")}
              disabled={isBusy}
              className="rounded-xl px-5 shadow-sm"
            >
              Próximo
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}

          {step === 3 && (
            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isBusy}
              className="rounded-xl px-5 shadow-sm"
            >
              {isBusy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  A guardar...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Começar
                </>
              )}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
