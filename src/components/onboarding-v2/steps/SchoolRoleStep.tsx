"use client";

import { ChoiceChip } from "@/components/onboarding-v2/ChoiceChip";
import { SchoolIllustration } from "@/components/onboarding-v2/illustrations/StepIllustrations";
import { StepHeading } from "@/components/onboarding-v2/StepHeading";
import type { OnboardingFlowController } from "@/components/onboarding-v2/useOnboardingV2";
import { useStepFooter } from "@/components/onboarding-v2/useStepFooter";
import { Input } from "@/components/ui/input";
import { useMotionSafe } from "@/lib/motion/useMotionSafe";
import { onboardingV2Service } from "@/services/api/onboarding-v2.service";
import type { TeacherRole } from "@/shared/types/onboarding-v2";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

const ROLES: TeacherRole[] = ["teacher", "coordinator", "director", "tutor", "other"];
const SUGGEST_DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;

interface SchoolRoleStepProps {
  flow: OnboardingFlowController;
}

export function SchoolRoleStep({ flow }: SchoolRoleStepProps) {
  const t = useTranslations("onboardingV2.school");
  const { stagger, item } = useMotionSafe();
  const { answers, update, next, trackCompleted } = flow;
  const { schoolName, noSchool, role } = answers;

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [listOpen, setListOpen] = useState(false);
  const requestRef = useRef(0);

  const trimmed = schoolName.trim();

  // Debounced suggestions; a stale response never overwrites a newer query.
  useEffect(() => {
    const requestId = ++requestRef.current;
    if (noSchool || trimmed.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      return;
    }
    const timer = window.setTimeout(() => {
      onboardingV2Service
        .suggestSchools(trimmed)
        .then((result) => {
          if (requestRef.current === requestId) setSuggestions(result);
        })
        .catch(() => {
          if (requestRef.current === requestId) setSuggestions([]);
        });
    }, SUGGEST_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [trimmed, noSchool]);

  const valid = role !== null && (noSchool || trimmed.length >= MIN_QUERY_LENGTH);

  const handleContinue = () => {
    if (!valid) return;
    trackCompleted(1, {
      has_school: !noSchool,
      role,
      school_name_length: noSchool ? 0 : trimmed.length,
    });
    next();
  };

  useStepFooter({ stepId: 1, canContinue: valid, onContinue: handleContinue });

  const visibleSuggestions =
    listOpen && !noSchool
      ? suggestions
          .filter((name) => name.toLowerCase() !== trimmed.toLowerCase())
          .slice(0, 4)
      : [];

  return (
    <div>
      <StepHeading
        title={t("title")}
        subtitle={t("subtitle")}
        illustration={<SchoolIllustration />}
      />

      <div className="space-y-4 sm:space-y-6">
        <div className="space-y-2.5">
          <div className="relative">
            <Input
              value={schoolName}
              onChange={(event) => {
                update({ schoolName: event.target.value });
                setListOpen(true);
              }}
              onFocus={() => setListOpen(true)}
              placeholder={t("placeholder")}
              disabled={noSchool}
              autoComplete="off"
              maxLength={200}
              autoFocus
              aria-label={t("placeholder")}
              className="h-11 rounded-xl px-4 text-base"
            />
            {visibleSuggestions.length > 0 && (
              <motion.ul
                key={visibleSuggestions.join("|")}
                variants={stagger}
                initial="initial"
                animate="animate"
                className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-md"
              >
                {visibleSuggestions.map((name) => (
                  <motion.li key={name} variants={item}>
                    <button
                      type="button"
                      onClick={() => {
                        update({ schoolName: name });
                        setListOpen(false);
                      }}
                      className="flex min-h-10 w-full items-center px-4 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                    >
                      {name}
                    </button>
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </div>

          <ChoiceChip
            selected={noSchool}
            showCheck
            onClick={() => {
              const nextValue = !noSchool;
              update({ noSchool: nextValue, ...(nextValue ? { schoolName: "" } : {}) });
              setSuggestions([]);
            }}
          >
            {t("noSchool")}
          </ChoiceChip>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">{t("roleLabel")}</p>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((value) => (
              <ChoiceChip
                key={value}
                selected={role === value}
                onClick={() => update({ role: value })}
              >
                {t(`roles.${value}`)}
              </ChoiceChip>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
