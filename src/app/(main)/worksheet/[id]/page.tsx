"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { Suspense, use } from "react";

function EditorLoading() {
  const t = useTranslations("documentEditorPages.worksheet");
  return (
    <div className="flex items-center justify-center min-h-[400px] w-full">
      <div className="flex items-center space-x-2">
        <Loader2 className="w-6 h-6 animate-spin text-[#6753FF]" />
        <span className="text-lg text-[#6C6F80]">{t("loading")}</span>
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

interface WorksheetEditorPageProps {
  params: Promise<{ id: string }>;
}

export default function WorksheetEditorPage({
  params,
}: WorksheetEditorPageProps) {
  const t = useTranslations("documentEditorPages.worksheet");
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
      />
    </Suspense>
  );
}
