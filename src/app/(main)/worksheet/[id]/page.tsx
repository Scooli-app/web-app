"use client";

import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { Suspense, use } from "react";

function EditorLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px] w-full">
      <div className="flex items-center space-x-2">
        <Loader2 className="w-6 h-6 animate-spin text-[#6753FF]" />
        <span className="text-lg text-[#6C6F80]">A carregar ficha de trabalho...</span>
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

interface WorksheetEditorPageProps {
  params: Promise<{ id: string }>;
}

export default function WorksheetEditorPage({
  params,
}: WorksheetEditorPageProps) {
  const { id } = use(params);

  return (
    <Suspense fallback={<EditorLoading />}>
      <DocumentEditor
        documentId={id}
        defaultTitle="Nova Ficha de Trabalho"
        loadingMessage="A carregar ficha de trabalho..."
        generateMessage="Gerar ficha de trabalho"
        chatTitle="Assistente de Fichas"
        chatPlaceholder="Faça uma pergunta sobre a ficha de trabalho ou peça para modificar algo..."
      />
    </Suspense>
  );
}
