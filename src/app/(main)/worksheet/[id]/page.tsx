"use client";

import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { DocumentEditorSkeleton } from "@/components/document-editor/DocumentEditorSkeleton";
import { Suspense, use } from "react";

const DocumentEditor = dynamic(
  () => import("@/components/document-editor/DocumentEditor"),
  {
    loading: DocumentEditorSkeleton,
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
    <Suspense fallback={<DocumentEditorSkeleton />}>
      <DocumentEditor
        documentId={id}
        defaultTitle={t("defaultTitle")}
        generateMessage={t("generateMessage")}
        chatTitle={t("chatTitle")}
        chatPlaceholder={t("chatPlaceholder")}
      />
    </Suspense>
  );
}
