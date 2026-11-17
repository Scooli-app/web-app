"use client";

import { MultiSelectPopover } from "@/components/onboarding-v2/MultiSelectPopover";
import { ChoiceChip } from "@/components/onboarding-v2/ChoiceChip";
import { SubjectsIllustration } from "@/components/onboarding-v2/illustrations/StepIllustrations";
import { clearStepTwoSelection } from "@/components/onboarding-v2/onboardingStorage";
import { StepHeading } from "@/components/onboarding-v2/StepHeading";
import { isFirstCycleOnly, isTeachingValid } from "@/components/onboarding-v2/teachingRules";
import type { OnboardingFlowController } from "@/components/onboarding-v2/useOnboardingV2";
import { useStepFooter } from "@/components/onboarding-v2/useStepFooter";
import {
  SUBJECTS,
  SUBJECTS_BY_GRADE,
  translateSubjectLabel,
} from "@/components/document-creation/constants";
import { buildRegularTeachingItems } from "@/components/document-creation/teaching-profile-preferences";
import { VocationalCoursesEditor } from "@/components/teaching-profile/VocationalCoursesEditor";
import { onboardingV2Service } from "@/services/api/onboarding-v2.service";
import { useAuth } from "@clerk/nextjs";
import posthog from "posthog-js";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";

const ALL_YEARS = Array.from({ length: 12 }, (_, index) => index + 1);
const VOCATIONAL_YEARS = [10, 11, 12];

interface TeachingStepProps {
  flow: OnboardingFlowController;
  /** Called once the profile is saved: the shell closes (profile mode) or advances. */
  onProfileSaved: () => void;
}

/**
 * Step 2, shaped by the role so nobody has to fake an answer: pre-school gets an honest note, special education may
 * leave subjects out, vocational picks courses and UCs, and a 1.º ciclo titular takes every subject in one tap.
 */
export function TeachingStep({ flow, onProfileSaved }: TeachingStepProps) {
  const t = useTranslations("onboardingV2");
  const { answers, update, trackCompleted } = flow;
  const { userId } = useAuth();
  const { years, subjectIds, role, courses, units } = answers;
  const preschool = role === "preschool";
  const vocational = role === "vocational";

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const submittingRef = useRef(false);

  const yearOptions = vocational ? VOCATIONAL_YEARS : ALL_YEARS;
  // A role switch can leave years the new branch doesn't offer (vocational is 10.º–12.º only).
  const chosenYears = useMemo(
    () => years.filter((year) => !vocational || VOCATIONAL_YEARS.includes(year)),
    [years, vocational],
  );

  // Subjects offered = union over the selected years, in catalogue order.
  const availableSubjectIds = useMemo(() => {
    const available = new Set<string>();
    for (const year of chosenYears) {
      for (const id of SUBJECTS_BY_GRADE[String(year)] ?? []) available.add(id);
    }
    return SUBJECTS.map((subject) => subject.id).filter((id) => available.has(id));
  }, [chosenYears]);

  const toggleYear = (year: number) => {
    const nextYears = chosenYears.includes(year)
      ? chosenYears.filter((y) => y !== year)
      : [...chosenYears, year].sort((a, b) => a - b);
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

  const titular =
    availableSubjectIds.length > 0 && availableSubjectIds.every((id) => subjectIds.includes(id));
  const toggleTitular = () => update({ subjectIds: titular ? [] : availableSubjectIds });

  const valid = isTeachingValid({
    role,
    years: chosenYears,
    subjectIds: vocational ? [] : subjectIds,
    courseCount: courses.length,
  });

  const handleContinue = async () => {
    if (!valid || saving || submittingRef.current || !role) return;
    submittingRef.current = true;
    setSaving(true);
    setError(false);
    const savedYears = preschool ? [] : chosenYears;
    const items = preschool ? [] : vocational ? units : buildRegularTeachingItems(subjectIds);
    try {
      await onboardingV2Service.saveProfile({
        schoolName: answers.noSchool ? null : answers.schoolName.trim(),
        noSchool: answers.noSchool,
        teacherRole: role,
        schoolYears: savedYears,
        items,
        ...(vocational ? { courses } : {}),
      });
      clearStepTwoSelection(userId);
      update({ years: savedYears });
      trackCompleted(2, { school_years: savedYears, subject_count: items.length, role });
      posthog.setPersonProperties({
        teacher_role: role,
        has_school: !answers.noSchool,
        school_years: savedYears,
        subjects: vocational ? units.map((unit) => unit.code) : subjectIds,
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
        subtitle={
          preschool
            ? undefined
            : vocational
              ? t("teaching.vocationalSubtitle")
              : t("teaching.subtitle")
        }
        illustration={<SubjectsIllustration />}
      />

      {preschool ? (
        <p className="rounded-xl border border-border bg-muted/50 p-4 text-sm leading-relaxed text-foreground">
          {t("teaching.preschoolNote")}
        </p>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          <section className="space-y-2" aria-labelledby="onboarding-years">
            <p id="onboarding-years" className="text-sm font-medium text-foreground">
              {t("teaching.yearsLabel")}
            </p>
            <div
              className={
                vocational ? "grid grid-cols-3 gap-2 sm:max-w-xs" : "grid grid-cols-6 gap-2 sm:grid-cols-12"
              }
            >
              {yearOptions.map((year) => (
                <ChoiceChip
                  key={year}
                  selected={chosenYears.includes(year)}
                  onClick={() => toggleYear(year)}
                  className="w-full min-w-12"
                >
                  {t("teaching.yearChip", { year })}
                </ChoiceChip>
              ))}
            </div>
          </section>

          {vocational ? (
            <section className="space-y-2" aria-labelledby="onboarding-courses">
              <p id="onboarding-courses" className="text-sm font-medium text-foreground">
                {t("teaching.coursesLabel")}
              </p>
              <VocationalCoursesEditor
                courses={courses}
                items={units}
                onChange={(next) => update({ courses: next.courses, units: next.items })}
              />
            </section>
          ) : (
            <section className="space-y-2" aria-labelledby="onboarding-subjects">
              <p id="onboarding-subjects" className="text-sm font-medium text-foreground">
                {role === "special_ed" ? t("teaching.subjectsOptional") : t("teaching.subjectsLabel")}
              </p>
              {availableSubjectIds.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("teaching.subjectsEmpty")}</p>
              ) : (
                <>
                  {isFirstCycleOnly(chosenYears) && (
                    <ChoiceChip selected={titular} onClick={toggleTitular} showCheck>
                      {t("teaching.titular")}
                    </ChoiceChip>
                  )}
                  {/* A popover multi-picker: dozens of subjects would not fit on one screen as chips. */}
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
                  {role === "special_ed" && (
                    <p className="text-xs text-muted-foreground">{t("teaching.specialEdHint")}</p>
                  )}
                </>
              )}
            </section>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {t("saveFailed")}
        </p>
      )}
    </div>
  );
}
