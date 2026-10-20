"use client";

import { Suspense, use } from "react";
import dynamic from "next/dynamic";
import { DocumentEditorSkeleton } from "@/components/document-editor/DocumentEditorSkeleton";
import { useTranslations } from "next-intl";
import { featureFeedbackTrigger } from "@/store/featureFeedbackTrigger";

const DocumentEditor = dynamic(
  () => import("@/components/document-editor/DocumentEditor"),
  {
    loading: DocumentEditorSkeleton,
    ssr: false,
  }
);

interface CurriculumPlanEditorPageProps {
  params: Promise<{ id: string }>;
}

export default function CurriculumPlanEditorPage({
  params,
}: CurriculumPlanEditorPageProps) {
  const t = useTranslations("documentEditorPages.curriculumPlan");
  const { id } = use(params);

  return (
    <Suspense fallback={<DocumentEditorSkeleton />}>
      <DocumentEditor
        documentId={id}
        defaultTitle={t("defaultTitle")}
        generateMessage={t("generateMessage")}
        chatTitle={t("chatTitle")}
        chatPlaceholder={t("chatPlaceholder")}
        onGenerationComplete={() => featureFeedbackTrigger.notifyCompletion()}
      />
    </Suspense>
  );
}
