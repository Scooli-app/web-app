"use client";

import posthog from "posthog-js";
import { UpgradeLimitError } from "@/services/api/client";
import { linkLessonDocument } from "@/services/api/timetable.service";
import type { DocumentTemplate } from "@/shared/types";
import { selectEntitlementLoading } from "@/store/entitlements/selectors";
import {
  createDocument,
  setPendingInitialPrompt,
} from "@/store/documents/documentSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectIsPro } from "@/store/subscription/selectors";
import { FeatureFlag } from "@/shared/types/featureFlags";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LessonChoice } from "./lessonPicker";
import { getMissingField } from "./missingField";
import { SUBJECTS, SUBJECTS_BY_GRADE } from "./constants";
import {
  AdditionalDetailsSection,
  ClassSection,
  DurationSection,
  FormActions,
  FormHeader,
  LessonSection,
  FilledSummary,
  MoreOptions,
  OptionRow,
  SlideCountSection,
  SourcePickerSection,
  SubjectSection,
  TeachingMethodSection,
  TopicSection,
  WorksheetVariantSection,
} from "./sections";
import { TemplateSection } from "./templates";
import type { DocumentTypeConfig, FormState, FormUpdateFn } from "./types";
import { ThemeGallery } from "@/components/document-editor-v2/ThemePicker";
import { useSubjectChoice } from "./useSubjectChoice";

interface DocumentCreationPageProps {
  documentType: DocumentTypeConfig;
  userId?: string;
}

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
  const dispatch = useAppDispatch();
  const isProUser = useAppSelector(selectIsPro);
  const isEntitlementLoading = useAppSelector(selectEntitlementLoading);
  const isUserSourcesEnabled = useAppSelector(
    (state) => state.features.flags[FeatureFlag.USER_SOURCES] === true
  );
  const [isLoading, setIsLoading] = useState(false);
  // Quick-create already filled year and subject: show them as one line until the teacher asks to change them.
  const [showFilledSummary, setShowFilledSummary] = useState(false);
  // "Para que aula?": the document joins this lesson (and its turma) once created.
  const [lessonChoice, setLessonChoice] = useState<LessonChoice | null>(null);
  const [initialLessonId, setInitialLessonId] = useState<string | null>(null);
  // null until the template list has loaded.
  const [templateCount, setTemplateCount] = useState<number | null>(null);

  const { formState, error, setError, updateForm, isFormValid, handleTemplateSelect } =
    useDocumentForm(documentType.id);

  // A year or subject from the URL wins over the profile defaults.
  const prefilledRef = useRef({ year: false, subject: false });
  const {
    teachingMode,
    vocationalCourseOptions,
    selectedVocationalCourse,
    preferredSchoolYears,
    preferredSubjectIds,
    handleTeachingModeChange,
    handleVocationalCourseChange,
    onVocationalCourseAdded,
    isVocationalFeatureEnabled,
  } = useSubjectChoice({ choice: formState, update: updateForm, prefilledRef });

  // Prefill from quick-create query params (?topic=&year=&subject=) set by the
  // dashboard prompt box and quick-start examples. Reads window.location instead
  // of useSearchParams() to avoid requiring a Suspense boundary on every
  // creation page. Invalid or missing values are simply left for the form.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setInitialLessonId(params.get("lesson"));
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
      prefilledRef.current.year = true;
      updateForm("schoolYear", year);
    }

    if (subjectId && SUBJECTS.some((subject) => subject.id === subjectId)) {
      const validForYear =
        !hasValidYear || SUBJECTS_BY_GRADE[String(year)]?.includes(subjectId);
      if (validForYear) {
        prefilledRef.current.subject = true;
        updateForm("subject", subjectId);
        if (hasValidYear) setShowFilledSummary(true);
      }
    }
  }, [updateForm]);

  // Picking a lesson fills what its turma already knows: the topic (if empty), year and subject.
  const handleLessonChange = useCallback(
    (choice: LessonChoice | null) => {
      setLessonChoice(choice);
      if (!choice) return;
      setTopicIfEmpty(choice.topicTitle);
      if (choice.gradeLevel >= 1 && choice.gradeLevel <= 12) {
        prefilledRef.current.year = true;
        updateForm("schoolYear", choice.gradeLevel);
      }
      if (choice.subjectId) {
        prefilledRef.current.subject = true;
        updateForm("subject", choice.subjectId);
        setShowFilledSummary(true);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updateForm],
  );
  const topicRef = useRef(formState.topic);
  topicRef.current = formState.topic;
  const setTopicIfEmpty = (topic: string) => {
    if (!topicRef.current.trim() && topic.trim()) updateForm("topic", topic.trim());
  };

  const showTeachingMethodSection = documentType.id === "lessonPlan";
  const showWorksheetVariantSection = documentType.id === "worksheet";
  const isPresentation = documentType.id === "presentation";

  const missingField = getMissingField(
    {
      topic: formState.topic,
      schoolYear: formState.schoolYear,
      subject: formState.subject,
      templateId: formState.templateId,
      worksheetVariant: formState.worksheetVariant,
    },
    { needsTemplate: !isPresentation, needsWorksheetVariant: showWorksheetVariantSection },
  );

  const moreOptionsSummary = [
    !isPresentation && formState.template?.name
      ? t("moreOptions.summaryTemplate", { name: formState.template.name })
      : null,
    formState.lessonTime
      ? t("moreOptions.summaryDuration", { minutes: formState.lessonTime })
      : t("moreOptions.summaryDurationFree"),
    isPresentation && formState.slideCount ? t("moreOptions.summarySlides", { count: formState.slideCount }) : null,
    // Says which of the teacher's own sources this document will follow.
    isUserSourcesEnabled && (formState.sourceIds?.length ?? 0) > 0
      ? t("moreOptions.summarySources", { count: formState.sourceIds?.length ?? 0 })
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

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
          // Presentations: an explicit slide count wins; without one the backend
          // sizes the deck from the lesson duration.
          ...(isPresentation && formState.slideCount ? { slideCount: formState.slideCount } : {}),
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
          // Made for a lesson ("Para que aula?") rather than as a standalone document.
          linked_to_lesson: !!lessonChoice,
        });

        if (lessonChoice) {
          // Joins the lesson while it's still being written; if that fails the document still opens.
          await linkLessonDocument(lessonChoice.timetableId, lessonChoice.lessonId, streamResponse.id).catch(
            (err) => posthog.captureException(err),
          );
        }

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
    <div className="w-full overflow-x-clip">
      <div className="max-w-4xl mx-auto pb-2">
        <FormHeader documentType={documentType} />

        <div className="space-y-3">

          {documentType.id !== "curriculumPlan" && (
            <LessonSection
              documentType={documentType.id}
              selectedLessonId={lessonChoice?.lessonId ?? null}
              onChange={handleLessonChange}
              initialLessonId={initialLessonId}
            />
          )}

          <div>
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

          {showFilledSummary && formState.schoolYear && formState.subject ? (
            <FilledSummary
              schoolYear={formState.schoolYear}
              subjectId={formState.subject}
              onChange={() => setShowFilledSummary(false)}
            />
          ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <ClassSection
                mode={teachingMode}
                onModeChange={handleTeachingModeChange}
                schoolYear={formState.schoolYear}
                preferredSchoolYears={preferredSchoolYears}
                onUpdate={updateForm}
                vocationalCourses={vocationalCourseOptions}
                vocationalCourseCode={selectedVocationalCourse?.code}
                onCourseChange={handleVocationalCourseChange}
                onVocationalCourseAdded={onVocationalCourseAdded}
                isVocationalFeatureEnabled={isVocationalFeatureEnabled}
                className="h-full"
              />
            </div>

            <div className="h-full">
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
                  className="h-full"
                  disabled={!formState.schoolYear}
                />
            </div>
          </div>
          )}

          <MoreOptions summary={moreOptionsSummary} forceOpen={missingField === "template" && templateCount !== null}>
            <DurationSection
              lessonTime={formState.lessonTime}
              customTime={formState.customTime}
              onUpdate={updateForm}
            />

            {/* Presentations: deck size and look are optional too (the theme can change later in the editor). */}
            {isPresentation && <SlideCountSection slideCount={formState.slideCount} onUpdate={updateForm} />}
            {isPresentation && (
              <OptionRow label={t("presentationTheme.title")} alignTop>
                <ThemeGallery value={formState.themeId ?? "clean"} onSelect={(id) => updateForm("themeId", id)} />
              </OptionRow>
            )}

            {!isPresentation && (
              <TemplateSection
                documentType={documentType.id}
                selectedTemplateId={formState.templateId || null}
                onTemplateSelect={handleTemplateSelect}
                onTemplateCountChange={setTemplateCount}
              />
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
          </MoreOptions>

          {/* Sticky so the Create button stays in view, however long the form is. */}
          <div className="sticky bottom-0 z-10">
            <FormActions
              documentType={documentType}
              isLoading={isLoading}
              isFormValid={isFormValid()}
              error={error}
              onSubmit={handleCreateDocument}
              showGenerationHint={!isEntitlementLoading && !isProUser}
              missingField={missingField}
              noTemplates={templateCount === 0}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
