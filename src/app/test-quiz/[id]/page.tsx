"use client";

import { DocumentEditor } from "@/components/document-editor";
import { useParams } from "next/navigation";

export default function TestQuizEditorPage() {
  const params = useParams();
  const documentId = params.id as string;

  return (
    <div className="w-full">
      <DocumentEditor
        documentId={documentId}
        defaultTitle="Teste/Quiz"
        loadingMessage="A carregar teste/quiz..."
        generateMessage="Cria um teste ou quiz completo baseado nesta descrição"
        chatTitle="AI Assistant - Testes"
        chatPlaceholder="Faça perguntas sobre o teste ou peça ajuda para melhorar as questões..."
      />
    </div>
  );
}
