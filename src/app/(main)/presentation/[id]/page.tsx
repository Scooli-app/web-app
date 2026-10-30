"use client";

import { Suspense, use } from "react";
import dynamic from "next/dynamic";
import { PresentationEditorSkeleton } from "@/components/document-editor-v2/PresentationEditorSkeleton";

// Dynamic import keeps Konva / pptxgenjs out of the initial bundle for
// non-presentation pages.
const BlockDocumentEditor = dynamic(
  () =>
    import("@/components/document-editor-v2/BlockDocumentEditor").then(
      (m) => m.BlockDocumentEditor,
    ),
  {
    loading: PresentationEditorSkeleton,
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
      <Suspense fallback={<PresentationEditorSkeleton />}>
        <BlockDocumentEditor documentId={id} />
      </Suspense>
    </div>
  );
}
