"use client";

import { DocumentEditor } from "@/frontend/components/document-editor";
import { useParams } from "next/navigation";

export default function TestEditorPage() {
  const params = useParams();
  const documentId = params.id as string;

  return (
    <div className="w-full">
      <DocumentEditor
        documentId={documentId}
        defaultTitle="Teste"
        loadingMessage="A carregar teste..."
        generateMessage="Cria um teste completo baseado nesta descrição"
        chatTitle="AI Assistant - Testes"
        chatPlaceholder="Faça perguntas sobre o teste ou peça ajuda para melhorar as questões..."
      />
    </div>
  );
}