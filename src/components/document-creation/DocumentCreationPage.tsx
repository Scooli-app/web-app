"use client";

import {
  createDocument,
  setPendingInitialPrompt,
} from "@/store/documents/documentSlice";
import { useAppDispatch } from "@/store/hooks";
import type { DocumentTemplate } from "@/shared/types";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { SUBJECTS } from "./constants";
import {
  AdditionalDetailsSection,
  DurationSection,
  FormActions,
  FormHeader,
  GradeSection,
  SubjectSection,
  TeachingMethodSection,
  TopicSection,
} from "./sections";
import { TemplateSection } from "./templates";
import type { DocumentTypeConfig, FormState, FormUpdateFn } from "./types";

export type { DocumentTypeConfig };

interface DocumentCreationPageProps {
  documentType: DocumentTypeConfig;
  userId?: string;
}

function useDocumentForm() {
  const [formState, setFormState] = useState<FormState>({
    topic: "",
    subject: "",
    schoolYear: 0,
    lessonTime: undefined,
    customTime: 0,
    teachingMethod: undefined,
    additionalDetails: "",
    templateId: undefined,
    template: undefined,
  });
  const [error, setError] = useState("");

  const updateForm: FormUpdateFn = (field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    if (error) {
      setError("");
    }
  };

  const handleTemplateSelect = useCallback((template: DocumentTemplate) => {
    setFormState((prev) => ({
      ...prev,
      templateId: template.id,
      template,
    }));
  }, []);

  const isFormValid = () => {
    return Boolean(
      formState.topic.trim() &&
        formState.subject &&
        formState.schoolYear &&
        formState.templateId
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
  const [isLoading, setIsLoading] = useState(false);

  const { formState, error, setError, updateForm, isFormValid, handleTemplateSelect } =
    useDocumentForm();

  const handleCreateDocument = async () => {
    if (!formState.templateId) {
      setError("Por favor, selecione um modelo de documento");
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
        SUBJECTS.find((s) => s.id === formState.subject)?.label ||
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
        })
      );

      if (createDocument.fulfilled.match(resultAction)) {
        const newDoc = resultAction.payload;
        dispatch(
          setPendingInitialPrompt({
            documentId: newDoc.id,
            prompt: formState.topic,
          })
        );
        const redirectUrl = documentType.redirectPath.replace(":id", newDoc.id);
        router.push(redirectUrl);
      } else {
        setError(
          (resultAction.payload as string) ||
            "Ocorreu um erro ao criar o documento."
        );
      }
    } catch (error) {
      console.error("Failed to create document:", error);
      if (error instanceof Error) {
        setError(`Erro ao criar o documento: ${error.message}`);
      } else {
        setError("Erro ao criar o documento.");
      }
    } finally {
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

          <SubjectSection subject={formState.subject} onUpdate={updateForm} />

          <TemplateSection
            documentType={documentType.id}
            selectedTemplateId={formState.templateId || null}
            onTemplateSelect={handleTemplateSelect}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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

          <TeachingMethodSection
            teachingMethod={formState.teachingMethod}
            onUpdate={updateForm}
          />

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
          />
        </div>
      </div>
    </div>
  );
}
