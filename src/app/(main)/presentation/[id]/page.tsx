"use client";

import { Suspense, use } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

function EditorLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px] w-full">
      <div className="flex items-center space-x-2">
        <Loader2 className="w-6 h-6 animate-spin text-[#6753FF]" />
        <span className="text-lg text-[#6C6F80]">A carregar apresentação...</span>
      </div>
    </div>
  );
}

// Dynamic import keeps Konva / pptxgenjs out of the initial bundle for
// non-presentation pages.
const BlockDocumentEditor = dynamic(
  () =>
    import("@/components/document-editor-v2/BlockDocumentEditor").then(
      (m) => m.BlockDocumentEditor,
    ),
  {
    loading: EditorLoading,
    ssr: false,
  },
);

interface PresentationEditorPageProps {
  params: Promise<{ id: string }>;
}

export default function PresentationEditorPage({
  params,
}: PresentationEditorPageProps) {
  const { id } = use(params);

  return (
    // Negate SidebarLayout's padding so the editor is full-bleed within the
    // content area. The editor itself controls its own internal spacing.
    <div className="-m-3 flex w-full flex-1 min-h-0 sm:-m-4 md:-m-6">
      <Suspense fallback={<EditorLoading />}>
        <BlockDocumentEditor documentId={id} />
      </Suspense>
    </div>
  );
}
