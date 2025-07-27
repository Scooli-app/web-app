"use client";

import { DocumentEditor } from "@/frontend/components/document-editor";
import { useParams } from "next/navigation";

export default function LessonPlanEditorPage() {
  const params = useParams();
  const documentId = params.id as string; 

  return (
    <div className="w-full">
      <DocumentEditor
        documentId={documentId}
        defaultTitle="Plano de Aula"
        loadingMessage="A carregar plano de aula..."
        generateMessage="Cria um plano de aula completo baseado nesta descrição"
        chatTitle="AI Assistant - Planos"
        chatPlaceholder="Faça perguntas sobre o plano de aula ou peça ajuda para melhorar..."
      />
    </div>
  );
}
