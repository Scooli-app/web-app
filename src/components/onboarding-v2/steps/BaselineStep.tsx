"use client";

import { ChoiceChip } from "@/components/onboarding-v2/ChoiceChip";
import { OptionalBadge } from "@/components/onboarding-v2/OptionalBadge";
import { flushDraft } from "@/components/onboarding-v2/onboardingDraft";
import { baselineAnalytics } from "@/components/onboarding-v2/ritualState";
import { StepHeading } from "@/components/onboarding-v2/StepHeading";
import type { OnboardingFlowController } from "@/components/onboarding-v2/useOnboardingV2";
import { useStepFooter } from "@/components/onboarding-v2/useStepFooter";
import type { ClassCount, CurrentTool, PrepHoursPerWeek } from "@/shared/types/onboarding-v2";
import { useTranslations } from "next-intl";
import posthog from "posthog-js";
import { useEffect, type ReactNode } from "react";

const PREP_HOURS: PrepHoursPerWeek[] = ["LT2", "H2_5", "H5_10", "GT10"];
const TOOLS: CurrentTool[] = ["AI_CHAT", "PUBLISHER", "COLLEAGUES", "FROM_SCRATCH"];
const CLASS_COUNTS: ClassCount[] = ["C1_2", "C3_4", "C5_PLUS"];

interface QuestionProps {
  id: string;
  title: string;
  badge: string;
  children: ReactNode;
}

function Question({ id, title, badge, children }: QuestionProps) {
  return (
    <div role="group" aria-labelledby={id} className="space-y-1.5">
      <p id={id} className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
        {title}
        <OptionalBadge label={badge} />
      </p>
      {children}
    </div>
  );
}

interface BaselineStepProps {
  flow: OnboardingFlowController;
}

/** Step 5: three optional baseline questions (time spent, current tools, class count). */
export function BaselineStep({ flow }: BaselineStepProps) {
  const t = useTranslations("onboardingV2.baseline");
  const { ritual, updateRitual, trackCompleted, next } = flow;
  const { prepHours, currentTools, classCount } = ritual;

  // The answers live in the flow; leaving the step sends the debounced draft right away.
  useEffect(() => () => void flushDraft(), []);

  const toggleTool = (tool: CurrentTool) =>
    updateRitual(
      {
        currentTools: currentTools.includes(tool)
          ? currentTools.filter((item) => item !== tool)
          : [...currentTools, tool],
      },
      5,
    );

  const handleContinue = () => {
    const baseline = baselineAnalytics(ritual);
    trackCompleted(5, baseline);
    if (Object.keys(baseline).length > 0) posthog.setPersonProperties(baseline);
    next();
  };

  useStepFooter({ stepId: 5, canContinue: true, busy: false, onContinue: handleContinue });

  return (
    <div>
      <StepHeading title={t("title")} subtitle={t("subtitle")} />

      <div className="space-y-3 sm:space-y-4">
        <Question id="baseline-prep" title={t("prepTitle")} badge={t("optionalBadge")}>
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            {PREP_HOURS.map((value) => (
              <ChoiceChip
                key={value}
                selected={prepHours === value}
                onClick={() => updateRitual({ prepHours: value }, 5)}
                className="min-w-0 px-1"
              >
                {t(`prep.${value}`)}
              </ChoiceChip>
            ))}
          </div>
        </Question>

        <Question id="baseline-tools" title={t("toolsTitle")} badge={t("optionalBadge")}>
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            {TOOLS.map((tool) => (
              <ChoiceChip
                key={tool}
                showCheck
                selected={currentTools.includes(tool)}
                onClick={() => toggleTool(tool)}
                className="h-full min-w-0 px-2 text-center leading-tight"
              >
                {t(`tools.${tool}`)}
              </ChoiceChip>
            ))}
          </div>
        </Question>

        <Question id="baseline-classes" title={t("classTitle")} badge={t("optionalBadge")}>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {CLASS_COUNTS.map((value) => (
              <ChoiceChip
                key={value}
                selected={classCount === value}
                onClick={() => updateRitual({ classCount: value }, 5)}
                className="min-w-0 px-1"
              >
                {t(`classes.${value}`)}
              </ChoiceChip>
            ))}
          </div>
        </Question>
      </div>
    </div>
  );
}
