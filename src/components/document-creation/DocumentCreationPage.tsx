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
import { FeatureFlag } from "@/shared/types/featureFlags";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AMBIGUOUS_COMPONENTS_SUBJECTS, SUBJECTS, SUBJECTS_BY_GRADE } from "./constants";
import {
  AdditionalDetailsSection,
  DurationSection,
  FormActions,
  FormHeader,
  GradeSection,
  SourcePickerSection,
  SubjectSection,
  TeachingMethodSection,
  TopicSection,
  WorksheetVariantSection,
} from "./sections";
import { TemplateSection } from "./templates";
import type { DocumentTypeConfig, FormState, FormUpdateFn } from "./types";
import { THEMES } from "@/shared/types/presentation-theme";
import { cn } from "@/shared/utils/utils";
import type { CanvasPresentation, CanvasSlide } from "@/shared/types/canvas-presentation";
import { applyTheme } from "@/components/document-editor-v2/canvas-layout";
import { SlideThumbnail } from "@/components/document-editor-v2/SlideThumbnail";



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
  const dispatch = useAppDispatch();
  const isProUser = useAppSelector(selectIsPro);
  const isEntitlementLoading = useAppSelector(selectEntitlementLoading);
  const isUserSourcesEnabled = useAppSelector(
    (state) => state.features.flags[FeatureFlag.USER_SOURCES] === true
  );
  const [isLoading, setIsLoading] = useState(false);

  const { formState, error, setError, updateForm, isFormValid, handleTemplateSelect } =
    useDocumentForm(documentType.id);

  // Prefill from quick-create query params (?topic=&year=&subject=) set by the
  // dashboard prompt box and quick-start examples. Reads window.location instead
  // of useSearchParams() to avoid requiring a Suspense boundary on every
  // creation page. Invalid or missing values are simply left for the form.
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
      updateForm("schoolYear", year);
    }

    if (subjectId && SUBJECTS.some((subject) => subject.id === subjectId)) {
      const validForYear =
        !hasValidYear || SUBJECTS_BY_GRADE[String(year)]?.includes(subjectId);
      if (validForYear) {
        updateForm("subject", subjectId);
      }
    }
  }, [updateForm]);

  // Reset subject if it's not available for the selected school year
  useEffect(() => {
    if (formState.schoolYear && formState.subject) {
      const validSubjects = SUBJECTS_BY_GRADE[String(formState.schoolYear)];
      if (validSubjects && !validSubjects.includes(formState.subject)) {
        updateForm("subject", "");
      }
    }
  }, [formState.schoolYear, formState.subject, updateForm]);

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
            text: theme.name,
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
            text: "Apresentação",
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
  }, []);

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
      setError("Por favor, selecione um modelo de documento");
      return;
    }

    if (showWorksheetVariantSection && !formState.worksheetVariant) {
      setError("Por favor, selecione o objetivo principal da ficha");
      return;
    }

    if (!formState.topic.trim()) {
      setError("Por favor, introduza o tema da aula");
      return;
    }

    if (!formState.subject) {
      setError("Por favor, selecione uma disciplina");
      return;
    }

    if (!formState.schoolYear) {
      setError("Por favor, selecione o ano de escolaridade");
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
          "Ocorreu um erro ao criar o documento.";
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
          ? `Erro ao criar o documento: ${error.message}`
          : "Erro ao criar o documento.";
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
              placeholder={documentType.placeholder}
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
              <GradeSection
                schoolYear={formState.schoolYear}
                onUpdate={updateForm}
              />
            </div>
            <DurationSection
              lessonTime={formState.lessonTime}
              customTime={formState.customTime}
              onUpdate={updateForm}
            />
          </div>

          <div data-tutorial="subject">
            <SubjectSection
              subject={formState.subject}
              isSpecificComponent={formState.isSpecificComponent}
              onUpdate={updateForm}
              availableSubjects={formState.schoolYear ? SUBJECTS_BY_GRADE[String(formState.schoolYear)] : undefined}
              className="shadow-none border-0 p-0 hover:shadow-none transition-none"
              disabled={!formState.schoolYear}
            />
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
              <p className="text-sm font-medium mb-3">Tema visual</p>
              <div className={cn("flex flex-wrap gap-2")}>
                {THEMES.map((theme, i) => (
                  <SlideThumbnail
                    key={theme.id}
                    slide={themedCoverSlides[i]!}
                    index={i}
                    isActive={(formState.themeId ?? "clean") === theme.id}
                    onClick={() => updateForm("themeId", theme.id)}
                    w={110}
                    h={62}
                    showIndex={false}
                    ringOffset="ring-offset-card"
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {THEMES.find((t) => t.id === (formState.themeId ?? "clean"))?.name ?? "Branco"}
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
