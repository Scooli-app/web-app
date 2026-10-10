"use client";

import { RitualIllustration } from "@/components/onboarding-v2/illustrations/StepIllustrations";
import { ChoiceChip } from "@/components/onboarding-v2/ChoiceChip";
import { StepHeading } from "@/components/onboarding-v2/StepHeading";
import type { OnboardingFlowController } from "@/components/onboarding-v2/useOnboardingV2";
import { useStepFooter } from "@/components/onboarding-v2/useStepFooter";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { onboardingV2Service } from "@/services/api/onboarding-v2.service";
import type { AcquisitionSource, OnboardingGoal } from "@/shared/types/onboarding";
import { AlertCircle, Check, Loader2 } from "lucide-react";
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

function OptionalBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
      {label}
    </span>
  );
}

/** Small inline status of the background plan generation started in step 3. */
function PlanStatus({ overall }: { overall: "working" | "done" | "failed" }) {
  const t = useTranslations("onboardingV2.ritual");
  return (
    <p
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-sm text-foreground"
    >
      {overall === "working" && (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
      )}
      {overall === "done" && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />}
      {overall === "failed" && (
        <AlertCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
      )}
      <span>{t(`planStatus.${overall}`)}</span>
    </p>
  );
}

interface RitualStepProps {
  flow: OnboardingFlowController;
  /** Called once the answers are saved; the shell plays the celebration. */
  onFinished: () => void;
}

export function RitualStep({ flow, onFinished }: RitualStepProps) {
  const t = useTranslations("onboardingV2");
  const tEnum = useTranslations("enums");
  const { answers, trackCompleted, generation } = flow;
  const hasPlan = answers.timetableId !== null && !answers.skippedClass;

  const [planningDay, setPlanningDay] = useState<number>(DEFAULT_PLANNING_DAY);
  const [weeklyEmail, setWeeklyEmail] = useState(true);
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
      <StepHeading
        title={t("ritual.title")}
        subtitle={t("ritual.subtitle")}
        illustration={<RitualIllustration />}
      />

      <div className="space-y-8">
        {hasPlan && <PlanStatus overall={generation.overall} />}

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

        <div className="space-y-6">
          <div className="space-y-3">
            <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
              {t("ritual.goalsTitle")}
              <OptionalBadge label={t("ritual.optionalBadge")} />
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
            <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
              {t("ritual.sourceTitle")}
              <OptionalBadge label={t("ritual.optionalBadge")} />
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

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {t("saveFailed")}
          </p>
        )}
      </div>
    </div>
  );
}
