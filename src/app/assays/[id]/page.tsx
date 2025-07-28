"use client";

import DocumentEditor from "@/frontend/components/document-editor/DocumentEditor";
import { use } from "react";

interface AssaysEditorPageProps {
  params: Promise<{ id: string }>;
}

export default function AssaysEditorPage({ params }: AssaysEditorPageProps) {
  const { id } = use(params);

  return (
    <DocumentEditor
      documentId={id}
      defaultTitle="Novo Teste"
      loadingMessage="A carregar teste..."
      generateMessage="Gerar teste"
      chatTitle="Assistente de Testes"
      chatPlaceholder="Faça uma pergunta sobre o teste ou peça para modificar algo..."
    />
  );
}
