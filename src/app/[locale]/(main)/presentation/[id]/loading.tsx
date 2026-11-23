import { PresentationEditorSkeleton } from "@/components/document-editor-v2/PresentationEditorSkeleton";

export default function PresentationEditorLoading() {
  // Same full-bleed wrapper as the page.
  return (
    <div className="-m-3 flex w-full flex-1 min-h-0 sm:-m-4 md:-m-6">
      <PresentationEditorSkeleton />
    </div>
  );
}
