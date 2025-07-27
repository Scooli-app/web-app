"use client";

import { DocumentEditor } from "@/frontend/components/document-editor";
import { useParams } from "next/navigation";  

export default function QuizEditorPage() {
  const params = useParams();
  const documentId = params.id as string;

  return (
    <div className="w-full">
      <DocumentEditor
        documentId={documentId}
        defaultTitle="Quiz"
        loadingMessage="A carregar quiz..."
        generateMessage="Cria um quiz interativo baseado nesta descrição"
        chatTitle="AI Assistant - Quizzes"
        chatPlaceholder="Faça perguntas sobre o quiz ou peça ajuda para melhorar as questões..."
      />
    </div>
  );
}
