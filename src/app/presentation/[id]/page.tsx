"use client";

import DocumentEditor from "@/frontend/components/document-editor/DocumentEditor";
import { use } from "react";

interface PresentationEditorPageProps {
  params: Promise<{ id: string }>;
}

export default function PresentationEditorPage({
  params,
}: PresentationEditorPageProps) {
  const { id } = use(params);

  return (
    <DocumentEditor
      documentId={id}
      defaultTitle="Nova Apresentação"
      loadingMessage="A carregar apresentação..."
      generateMessage="Gerar apresentação"
      chatTitle="Assistente de Apresentações"
      chatPlaceholder="Faça uma pergunta sobre a apresentação ou peça para modificar algo..."
    />
  );
}
