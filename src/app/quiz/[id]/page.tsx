"use client";

import DocumentEditor from "@/components/document-editor/DocumentEditor";
import { use } from "react";

interface QuizEditorPageProps {
  params: Promise<{ id: string }>;
}

export default function QuizEditorPage({ params }: QuizEditorPageProps) {
  const { id } = use(params);

  return (
    <DocumentEditor
      documentId={id}
      defaultTitle="Novo Quiz"
      loadingMessage="A carregar quiz..."
      generateMessage="Gerar quiz"
      chatTitle="Assistente de Quizzes"
      chatPlaceholder="Faça uma pergunta sobre o quiz ou peça para modificar algo..."
    />
  );
}
