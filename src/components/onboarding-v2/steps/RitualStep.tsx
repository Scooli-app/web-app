"use client";

import { ChoiceChip } from "@/components/onboarding-v2/ChoiceChip";
import { StepHeading } from "@/components/onboarding-v2/StepHeading";
import type { OnboardingFlowController } from "@/components/onboarding-v2/useOnboardingV2";
import { useStepFooter } from "@/components/onboarding-v2/useStepFooter";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useMotionSafe } from "@/lib/motion/useMotionSafe";
import { onboardingV2Service } from "@/services/api/onboarding-v2.service";
import type { AcquisitionSource, OnboardingGoal } from "@/shared/types/onboarding";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import posthog from "posthog-js";
import { useState } from "react";

const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;
const DEFAULT_PLANNING_DAY = 7;

const GOALS: OnboardingGoal[] = [
  "FASTER_DOCUMENTS",
  "AI_ASSISTANCE",
  "SAVE_TIME_TESTS",
  "REDUCE_REPETITIVE_WORK",
  "DISCOVER_COMMUNITY",
  "CURIOSITY",
];

const SOURCES: AcquisitionSource[] = [
  "SEARCH_ENGINE",
  "FACEBOOK",
  "INSTAGRAM",
  "LINKEDIN",
  "COLLEAGUE_FRIEND",
  "EDUCATION_SUMMIT",
  "AI_ASSISTANT",
  "OTHER",
];

interface RitualStepProps {
  flow: OnboardingFlowController;
  /** Called once the answers are saved; the shell plays the celebration. */
  onFinished: () => void;
}

export function RitualStep({ flow, onFinished }: RitualStepProps) {
  const t = useTranslations("onboardingV2");
  const tEnum = useTranslations("enums");
  const { reduce } = useMotionSafe();
  const { answers, trackCompleted } = flow;

  const [planningDay, setPlanningDay] = useState<number>(DEFAULT_PLANNING_DAY);
  const [weeklyEmail, setWeeklyEmail] = useState(true);
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [goals, setGoals] = useState<OnboardingGoal[]>([]);
  const [source, setSource] = useState<AcquisitionSource | null>(null);
  const [sourceOther, setSourceOther] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const handleFinish = async () => {
    if (saving) return;
    setSaving(true);
    setError(false);
    const otherText = source === "OTHER" ? sourceOther.trim() : "";
    try {
      await onboardingV2Service.complete({
        planningDay,
        weeklyEmail,
        goals: goals.length > 0 ? goals : null,
        acquisitionSource: source,
        acquisitionSourceOther: otherText || null,
        skippedClass: answers.skippedClass,
      });
      trackCompleted(5, {
        planning_day: planningDay,
        weekly_email: weeklyEmail,
        goals,
        acquisition_source: source,
      });
      posthog.capture("onboarding_v2_completed", {
        planning_day: planningDay,
        weekly_email: weeklyEmail,
        skipped_class: answers.skippedClass,
      });
      posthog.setPersonProperties({
        teacher_role: answers.role,
        has_school: !answers.noSchool,
        school_years: answers.years,
        planning_day: planningDay,
      });
      onFinished();
    } catch (err) {
      posthog.captureException(err);
      setError(true);
      setSaving(false);
    }
  };

  useStepFooter({
    stepId: 5,
    canContinue: true,
    busy: saving,
    continueLabel: t("ritual.finish"),
    onContinue: () => void handleFinish(),
  });

  const toggleGoal = (goal: OnboardingGoal) =>
    setGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal],
    );

  return (
    <div>
      <StepHeading title={t("ritual.title")} subtitle={t("ritual.subtitle")} />

      <div className="space-y-8">
        <div className="flex flex-wrap gap-2">
          {DAYS.map((day) => (
            <ChoiceChip
              key={day}
              selected={planningDay === day}
              onClick={() => setPlanningDay(day)}
              className="min-w-16"
            >
              {t(`ritual.days.${day}`)}
            </ChoiceChip>
          ))}
        </div>

        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-border bg-card p-4">
          <span className="space-y-1">
            <span className="block text-sm font-medium text-foreground">
              {t("ritual.emailLabel")}
            </span>
            <span className="block text-sm text-muted-foreground">
              {t("ritual.emailHint")}
            </span>
          </span>
          <Switch
            checked={weeklyEmail}
            onCheckedChange={setWeeklyEmail}
            aria-label={t("ritual.emailLabel")}
            className="mt-0.5"
          />
        </label>

        <div className="rounded-2xl border border-border">
          <button
            type="button"
            aria-expanded={optionalOpen}
            onClick={() => setOptionalOpen((open) => !open)}
            className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("ritual.optionalToggle")}
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${optionalOpen ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
          <AnimatePresence initial={false}>
            {optionalOpen && (
              <motion.div
                initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
                exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                transition={{ duration: reduce ? 0.15 : 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="space-y-6 px-4 pb-4 pt-1">
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">
                      {t("ritual.goalsTitle")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {GOALS.map((goal) => (
                        <ChoiceChip
                          key={goal}
                          selected={goals.includes(goal)}
                          showCheck
                          onClick={() => toggleGoal(goal)}
                        >
                          {tEnum(`onboardingGoal.${goal}`)}
                        </ChoiceChip>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">
                      {t("ritual.sourceTitle")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {SOURCES.map((value) => (
                        <ChoiceChip
                          key={value}
                          selected={source === value}
                          onClick={() => setSource(source === value ? null : value)}
                        >
                          {tEnum(`acquisitionSource.${value}`)}
                        </ChoiceChip>
                      ))}
                    </div>
                    {source === "OTHER" && (
                      <Input
                        value={sourceOther}
                        onChange={(event) => setSourceOther(event.target.value)}
                        placeholder={t("ritual.sourceOtherPlaceholder")}
                        maxLength={200}
                        className="h-11 rounded-xl px-4 text-base"
                      />
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {t("saveFailed")}
          </p>
        )}
      </div>
    </div>
  );
}
