"use client";

import posthog from "posthog-js";
import type { DocumentTemplate } from "@/shared/types";
import {
  createDocument,
  setPendingInitialPrompt,
} from "@/store/documents/documentSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectIsPro, selectSubscriptionLoading } from "@/store/subscription/selectors";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AMBIGUOUS_COMPONENTS_SUBJECTS, SUBJECTS, SUBJECTS_BY_GRADE } from "./constants";
import {
  AdditionalDetailsSection,
  DurationSection,
  FormActions,
  FormHeader,
  GradeSection,
  SubjectSection,
  TeachingMethodSection,
  TopicSection,
  WorksheetVariantSection,
} from "./sections";
import { TemplateSection } from "./templates";
import type { DocumentTypeConfig, FormState, FormUpdateFn } from "./types";

export type { DocumentTypeConfig };

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
    return Boolean(
      formState.topic.trim() &&
        formState.subject &&
        formState.schoolYear &&
        formState.templateId &&
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
  const isSubscriptionLoading = useAppSelector(selectSubscriptionLoading);
  const [isLoading, setIsLoading] = useState(false);

  const { formState, error, setError, updateForm, isFormValid, handleTemplateSelect } =
    useDocumentForm(documentType.id);

  // Reset subject if it's not available for the selected school year
  useEffect(() => {
    if (formState.schoolYear && formState.subject) {
      const validSubjects = SUBJECTS_BY_GRADE[String(formState.schoolYear)];
      // If we have a list for this grade, and the current subject isn't in it
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

  const showTeachingMethodSection = documentType.id === "lessonPlan";
  const showWorksheetVariantSection = documentType.id === "worksheet";

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
    
    if (!formState.templateId) {
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
        });

        // Store the initial prompt for display in chat
        dispatch(
          setPendingInitialPrompt({
            documentId: streamResponse.id,
            prompt: formState.topic,
          })
        );

        const redirectUrl = documentType.redirectPath.replace(
          ":id",
          streamResponse.id
        );
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
      posthog.captureException(error);
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="max-w-4xl mx-auto">
        <FormHeader documentType={documentType} />

        <div className="space-y-4 sm:space-y-6">

          <TopicSection
            topic={formState.topic}
            placeholder={documentType.placeholder}
            onUpdate={updateForm}
          />

          {showWorksheetVariantSection && (
            <WorksheetVariantSection
              worksheetVariant={formState.worksheetVariant}
              onVariantChange={(value) => handleWorksheetVariantChange(value)}
            />
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
            <GradeSection
              schoolYear={formState.schoolYear}
              onUpdate={updateForm}
            />
            <DurationSection
              lessonTime={formState.lessonTime}
              customTime={formState.customTime}
              onUpdate={updateForm}
            />
          </div>

          <SubjectSection 
            subject={formState.subject} 
            isSpecificComponent={formState.isSpecificComponent}
            onUpdate={updateForm} 
            availableSubjects={formState.schoolYear ? SUBJECTS_BY_GRADE[String(formState.schoolYear)] : undefined}
            className="shadow-none border-0 p-0 hover:shadow-none transition-none"
            disabled={!formState.schoolYear}
          />

          <TemplateSection
            documentType={documentType.id}
            selectedTemplateId={formState.templateId || null}
            onTemplateSelect={handleTemplateSelect}
          />

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

          <FormActions
            documentType={documentType}
            isLoading={isLoading}
            isFormValid={isFormValid()}
            error={error}
            onSubmit={handleCreateDocument}
            showGenerationHint={!isSubscriptionLoading && !isProUser}
          />
        </div>
      </div>
    </div>
  );
}
