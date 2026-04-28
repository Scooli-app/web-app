"use client";

import { Suspense, use } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Loading component
function EditorLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px] w-full">
      <div className="flex items-center space-x-2">
        <Loader2 className="w-6 h-6 animate-spin text-[#6753FF]" />
        <span className="text-lg text-[#6C6F80]">A carregar plano de aula...</span>
      </div>
    </div>
  );
}

// Dynamic import for the heavy DocumentEditor component
const DocumentEditor = dynamic(
  () => import("@/components/document-editor/DocumentEditor"),
  {
    loading: EditorLoading,
    ssr: false,
  }
);

interface LessonPlanEditorPageProps {
  params: Promise<{ id: string }>;
}

export default function LessonPlanEditorPage({
  params,
}: LessonPlanEditorPageProps) {
  const { id } = use(params);

  return (
    <Suspense fallback={<EditorLoading />}>
      <DocumentEditor
        documentId={id}
        defaultTitle="Novo Plano de Aula"
        loadingMessage="A carregar plano de aula..."
        generateMessage="Gerar plano de aula"
        chatTitle="Assistente de Planos"
        chatPlaceholder="Faça uma pergunta sobre o plano de aula ou peça para modificar algo..."
      />
    </Suspense>
  );
}
