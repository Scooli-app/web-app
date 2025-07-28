"use client";

import DocumentEditor from "@/frontend/components/document-editor/DocumentEditor";
import { use } from "react";

interface LessonPlanEditorPageProps {
  params: Promise<{ id: string }>;
}

export default function LessonPlanEditorPage({
  params,
}: LessonPlanEditorPageProps) {
  const { id } = use(params);

  return (
    <DocumentEditor
      documentId={id}
      defaultTitle="Novo Plano de Aula"
      loadingMessage="A carregar plano de aula..."
      generateMessage="Gerar plano de aula"
      chatTitle="Assistente de Planos"
      chatPlaceholder="Faça uma pergunta sobre o plano de aula ou peça para modificar algo..."
    />
  );
}
