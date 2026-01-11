"use client";

import dynamic from "next/dynamic";
import { memo } from "react";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  className?: string;
  onAutosave?: (markdown: string) => void;
  rightHeaderContent?: React.ReactNode;
}

// Loading fallback
function EditorSkeleton() {
  return (
    <div className="border border-border rounded-xl bg-card w-full">
      <div className="border-b border-border p-2 h-12 bg-muted animate-pulse rounded-t-xl" />
      <div className="p-4 min-h-[600px] flex items-center justify-center">
        <div className="text-muted-foreground">A carregar editor...</div>
      </div>
    </div>
  );
}

// Dynamically import heavy TipTap dependencies
const TipTapEditor = dynamic(
  () => import("./rich-text-editor-core").then((mod) => mod.TipTapEditorCore),
  {
    ssr: false,
    loading: EditorSkeleton,
  }
);

function RichTextEditorComponent({
  content,
  onChange,
  className = "",
  onAutosave,
  rightHeaderContent,
}: RichTextEditorProps) {
  return (
    <TipTapEditor
      content={content}
      onChange={onChange}
      className={className}
      onAutosave={onAutosave}
      rightHeaderContent={rightHeaderContent}
    />
  );
}

// Memoize the component to prevent unnecessary re-renders
const RichTextEditor = memo(RichTextEditorComponent, (prevProps, nextProps) => {
  // Only re-render if content, className, or rightHeaderContent changes
  return (
    prevProps.content === nextProps.content &&
    prevProps.className === nextProps.className &&
    prevProps.rightHeaderContent === nextProps.rightHeaderContent
  );
});

RichTextEditor.displayName = "RichTextEditor";

export default RichTextEditor;
