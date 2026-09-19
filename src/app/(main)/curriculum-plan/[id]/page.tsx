"use client";

import { Suspense, use } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { featureFeedbackTrigger } from "@/store/featureFeedbackTrigger";

function EditorLoading() {
  const t = useTranslations("documentEditorPages.curriculumPlan");
  return (
    <div className="flex items-center justify-center min-h-[400px] w-full">
      <div className="flex items-center space-x-2">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-lg text-muted-foreground">{t("loading")}</span>
      </div>
    </div>
  );
}

const DocumentEditor = dynamic(
  () => import("@/components/document-editor/DocumentEditor"),
  {
    loading: EditorLoading,
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
    <Suspense fallback={<EditorLoading />}>
      <DocumentEditor
        documentId={id}
        defaultTitle={t("defaultTitle")}
        loadingMessage={t("loading")}
        generateMessage={t("generateMessage")}
        chatTitle={t("chatTitle")}
        chatPlaceholder={t("chatPlaceholder")}
        onGenerationComplete={() => featureFeedbackTrigger.notifyCompletion()}
      />
    </Suspense>
  );
}
