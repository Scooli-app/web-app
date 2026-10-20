"use client";

import { Suspense, use } from "react";
import dynamic from "next/dynamic";
import { DocumentEditorSkeleton } from "@/components/document-editor/DocumentEditorSkeleton";
import { useTranslations } from "next-intl";

// Dynamic import for the heavy DocumentEditor component
const DocumentEditor = dynamic(
  () => import("@/components/document-editor/DocumentEditor"),
  {
    loading: DocumentEditorSkeleton,
    ssr: false,
  }
);

interface TestEditorPageProps {
  params: Promise<{ id: string }>;
}

export default function TestEditorPage({ params }: TestEditorPageProps) {
  const t = useTranslations("documentEditorPages.test");
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
