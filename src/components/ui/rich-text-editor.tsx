"use client";

import { memo } from "react";
import dynamic from "next/dynamic";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  className?: string;
  onAutosave?: (markdown: string) => void;
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
}: RichTextEditorProps) {
  return (
    <TipTapEditor
      content={content}
      onChange={onChange}
      className={className}
      onAutosave={onAutosave}
    />
  );
}

// Memoize the component to prevent unnecessary re-renders
const RichTextEditor = memo(RichTextEditorComponent, (prevProps, nextProps) => {
  // Only re-render if content or className changes
  // onChange and onAutosave are typically stable callbacks
  return (
    prevProps.content === nextProps.content &&
    prevProps.className === nextProps.className
  );
});

RichTextEditor.displayName = "RichTextEditor";

export default RichTextEditor;
