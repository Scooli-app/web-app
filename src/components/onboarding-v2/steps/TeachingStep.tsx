"use client";

import { ChoiceChip } from "@/components/onboarding-v2/ChoiceChip";
import { StepHeading } from "@/components/onboarding-v2/StepHeading";
import type { OnboardingFlowController } from "@/components/onboarding-v2/useOnboardingV2";
import { useStepFooter } from "@/components/onboarding-v2/useStepFooter";
import {
  SUBJECTS,
  SUBJECTS_BY_GRADE,
  translateSubjectLabel,
} from "@/components/document-creation/constants";
import { buildRegularTeachingItems } from "@/components/document-creation/teaching-profile-preferences";
import { useMotionSafe } from "@/lib/motion/useMotionSafe";
import { onboardingV2Service } from "@/services/api/onboarding-v2.service";
import { motion } from "motion/react";
import posthog from "posthog-js";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

const CYCLES = [
  { id: "c1", years: [1, 2, 3, 4] },
  { id: "c2", years: [5, 6] },
  { id: "c3", years: [7, 8, 9] },
  { id: "c4", years: [10, 11, 12] },
] as const;

interface TeachingStepProps {
  flow: OnboardingFlowController;
  /** Called once the profile is saved: the shell closes (profile mode) or advances. */
  onProfileSaved: () => void;
}

export function TeachingStep({ flow, onProfileSaved }: TeachingStepProps) {
  const t = useTranslations("onboardingV2");
  const { stagger, item } = useMotionSafe();
  const { answers, update, trackCompleted } = flow;
  const { years, subjectIds } = answers;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

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
    if (!valid || saving || !answers.role) return;
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
      trackCompleted(2, { school_years: years, subject_count: subjectIds.length });
      posthog.setPersonProperties({
        teacher_role: answers.role,
        has_school: !answers.noSchool,
        school_years: years,
      });
      onProfileSaved();
    } catch (err) {
      posthog.captureException(err);
      setError(true);
    } finally {
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
      <StepHeading title={t("teaching.title")} subtitle={t("teaching.subtitle")} />

      <div className="space-y-8">
        <section className="space-y-4" aria-labelledby="onboarding-years">
          <p id="onboarding-years" className="text-sm font-medium text-foreground">
            {t("teaching.yearsLabel")}
          </p>
          <div className="space-y-3">
            {CYCLES.map((cycle) => (
              <div key={cycle.id} className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t(`teaching.cycles.${cycle.id}`)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {cycle.years.map((year) => (
                    <ChoiceChip
                      key={year}
                      selected={years.includes(year)}
                      onClick={() => toggleYear(year)}
                      className="min-w-14"
                    >
                      {t("teaching.yearChip", { year })}
                    </ChoiceChip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3" aria-labelledby="onboarding-subjects">
          <p id="onboarding-subjects" className="text-sm font-medium text-foreground">
            {t("teaching.subjectsLabel")}
          </p>
          {availableSubjectIds.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("teaching.subjectsEmpty")}</p>
          ) : (
            <motion.div
              key={availableSubjectIds.join("|")}
              variants={stagger}
              initial="initial"
              animate="animate"
              className="flex flex-wrap gap-2"
            >
              {availableSubjectIds.map((id) => (
                <motion.div key={id} variants={item}>
                  <ChoiceChip
                    selected={subjectIds.includes(id)}
                    onClick={() => toggleSubject(id)}
                  >
                    {translateSubjectLabel(id)}
                  </ChoiceChip>
                </motion.div>
              ))}
            </motion.div>
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
