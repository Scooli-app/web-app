"use client";

import { useTranslations } from "next-intl";
import { EditorSwitch } from "@/components/assessment-editor/EditorSwitch";
import { DocumentEditorSkeleton } from "@/components/document-editor/DocumentEditorSkeleton";
import { Suspense, use } from "react";

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
