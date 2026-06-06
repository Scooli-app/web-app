"use client";

import { Suspense, use } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

function EditorLoading() {
  return (
    <div className="flex min-h-[400px] w-full items-center justify-center">
      <div className="flex items-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-lg text-muted-foreground">A carregar apresentação...</span>
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
