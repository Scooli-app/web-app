"use client";

import { teachingProfileService } from "@/services/api/teaching-profile.service";
import { vocationalClassService } from "@/services/api/vocational-class.service";
import { isTeacherProfileFeatureEnabled } from "@/shared/types/featureFlags";
import type { EducationType, TeachingProfile, VocationalClass } from "@/shared/types/teaching-profile";
import { useAppSelector } from "@/store/hooks";
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import {
  AMBIGUOUS_COMPONENTS_SUBJECTS,
  SUBJECTS,
  SUBJECTS_BY_GRADE,
  translateSubjectLabel,
} from "./constants";
import {
  getDefaultSchoolYear,
  getDefaultTeachingMode,
  getDefaultVocationalSchoolYear,
  getPreferredRegularSubjectIds,
  getPreferredSchoolYears,
  getVocationalCourseOptions,
  VOCATIONAL_SCHOOL_YEARS,
} from "./teaching-profile-preferences";
import type { FormState } from "./types";

/**
 * "Who is this for": the year, the subject and — for a curso profissional — the
 * course and UC. The part of the document form that planificações and turmas
 * share, so all three pick a subject the same way.
 */
export type SubjectChoice = Pick<
  FormState,
  | "subject"
  | "schoolYear"
  | "isSpecificComponent"
  | "subjectMode"
  | "vocationalCourseCode"
  | "vocationalUnitCode"
  | "vocationalSchoolSubjectName"
  | "vocationalClassId"
>;

// `FormState[K]` rather than `SubjectChoice[K]` (the same type) so the document
// form's FormUpdateFn is assignable — TypeScript can't relate the two generics.
export type SubjectChoiceUpdateFn = <K extends keyof SubjectChoice>(
  field: K,
  value: FormState[K]
) => void;

export const EMPTY_SUBJECT_CHOICE: SubjectChoice = {
  subject: "",
  schoolYear: 0,
  isSpecificComponent: false,
};

/** Local state for pages whose form is only the subject choice (planificações, turmas). */
export function useSubjectChoiceState(initial: SubjectChoice = EMPTY_SUBJECT_CHOICE) {
  const [choice, setChoice] = useState<SubjectChoice>(initial);
  const update: SubjectChoiceUpdateFn = useCallback((field, value) => {
    setChoice((prev) => ({ ...prev, [field]: value }));
  }, []);
  return [choice, update, setChoice] as const;
}

/** What the backend receives for a subject choice — identical for documents, planificações and turmas. */
export function subjectChoicePayload(choice: SubjectChoice) {
  const isVocational = choice.subjectMode === "vocational";
  return {
    // Regular subjects travel as their canonical English value; a UC or a
    // school-component subject as its own label.
    subject: SUBJECTS.find((s) => s.id === choice.subject)?.value ?? choice.subject,
    schoolYear: choice.schoolYear,
    isSpecificComponent: !isVocational && !!choice.isSpecificComponent,
    vocationalCourseCode: isVocational ? choice.vocationalCourseCode || undefined : undefined,
    // A class, a UC and a school-subject name are mutually exclusive — see
    // FormState.vocationalClassId. The UI below never sets more than one at
    // once, but payload assembly stays defensive regardless.
    vocationalClassId: isVocational && !choice.vocationalUnitCode && !choice.vocationalSchoolSubjectName
      ? choice.vocationalClassId || undefined
      : undefined,
    vocationalUnitCode: isVocational && !choice.vocationalClassId ? choice.vocationalUnitCode || undefined : undefined,
    vocationalSchoolSubjectName: isVocational && !choice.vocationalClassId ? choice.vocationalSchoolSubjectName || undefined : undefined,
  };
}

/** The subject's name in the interface language (a UC or school-component subject is already a name). */
export function subjectChoiceLabel(choice: SubjectChoice): string {
  return SUBJECTS.some((s) => s.id === choice.subject) ? translateSubjectLabel(choice.subject) : choice.subject;
}

interface UseSubjectChoiceOptions {
  choice: SubjectChoice;
  update: SubjectChoiceUpdateFn;
  /**
   * Set when a year or subject came from somewhere other than the teacher's
   * clicks (a URL, a planificação), so the profile defaults never override it.
   */
  prefilledRef?: MutableRefObject<{ year: boolean; subject: boolean }>;
}

/**
 * Everything ClassSection and SubjectSection need, driven by the teacher's
 * profile (O Meu Ensino): their years and subjects first, cursos profissionais
 * when they have any, and the form opened on the side they teach.
 */
export function useSubjectChoice({ choice, update, prefilledRef }: UseSubjectChoiceOptions) {
  const isTeacherProfileEnabled = useAppSelector((state) =>
    isTeacherProfileFeatureEnabled(state.features.flags),
  );
  const [teachingProfile, setTeachingProfile] = useState<TeachingProfile | null>(null);
  const [vocationalClasses, setVocationalClasses] = useState<VocationalClass[]>([]);

  useEffect(() => {
    if (!isTeacherProfileEnabled) {
      setTeachingProfile(null);
      setVocationalClasses([]);
      return;
    }

    let cancelled = false;
    teachingProfileService
      .get()
      .then((profile) => {
        if (!cancelled) setTeachingProfile(profile);
      })
      .catch(() => {
        // Preferences are an enhancement: creation keeps the complete catalogue
        // and remains fully usable when the profile API is unavailable.
      });
    vocationalClassService
      .list()
      .then((classes) => {
        if (!cancelled) setVocationalClasses(classes);
      })
      .catch(() => {
        // Same enhancement-only fallback: a teacher with no saved classes (or
        // a transient failure) still picks a UC/school subject as before.
      });

    return () => {
      cancelled = true;
    };
  }, [isTeacherProfileEnabled]);

  const availableSubjectIds = useMemo(
    () =>
      choice.schoolYear
        ? SUBJECTS_BY_GRADE[String(choice.schoolYear)] ?? []
        : SUBJECTS.map((subject) => subject.id),
    [choice.schoolYear]
  );
  const preferredSubjectIds = useMemo(
    () => getPreferredRegularSubjectIds(teachingProfile, availableSubjectIds),
    [teachingProfile, availableSubjectIds]
  );
  const preferredSchoolYears = useMemo(
    () => getPreferredSchoolYears(teachingProfile, Array.from({ length: 12 }, (_, index) => index + 1)),
    [teachingProfile]
  );
  const vocationalCourseOptions = useMemo(() => {
    const base = getVocationalCourseOptions(teachingProfile);
    if (vocationalClasses.length === 0) return base;
    return base.map((course) => ({
      ...course,
      classes: vocationalClasses
        .filter((vocClass) => vocClass.qualificationCode === course.code)
        .map((vocClass) => ({
          id: vocClass.id ?? "",
          name: vocClass.name,
          unitCodes: vocClass.units.map((unit) => unit.code),
        }))
        .filter((vocClass) => vocClass.id),
    }));
  }, [teachingProfile, vocationalClasses]);
  const teachingMode: EducationType =
    choice.subjectMode === "vocational" && vocationalCourseOptions.length > 0
      ? "vocational"
      : "regular";
  const selectedVocationalCourse =
    vocationalCourseOptions.find((course) => course.code === choice.vocationalCourseCode) ??
    vocationalCourseOptions[0];

  // Once the profile has loaded, open the form where the teacher works: a
  // cursos-profissionais-only profile starts in vocational mode on its first
  // course, and the year defaults to the lowest saved one. A prefilled year or
  // subject, or one the teacher already picked, always wins.
  const hasAppliedProfileDefaultsRef = useRef(false);
  useEffect(() => {
    if (hasAppliedProfileDefaultsRef.current || !teachingProfile) return;
    hasAppliedProfileDefaultsRef.current = true;

    const prefilled = prefilledRef?.current ?? { year: false, subject: false };
    const startInVocational =
      !prefilled.year &&
      !prefilled.subject &&
      !choice.subject &&
      vocationalCourseOptions.length > 0 &&
      getDefaultTeachingMode(teachingProfile) === "vocational";
    if (startInVocational) {
      update("subjectMode", "vocational");
      update("vocationalCourseCode", vocationalCourseOptions[0].code);
    }

    if (prefilled.year || choice.schoolYear) return;
    const defaultYear = startInVocational
      ? getDefaultVocationalSchoolYear(preferredSchoolYears)
      : getDefaultSchoolYear(preferredSchoolYears);
    if (defaultYear !== null) update("schoolYear", defaultYear);
  }, [
    teachingProfile,
    vocationalCourseOptions,
    preferredSchoolYears,
    choice.subject,
    choice.schoolYear,
    prefilledRef,
    update,
  ]);

  const clearSubjectChoice = useCallback(() => {
    update("subject", "");
    update("vocationalUnitCode", undefined);
    update("vocationalSchoolSubjectName", undefined);
    update("vocationalClassId", undefined);
    update("isSpecificComponent", false);
  }, [update]);

  const handleTeachingModeChange = useCallback(
    (mode: EducationType) => {
      if (mode === teachingMode) return;
      clearSubjectChoice();
      update("subjectMode", mode);
      if (mode === "vocational") {
        update("vocationalCourseCode", selectedVocationalCourse?.code);
        // Cursos profissionais only run 10.º–12.º; keep the year when it fits.
        if (!(VOCATIONAL_SCHOOL_YEARS as readonly number[]).includes(choice.schoolYear)) {
          update("schoolYear", getDefaultVocationalSchoolYear(preferredSchoolYears));
        }
      } else {
        update("vocationalCourseCode", undefined);
      }
    },
    [teachingMode, clearSubjectChoice, update, selectedVocationalCourse, choice.schoolYear, preferredSchoolYears]
  );

  const handleVocationalCourseChange = useCallback(
    (courseCode: string) => {
      if (courseCode === selectedVocationalCourse?.code) return;
      clearSubjectChoice();
      update("vocationalCourseCode", courseCode);
    },
    [selectedVocationalCourse, clearSubjectChoice, update]
  );

  // Reset subject if it's not available for the selected school year.
  // Skipped in vocational mode: UC labels are never part of the regular
  // subject catalogue, so this would otherwise clear a UC right after
  // it's picked (see SubjectSection's vocational course/UC pickers).
  useEffect(() => {
    if (choice.subjectMode === "vocational") return;
    if (choice.schoolYear && choice.subject) {
      const validSubjects = SUBJECTS_BY_GRADE[String(choice.schoolYear)];
      if (validSubjects && !validSubjects.includes(choice.subject)) {
        update("subject", "");
      }
    }
  }, [choice.schoolYear, choice.subject, choice.subjectMode, update]);

  // Reset component type when subject changes
  useEffect(() => {
    if (choice.subject && choice.isSpecificComponent) {
      if (!AMBIGUOUS_COMPONENTS_SUBJECTS.includes(choice.subject)) {
        update("isSpecificComponent", false);
      }
    }
  }, [choice.subject, choice.isSpecificComponent, update]);

  return {
    teachingProfile,
    teachingMode,
    vocationalCourseOptions,
    selectedVocationalCourse,
    preferredSchoolYears,
    preferredSubjectIds,
    handleTeachingModeChange,
    handleVocationalCourseChange,
    /** ClassSection's quick-add hands back the saved profile, so the new course shows at once. */
    onVocationalCourseAdded: setTeachingProfile,
    /** The whole vocational surface sits behind the `teacher_profile` flag. */
    isVocationalFeatureEnabled: isTeacherProfileEnabled,
  };
}

export type SubjectChoiceController = ReturnType<typeof useSubjectChoice>;
