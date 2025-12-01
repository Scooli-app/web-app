"use client";

import DocumentEditor from "@/components/document-editor/DocumentEditor";
import { use } from "react";

interface TestEditorPageProps {
  params: Promise<{ id: string }>;
}

export default function TestEditorPage({ params }: TestEditorPageProps) {
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
