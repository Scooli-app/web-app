"use client";

import { Suspense, use } from "react";
import { EditorSwitch } from "@/components/assessment-editor/EditorSwitch";
import { DocumentEditorSkeleton } from "@/components/document-editor/DocumentEditorSkeleton";
import { useTranslations } from "next-intl";

interface TestEditorPageProps {
  params: Promise<{ id: string }>;
}

export default function TestEditorPage({ params }: TestEditorPageProps) {
  const t = useTranslations("documentEditorPages.test");
  const { id } = use(params);

  return (
    <Suspense fallback={<DocumentEditorSkeleton />}>
      <EditorSwitch
        documentId={id}
        defaultTitle={t("defaultTitle")}
        generateMessage={t("generateMessage")}
        chatTitle={t("chatTitle")}
        chatPlaceholder={t("chatPlaceholder")}
      />
    </Suspense>
  );
}
