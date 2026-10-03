"use client";

import posthog from "posthog-js";
import { UpgradeLimitError } from "@/services/api/client";
import type { DocumentTemplate } from "@/shared/types";
import { selectEntitlementLoading } from "@/store/entitlements/selectors";
import {
  createDocument,
  setPendingInitialPrompt,
} from "@/store/documents/documentSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectIsPro } from "@/store/subscription/selectors";
import {
  FeatureFlag,
  isTeacherProfileFeatureEnabled,
} from "@/shared/types/featureFlags";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AMBIGUOUS_COMPONENTS_SUBJECTS,
  SUBJECTS,
  SUBJECTS_BY_GRADE,
} from "./constants";
import {
  AdditionalDetailsSection,
  ClassSection,
  DurationSection,
  FormActions,
  FormHeader,
  SourcePickerSection,
  SubjectSection,
  TeachingMethodSection,
  TopicSection,
  WorksheetVariantSection,
} from "./sections";
import { TemplateSection } from "./templates";
import { Card } from "@/components/ui/card";
import type { DocumentTypeConfig, FormState, FormUpdateFn } from "./types";
import { THEMES, translateThemeName } from "@/shared/types/presentation-theme";
import { cn } from "@/shared/utils/utils";
import type { CanvasPresentation, CanvasSlide } from "@/shared/types/canvas-presentation";
import { applyTheme } from "@/components/document-editor-v2/canvas-layout";
import { SlideThumbnail } from "@/components/document-editor-v2/SlideThumbnail";
import { teachingProfileService } from "@/services/api/teaching-profile.service";
import type { EducationType, TeachingProfile } from "@/shared/types/teaching-profile";
import {
  getDefaultSchoolYear,
  getDefaultTeachingMode,
  getDefaultVocationalSchoolYear,
  getPreferredRegularSubjectIds,
  getPreferredSchoolYears,
  getVocationalCourseOptions,
  VOCATIONAL_SCHOOL_YEARS,
} from "./teaching-profile-preferences";



interface DocumentCreationPageProps {
  documentType: DocumentTypeConfig;
  userId?: string;
}

/**
 * Strips a section's own Card chrome so it can be composed inside a shared card.
 * `h-auto` cancels the `h-full` DurationSection sets for standalone grid use.
 */
// `sm:p-0` is required as well as `p-0`: tailwind-merge resolves each responsive
// variant independently, so an unprefixed `p-0` never cancels the sections' `sm:p-6`.
const NESTED_SECTION_CLASS =
  "h-auto gap-0 rounded-none border-0 bg-transparent p-0 py-0 sm:p-0 shadow-none transition-none hover:shadow-none";

function useDocumentForm(documentTypeId: DocumentTypeConfig["id"]) {
  const [formState, setFormState] = useState<FormState>({
    topic: "",
    subject: "",
    isSpecificComponent: false,
    schoolYear: 0,
    lessonTime: undefined,
    customTime: 0,
    teachingMethod: undefined,
    additionalDetails: "",
    templateId: undefined,
    template: undefined,
    worksheetVariant: undefined,
    sourceIds: [],
    includeAe: true,
  });
  const [error, setError] = useState("");

  const updateForm: FormUpdateFn = useCallback((field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    setError("");
  }, []);

  const handleTemplateSelect = useCallback((template: DocumentTemplate) => {
    setFormState((prev) => ({
      ...prev,
      templateId: template.id,
      template,
    }));
  }, []);

  const isFormValid = () => {
    const requiresWorksheetVariant = documentTypeId === "worksheet";
    const isPresentation = documentTypeId === "presentation";
    return Boolean(
      formState.topic.trim() &&
        formState.subject &&
        formState.schoolYear &&
        (isPresentation || formState.templateId) &&
        (!requiresWorksheetVariant || formState.worksheetVariant)
    );
  };

  const clearError = () => setError("");

  return {
    formState,
    error,
    setError,
    updateForm,
    isFormValid,
    clearError,
    handleTemplateSelect,
  };
}

export default function DocumentCreationPage({
  documentType,
  userId: _userId = "",
}: DocumentCreationPageProps) {
  const router = useRouter();
  const t = useTranslations("documentCreation");
  const tEnums = useTranslations("enums");
  const dispatch = useAppDispatch();
  const isProUser = useAppSelector(selectIsPro);
  const isEntitlementLoading = useAppSelector(selectEntitlementLoading);
  const isUserSourcesEnabled = useAppSelector(
    (state) => state.features.flags[FeatureFlag.USER_SOURCES] === true
  );
  const isTeacherProfileEnabled = useAppSelector((state) =>
    isTeacherProfileFeatureEnabled(state.features.flags),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [teachingProfile, setTeachingProfile] = useState<TeachingProfile | null>(null);

  const { formState, error, setError, updateForm, isFormValid, handleTemplateSelect } =
    useDocumentForm(documentType.id);

  useEffect(() => {
    if (!isTeacherProfileEnabled) {
      setTeachingProfile(null);
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

    return () => {
      cancelled = true;
    };
  }, [isTeacherProfileEnabled]);

  const availableSubjectIds = useMemo(
    () =>
      formState.schoolYear
        ? SUBJECTS_BY_GRADE[String(formState.schoolYear)] ?? []
        : SUBJECTS.map((subject) => subject.id),
    [formState.schoolYear]
  );
  const preferredSubjectIds = useMemo(
    () => getPreferredRegularSubjectIds(teachingProfile, availableSubjectIds),
    [teachingProfile, availableSubjectIds]
  );
  const preferredSchoolYears = useMemo(
    () => getPreferredSchoolYears(teachingProfile, Array.from({ length: 12 }, (_, index) => index + 1)),
    [teachingProfile]
  );
  const vocationalCourseOptions = useMemo(
    () => getVocationalCourseOptions(teachingProfile),
    [teachingProfile]
  );
  const teachingMode: EducationType =
    formState.subjectMode === "vocational" && vocationalCourseOptions.length > 0
      ? "vocational"
      : "regular";
  const selectedVocationalCourse =
    vocationalCourseOptions.find((course) => course.code === formState.vocationalCourseCode) ??
    vocationalCourseOptions[0];

  // Prefill from quick-create query params (?topic=&year=&subject=) set by the
  // dashboard prompt box and quick-start examples. Reads window.location instead
  // of useSearchParams() to avoid requiring a Suspense boundary on every
  // creation page. Invalid or missing values are simply left for the form.
  const yearFromUrlRef = useRef(false);
  const subjectFromUrlRef = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const topic = params.get("topic");
    const yearRaw = params.get("year");
    const subjectId = params.get("subject");
    if (!topic && !yearRaw && !subjectId) return;

    if (topic?.trim()) {
      updateForm("topic", topic.trim());
    }

    const year = yearRaw ? Number(yearRaw) : Number.NaN;
    const hasValidYear = Number.isInteger(year) && year >= 1 && year <= 12;
    if (hasValidYear) {
      yearFromUrlRef.current = true;
      updateForm("schoolYear", year);
    }

    if (subjectId && SUBJECTS.some((subject) => subject.id === subjectId)) {
      const validForYear =
        !hasValidYear || SUBJECTS_BY_GRADE[String(year)]?.includes(subjectId);
      if (validForYear) {
        subjectFromUrlRef.current = true;
        updateForm("subject", subjectId);
      }
    }
  }, [updateForm]);

  // Once the profile has loaded, open the form where the teacher works: a
  // cursos-profissionais-only profile starts in vocational mode on its first
  // course, and the year defaults to the lowest saved one. A year or subject
  // from the URL, or one the teacher already picked, always wins.
  const hasAppliedProfileDefaultsRef = useRef(false);
  useEffect(() => {
    if (hasAppliedProfileDefaultsRef.current || !teachingProfile) return;
    hasAppliedProfileDefaultsRef.current = true;

    const fromUrl = yearFromUrlRef.current || subjectFromUrlRef.current;
    const startInVocational =
      !fromUrl &&
      !formState.subject &&
      vocationalCourseOptions.length > 0 &&
      getDefaultTeachingMode(teachingProfile) === "vocational";
    if (startInVocational) {
      updateForm("subjectMode", "vocational");
      updateForm("vocationalCourseCode", vocationalCourseOptions[0].code);
    }

    if (yearFromUrlRef.current || formState.schoolYear) return;
    const defaultYear = startInVocational
      ? getDefaultVocationalSchoolYear(preferredSchoolYears)
      : getDefaultSchoolYear(preferredSchoolYears);
    if (defaultYear !== null) updateForm("schoolYear", defaultYear);
  }, [
    teachingProfile,
    vocationalCourseOptions,
    preferredSchoolYears,
    formState.subject,
    formState.schoolYear,
    updateForm,
  ]);

  const clearSubjectChoice = useCallback(() => {
    updateForm("subject", "");
    updateForm("vocationalUnitCode", undefined);
    updateForm("vocationalSchoolSubjectName", undefined);
    updateForm("isSpecificComponent", false);
  }, [updateForm]);

  const handleTeachingModeChange = useCallback(
    (mode: EducationType) => {
      if (mode === teachingMode) return;
      clearSubjectChoice();
      updateForm("subjectMode", mode);
      if (mode === "vocational") {
        updateForm("vocationalCourseCode", selectedVocationalCourse?.code);
        // Cursos profissionais only run 10.º–12.º; keep the year when it fits.
        if (!(VOCATIONAL_SCHOOL_YEARS as readonly number[]).includes(formState.schoolYear)) {
          updateForm("schoolYear", getDefaultVocationalSchoolYear(preferredSchoolYears));
        }
      } else {
        updateForm("vocationalCourseCode", undefined);
      }
    },
    [
      teachingMode,
      clearSubjectChoice,
      updateForm,
      selectedVocationalCourse,
      formState.schoolYear,
      preferredSchoolYears,
    ]
  );

  const handleVocationalCourseChange = useCallback(
    (courseCode: string) => {
      if (courseCode === selectedVocationalCourse?.code) return;
      clearSubjectChoice();
      updateForm("vocationalCourseCode", courseCode);
    },
    [selectedVocationalCourse, clearSubjectChoice, updateForm]
  );

  // Reset subject if it's not available for the selected school year.
  // Skipped in vocational mode: UC labels are never part of the regular
  // subject catalogue, so this would otherwise clear a UC right after
  // it's picked (see SubjectSection's vocational course/UC pickers).
  useEffect(() => {
    if (formState.subjectMode === "vocational") return;
    if (formState.schoolYear && formState.subject) {
      const validSubjects = SUBJECTS_BY_GRADE[String(formState.schoolYear)];
      if (validSubjects && !validSubjects.includes(formState.subject)) {
        updateForm("subject", "");
      }
    }
  }, [formState.schoolYear, formState.subject, formState.subjectMode, updateForm]);

  // Reset component type when subject changes
  useEffect(() => {
    if (formState.subject && formState.isSpecificComponent) {
      if (!AMBIGUOUS_COMPONENTS_SUBJECTS.includes(formState.subject)) {
        updateForm("isSpecificComponent", false);
      }
    }
  }, [formState.subject, formState.isSpecificComponent, updateForm]);

  const themedCoverSlides = useMemo<CanvasSlide[]>(() => {
    return THEMES.map((theme) => {
      const bareSlide: CanvasSlide = {
        id: `mock-${theme.id}`,
        layout: "title",
        background: theme.bg,
        elements: [
          {
            id: "mock-title",
            type: "text",
            x: 0.10, y: 0.20, w: 0.80, h: 0.22,
            text: translateThemeName(theme.id),
            fontSize: 0.052,
            fontStyle: "bold",
            color: "#ffffff",
            align: "center",
            role: "title",
          },
          {
            id: "mock-sub",
            type: "text",
            x: 0.10, y: 0.46, w: 0.80, h: 0.12,
            text: tEnums("documentType.presentation"),
            fontSize: 0.026,
            fontStyle: "normal",
            color: "#ffffff",
            align: "center",
            role: "subtitle",
          },
        ],
      };
      const mockCanvas: CanvasPresentation = {
        schemaVersion: 2,
        documentType: "presentation",
        slides: [bareSlide],
      };
      return applyTheme(mockCanvas, theme.id).slides[0] ?? bareSlide;
    });
  }, [tEnums]);

  const showTeachingMethodSection = documentType.id === "lessonPlan";
  const showWorksheetVariantSection = documentType.id === "worksheet";
  const isPresentation = documentType.id === "presentation";

  const handleWorksheetVariantChange = useCallback(
    (worksheetVariant: FormState["worksheetVariant"]) => {
      updateForm("worksheetVariant", worksheetVariant);
      updateForm("templateId", undefined);
      updateForm("template", undefined);
    },
    [updateForm]
  );

  const handleCreateDocument = async () => {
    if (isLoading) return;

    if (!isPresentation && !formState.templateId) {
      setError(t("errors.selectTemplate"));
      return;
    }

    if (showWorksheetVariantSection && !formState.worksheetVariant) {
      setError(t("errors.selectWorksheetVariant"));
      return;
    }

    if (!formState.topic.trim()) {
      setError(t("errors.enterTopic"));
      return;
    }

    if (!formState.subject) {
      setError(t("errors.selectSubject"));
      return;
    }

    if (!formState.schoolYear) {
      setError(t("errors.selectSchoolYear"));
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const subjectValue =
        SUBJECTS.find((s) => s.id === formState.subject)?.value ||
        formState.subject;

      const durationValue = formState.lessonTime
        ? formState.lessonTime
        : undefined;

      const resultAction = await dispatch(
        createDocument({
          documentType: documentType.id,
          prompt: formState.topic,
          subject: subjectValue,
          schoolYear: formState.schoolYear,
          duration: durationValue || undefined,
          teachingMethod: formState.teachingMethod || undefined,
          additionalDetails: formState.additionalDetails?.trim() || "",
          templateId: formState.templateId,
          isSpecificComponent: formState.isSpecificComponent,
          worksheetVariant: formState.worksheetVariant,
          vocationalCourseCode: formState.vocationalCourseCode || undefined,
          vocationalUnitCode: formState.vocationalUnitCode || undefined,
          vocationalSchoolSubjectName: formState.vocationalSchoolSubjectName || undefined,
          ...(isUserSourcesEnabled && {
            sourceIds: formState.sourceIds ?? [],
            includeAe: formState.includeAe ?? true,
            regulatorySourceIds: formState.regulatorySourceIds,
          }),
          // Presentations use class duration (like other document types) so the
          // backend can infer an appropriate slide count. duration is already
          // included above from formState.lessonTime — nothing extra needed here.
        })
      );

      if (createDocument.fulfilled.match(resultAction)) {
        const streamResponse = resultAction.payload;

        posthog.capture("document_created", {
          document_type: documentType.id,
          teaching_mode: teachingMode,
          subject: formState.subject,
          school_year: formState.schoolYear,
          template_id: formState.templateId,
          worksheet_variant: formState.worksheetVariant || null,
          has_teaching_method: !!formState.teachingMethod,
          has_duration: !!formState.lessonTime,
          has_additional_details: !!formState.additionalDetails?.trim(),
          has_user_sources: (formState.sourceIds?.length ?? 0) > 0,
        });

        dispatch(
          setPendingInitialPrompt({
            documentId: streamResponse.id,
            prompt: formState.topic,
          })
        );

        let redirectUrl = documentType.redirectPath.replace(":id", streamResponse.id);
        if (isPresentation && formState.themeId) {
          redirectUrl += `?theme=${encodeURIComponent(formState.themeId)}`;
        }
        router.push(redirectUrl);
      } else {
        const errorMessage =
          (resultAction.payload as string) ||
          t("errors.createFailed");
        posthog.capture("document_creation_failed", {
          document_type: documentType.id,
          error_message: errorMessage,
        });
        setError(errorMessage);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Failed to create document:", error);
      const errorMessage =
        error instanceof Error
          ? t("errors.createFailedWithMessage", { message: error.message })
          : t("errors.createFailedGeneric");
      posthog.capture("document_creation_failed", {
        document_type: documentType.id,
        error_message: errorMessage,
      });
      // Usage limit errors are expected business events — the upgrade modal
      // already handles the UX, so don't log them as application exceptions.
      if (!(error instanceof UpgradeLimitError)) {
        posthog.captureException(error);
      }
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full overflow-x-hidden">
      <div className="max-w-4xl mx-auto">
        <FormHeader documentType={documentType} />

        <div className="space-y-4 sm:space-y-6">

          <div data-tutorial="topic">
            <TopicSection
              topic={formState.topic}
              placeholder={t(`types.${documentType.id}.placeholder`)}
              onUpdate={updateForm}
            />
          </div>

          {showWorksheetVariantSection && (
            <WorksheetVariantSection
              worksheetVariant={formState.worksheetVariant}
              onVariantChange={(value) => handleWorksheetVariantChange(value)}
            />
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
            <div data-tutorial="grade">
              <ClassSection
                mode={teachingMode}
                onModeChange={handleTeachingModeChange}
                schoolYear={formState.schoolYear}
                preferredSchoolYears={preferredSchoolYears}
                onUpdate={updateForm}
                vocationalCourses={vocationalCourseOptions}
                vocationalCourseCode={selectedVocationalCourse?.code}
                onCourseChange={handleVocationalCourseChange}
                onVocationalCourseAdded={setTeachingProfile}
                isVocationalFeatureEnabled={isTeacherProfileEnabled}
                className="h-full"
              />
            </div>

            {/* Subject and duration share one card, subject on top. The tutorial
                spotlights the [data-tutorial="subject"] wrapper, so it must stay
                tight around the subject block rather than the whole card. */}
            <Card className="h-full border-border p-4 shadow-sm transition-shadow hover:shadow-md sm:p-6">
              <div className="space-y-5 sm:space-y-6">
                <div data-tutorial="subject">
                  <SubjectSection
                    subject={formState.subject}
                    isSpecificComponent={formState.isSpecificComponent}
                    onUpdate={updateForm}
                    availableSubjects={formState.schoolYear ? SUBJECTS_BY_GRADE[String(formState.schoolYear)] : undefined}
                    preferredSubjectIds={preferredSubjectIds}
                    mode={teachingMode}
                    vocationalCourse={selectedVocationalCourse}
                    vocationalUnitCode={formState.vocationalUnitCode}
                    vocationalSchoolSubjectName={formState.vocationalSchoolSubjectName}
                    className={NESTED_SECTION_CLASS}
                    disabled={!formState.schoolYear}
                  />
                </div>

                <div className="border-t border-border/60" />

                <DurationSection
                  lessonTime={formState.lessonTime}
                  customTime={formState.customTime}
                  onUpdate={updateForm}
                  className={NESTED_SECTION_CLASS}
                />
              </div>
            </Card>
          </div>

          {!isPresentation && (
            <div data-tutorial="template">
              <TemplateSection
                documentType={documentType.id}
                selectedTemplateId={formState.templateId || null}
                onTemplateSelect={handleTemplateSelect}
              />
            </div>
          )}

          {isPresentation && (
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <p className="text-sm font-medium mb-3">{t("presentationTheme.title")}</p>
              <div className={cn("flex flex-wrap gap-2")}>
                {themedCoverSlides.map((slide, i) => {
                  const theme = THEMES[i];
                  if (!theme) return null;
                  return (
                    <SlideThumbnail
                      key={theme.id}
                      slide={slide}
                      index={i}
                      isActive={(formState.themeId ?? "clean") === theme.id}
                      onClick={() => updateForm("themeId", theme.id)}
                      w={110}
                      h={62}
                      showIndex={false}
                      ringOffset="ring-offset-card"
                    />
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {THEMES.find((theme) => theme.id === (formState.themeId ?? "clean"))
                  ? translateThemeName(formState.themeId ?? "clean")
                  : t("presentationTheme.defaultName")}
              </p>
            </div>
          )}

          {showTeachingMethodSection && (
            <TeachingMethodSection
              teachingMethod={formState.teachingMethod}
              onUpdate={updateForm}
            />
          )}

          <AdditionalDetailsSection
            additionalDetails={formState.additionalDetails}
            onUpdate={updateForm}
          />

          {isUserSourcesEnabled && (
            <SourcePickerSection
              sourceIds={formState.sourceIds ?? []}
              includeAe={formState.includeAe ?? true}
              regulatorySourceIds={formState.regulatorySourceIds}
              subject={formState.subject}
              schoolYear={formState.schoolYear || undefined}
              onUpdate={updateForm}
            />
          )}

          <div data-tutorial="generate">
            <FormActions
              documentType={documentType}
              isLoading={isLoading}
              isFormValid={isFormValid()}
              error={error}
              onSubmit={handleCreateDocument}
              showGenerationHint={!isEntitlementLoading && !isProUser}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
