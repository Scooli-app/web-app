"use client";

import { Suspense, use } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

function EditorLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px] w-full">
      <div className="flex items-center space-x-2">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-lg text-muted-foreground">A carregar planificação...</span>
      </div>
    </div>
  );
}

const DocumentEditor = dynamic(
  () => import("@/components/document-editor/DocumentEditor"),
  {
    loading: EditorLoading,
    ssr: false,
  }
);

interface CurriculumPlanEditorPageProps {
  params: Promise<{ id: string }>;
}

export default function CurriculumPlanEditorPage({
  params,
}: CurriculumPlanEditorPageProps) {
  const { id } = use(params);

  return (
    <Suspense fallback={<EditorLoading />}>
      <DocumentEditor
        documentId={id}
        defaultTitle="Nova Planificação"
        loadingMessage="A carregar planificação..."
        generateMessage="Gerar planificação"
        chatTitle="Assistente de Planificações"
        chatPlaceholder="Pergunta algo ou pede para modificar a planificação..."
      />
    </Suspense>
  );
}
