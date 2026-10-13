"use client";

import { MultiSelectPopover } from "@/components/onboarding-v2/MultiSelectPopover";
import { ChoiceChip } from "@/components/onboarding-v2/ChoiceChip";
import { SubjectsIllustration } from "@/components/onboarding-v2/illustrations/StepIllustrations";
import { clearStepTwoSelection } from "@/components/onboarding-v2/onboardingStorage";
import { StepHeading } from "@/components/onboarding-v2/StepHeading";
import type { OnboardingFlowController } from "@/components/onboarding-v2/useOnboardingV2";
import { useStepFooter } from "@/components/onboarding-v2/useStepFooter";
import {
  SUBJECTS,
  SUBJECTS_BY_GRADE,
  translateSubjectLabel,
} from "@/components/document-creation/constants";
import { buildRegularTeachingItems } from "@/components/document-creation/teaching-profile-preferences";
import { onboardingV2Service } from "@/services/api/onboarding-v2.service";
import { useAuth } from "@clerk/nextjs";
import posthog from "posthog-js";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";

const ALL_YEARS = Array.from({ length: 12 }, (_, index) => index + 1);

interface TeachingStepProps {
  flow: OnboardingFlowController;
  /** Called once the profile is saved: the shell closes (profile mode) or advances. */
  onProfileSaved: () => void;
}

export function TeachingStep({ flow, onProfileSaved }: TeachingStepProps) {
  const t = useTranslations("onboardingV2");
  const { answers, update, trackCompleted } = flow;
  const { userId } = useAuth();
  const { years, subjectIds } = answers;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const submittingRef = useRef(false);

  // Subjects offered = union over the selected years, in catalogue order.
  const availableSubjectIds = useMemo(() => {
    const available = new Set<string>();
    for (const year of years) {
      for (const id of SUBJECTS_BY_GRADE[String(year)] ?? []) available.add(id);
    }
    return SUBJECTS.map((subject) => subject.id).filter((id) => available.has(id));
  }, [years]);

  const toggleYear = (year: number) => {
    const nextYears = years.includes(year)
      ? years.filter((y) => y !== year)
      : [...years, year].sort((a, b) => a - b);
    const stillAvailable = new Set<string>();
    for (const y of nextYears) {
      for (const id of SUBJECTS_BY_GRADE[String(y)] ?? []) stillAvailable.add(id);
    }
    update({
      years: nextYears,
      subjectIds: subjectIds.filter((id) => stillAvailable.has(id)),
    });
  };

  const toggleSubject = (id: string) => {
    update({
      subjectIds: subjectIds.includes(id)
        ? subjectIds.filter((s) => s !== id)
        : [...subjectIds, id],
    });
  };

  const valid = years.length > 0 && subjectIds.length > 0;

  const handleContinue = async () => {
    if (!valid || saving || submittingRef.current || !answers.role) return;
    submittingRef.current = true;
    setSaving(true);
    setError(false);
    try {
      await onboardingV2Service.saveProfile({
        schoolName: answers.noSchool ? null : answers.schoolName.trim(),
        noSchool: answers.noSchool,
        teacherRole: answers.role,
        schoolYears: years,
        items: buildRegularTeachingItems(subjectIds),
      });
      clearStepTwoSelection(userId);
      trackCompleted(2, { school_years: years, subject_count: subjectIds.length });
      posthog.setPersonProperties({
        teacher_role: answers.role,
        has_school: !answers.noSchool,
        school_years: years,
        subjects: subjectIds,
      });
      onProfileSaved();
    } catch (err) {
      posthog.captureException(err);
      setError(true);
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  };

  useStepFooter({
    stepId: 2,
    canContinue: valid,
    busy: saving,
    onContinue: () => void handleContinue(),
  });

  return (
    <div>
      <StepHeading
        title={t("teaching.title")}
        subtitle={t("teaching.subtitle")}
        illustration={<SubjectsIllustration />}
      />

      <div className="space-y-4 sm:space-y-6">
        <section className="space-y-2" aria-labelledby="onboarding-years">
          <p id="onboarding-years" className="text-sm font-medium text-foreground">
            {t("teaching.yearsLabel")}
          </p>
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
            {ALL_YEARS.map((year) => (
              <ChoiceChip
                key={year}
                selected={years.includes(year)}
                onClick={() => toggleYear(year)}
                className="w-full min-w-12"
              >
                {t("teaching.yearChip", { year })}
              </ChoiceChip>
            ))}
          </div>
        </section>

        <section className="space-y-2" aria-labelledby="onboarding-subjects">
          <p id="onboarding-subjects" className="text-sm font-medium text-foreground">
            {t("teaching.subjectsLabel")}
          </p>
          {availableSubjectIds.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("teaching.subjectsEmpty")}</p>
          ) : (
            // A popover multi-picker: dozens of subjects would not fit on one screen as chips.
            <MultiSelectPopover
              options={availableSubjectIds.map((id) => ({
                id,
                label: translateSubjectLabel(id),
              }))}
              values={subjectIds}
              onToggle={toggleSubject}
              placeholder={t("teaching.subjectsPlaceholder")}
              countLabel={(count) => t("teaching.subjectsCount", { count })}
              labelledBy="onboarding-subjects"
            />
          )}
        </section>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {t("saveFailed")}
          </p>
        )}
      </div>
    </div>
  );
}
