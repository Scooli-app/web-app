"use client";

import { DiffExtension } from "@/lib/tiptap/DiffExtension";
import { htmlToMarkdown, markdownToHtml } from "@/shared/utils/markdown";
import Highlight from "@tiptap/extension-highlight";
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { memo, useCallback, useEffect, useRef } from "react";
import "./diff-styles.css";

interface DiffMode {
  oldText: string;
  newText: string;
  diffChanges?: import("@/shared/types/api").DiffChange[];
  onAccept?: (changeId: string | number) => void;
  onReject?: (changeId: string | number) => void;
}

interface TipTapEditorCoreProps {
  content: string;
  onChange: (content: string) => void;
  className?: string;
  onAutosave?: (markdown: string) => void;
  rightHeaderContent?: React.ReactNode;
  diffMode?: DiffMode;
}

// Memoized MenuBar component
const MenuBar = memo(function MenuBar({ 
  editor, 
  rightHeaderContent 
}: { 
  editor: Editor;
  rightHeaderContent?: React.ReactNode;
}) {
  const editorState = useEditorState({
    editor,
    selector: (ctx) => {
      if (!ctx.editor || !ctx.editor.view) {
        // Return default state when editor is not available
        return {
          isBold: false,
          canBold: false,
          isItalic: false,
          canItalic: false,
          isHeading1: false,
          isHeading2: false,
          isHeading3: false,
          isBulletList: false,
          isOrderedList: false,
          isHighlight: false,
          isBlockquote: false,
          isCodeBlock: false,
        };
      }
      
      return {
        isBold: ctx.editor.isActive("bold"),
        canBold: ctx.editor.can().chain().focus().toggleBold().run(),
        isItalic: ctx.editor.isActive("italic"),
        canItalic: ctx.editor.can().chain().focus().toggleItalic().run(),
        isHeading1: ctx.editor.isActive("heading", { level: 1 }),
        isHeading2: ctx.editor.isActive("heading", { level: 2 }),
        isHeading3: ctx.editor.isActive("heading", { level: 3 }),
        isBulletList: ctx.editor.isActive("bulletList"),
        isOrderedList: ctx.editor.isActive("orderedList"),
        isHighlight: ctx.editor.isActive("highlight"),
        isBlockquote: ctx.editor.isActive("blockquote"),
        isCodeBlock: ctx.editor.isActive("codeBlock"),
      };
    },
  });

  const handleBold = useCallback(() => editor.chain().focus().toggleBold().run(), [editor]);
  const handleItalic = useCallback(() => editor.chain().focus().toggleItalic().run(), [editor]);
  const handleH1 = useCallback(() => editor.chain().focus().toggleHeading({ level: 1 }).run(), [editor]);
  const handleH2 = useCallback(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), [editor]);
  const handleH3 = useCallback(() => editor.chain().focus().toggleHeading({ level: 3 }).run(), [editor]);
  const handleBullet = useCallback(() => editor.chain().focus().toggleBulletList().run(), [editor]);
  const handleOrdered = useCallback(() => editor.chain().focus().toggleOrderedList().run(), [editor]);
  const handleHighlight = useCallback(() => editor.chain().focus().toggleHighlight().run(), [editor]);
  const handleBlockquote = useCallback(() => editor.chain().focus().toggleBlockquote().run(), [editor]);
  const handleCodeBlock = useCallback(() => editor.chain().focus().toggleCodeBlock().run(), [editor]);

  return (
    <div className="border-b border-border p-2 flex items-center justify-between sticky top-0 z-10 bg-card rounded-t-xl min-h-[56px] w-full">
      <div className="flex flex-wrap gap-1 flex-1">
      <button
        onClick={handleBold}
        disabled={!editorState.canBold}
        className={`p-2 rounded hover:bg-accent transition-colors ${
          editorState.isBold ? "bg-primary text-primary-foreground" : "text-foreground"
        }`}
        title="Negrito"
        type="button"
      >
        <strong>B</strong>
      </button>

      <button
        onClick={handleItalic}
        disabled={!editorState.canItalic}
        className={`p-2 rounded hover:bg-accent transition-colors ${
          editorState.isItalic ? "bg-primary text-primary-foreground" : "text-foreground"
        }`}
        title="Itálico"
        type="button"
      >
        <em>I</em>
      </button>

      <button
        onClick={handleH1}
        className={`p-2 rounded hover:bg-accent transition-colors ${
          editorState.isHeading1 ? "bg-primary text-primary-foreground" : "text-foreground"
        }`}
        title="Título 1"
        type="button"
      >
        H1
      </button>

      <button
        onClick={handleH2}
        className={`p-2 rounded hover:bg-accent transition-colors ${
          editorState.isHeading2 ? "bg-primary text-primary-foreground" : "text-foreground"
        }`}
        title="Título 2"
        type="button"
      >
        H2
      </button>

      <button
        onClick={handleH3}
        className={`p-2 rounded hover:bg-accent transition-colors ${
          editorState.isHeading3 ? "bg-primary text-primary-foreground" : "text-foreground"
        }`}
        title="Título 3"
        type="button"
      >
        H3
      </button>

      <button
        onClick={handleBullet}
        className={`p-2 rounded hover:bg-accent transition-colors ${
          editorState.isBulletList ? "bg-primary text-primary-foreground" : "text-foreground"
        }`}
        title="Lista"
        type="button"
      >
        •
      </button>

      <button
        onClick={handleOrdered}
        className={`p-2 rounded hover:bg-accent transition-colors ${
          editorState.isOrderedList ? "bg-primary text-primary-foreground" : "text-foreground"
        }`}
        title="Lista Numerada"
        type="button"
      >
        1.
      </button>

      <button
        onClick={handleHighlight}
        className={`p-2 rounded hover:bg-accent transition-colors ${
          editorState.isHighlight ? "bg-primary text-primary-foreground" : "text-foreground"
        }`}
        title="Destacar"
        type="button"
      >
        <span className="bg-yellow-200 dark:bg-yellow-600 px-1 text-foreground">D</span>
      </button>

      <button
        onClick={handleBlockquote}
        className={`p-2 rounded hover:bg-accent transition-colors ${
          editorState.isBlockquote ? "bg-primary text-primary-foreground" : "text-foreground"
        }`}
        title="Citação"
        type="button"
      >
        &ldquo;
      </button>

      <button
        onClick={handleCodeBlock}
        className={`p-2 rounded hover:bg-accent transition-colors ${
          editorState.isCodeBlock ? "bg-primary text-primary-foreground" : "text-foreground"
        }`}
        title="Bloco de Código"
        type="button"
      >
        {"<>"}
      </button>
      </div>
      {rightHeaderContent && (
        <div className="flex-shrink-0 flex items-center gap-2 pl-2">
          {rightHeaderContent}
        </div>
      )}
    </div>
  );
});

export function TipTapEditorCore({
  content,
  onChange,
  className = "",
  onAutosave,
  rightHeaderContent,
  diffMode,
}: TipTapEditorCoreProps) {
  const autosaveTimer = useRef<NodeJS.Timeout | null>(null);
  // Track if the last change came from the editor (internal) vs props (external)
  const isInternalChangeRef = useRef(false);
  // Track the last content we set from props to avoid circular updates
  const lastExternalContentRef = useRef<string>(content);

  const handleUpdate = useCallback(
    ({ editor }: { editor: Editor }) => {
      const html = editor.getHTML();
      const markdown = htmlToMarkdown(html);
      // Mark this as an internal change before calling onChange
      isInternalChangeRef.current = true;
      onChange(markdown);
    },
    [onChange]
  );

  // Build extensions array conditionally to support DiffExtension when in diff mode
  const extensions = diffMode
    ? [
        StarterKit,
        Highlight,
        DiffExtension.configure({
          oldText: diffMode.oldText,
          newText: diffMode.newText,
          diffChanges: diffMode.diffChanges,
          onAccept: diffMode.onAccept,
          onReject: diffMode.onReject,
        }),
      ]
    : [StarterKit, Highlight];

  const editor = useEditor({
    extensions,
    content: markdownToHtml(content),
    editorProps: {
      attributes: {
        class: `tiptap ${className}`,
      },
      editable: () => !diffMode, // Make read-only in diff mode
    },
    onUpdate: handleUpdate,
    immediatelyRender: false,
  });

  // Sync content from props to editor - only for external changes
  useEffect(() => {
    if (!editor) {
      return;
    }

    // If this change came from the editor itself, skip syncing
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      lastExternalContentRef.current = content;
      return;
    }

    // Only sync if content actually changed from an external source
    if (content !== lastExternalContentRef.current) {
      const currentHtml = editor.getHTML();
      const newHtml = markdownToHtml(content);
      if (currentHtml !== newHtml) {
        editor.commands.setContent(newHtml, {
          emitUpdate: false,
        });
      }
      lastExternalContentRef.current = content;
    }
  }, [editor, content]);

  // Autosave functionality
  useEffect(() => {
    if (!editor || !onAutosave) {
      return;
    }

    const handleAutosave = () => {
      const html = editor.getHTML();
      const markdown = htmlToMarkdown(html);
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }
      autosaveTimer.current = setTimeout(() => {
        onAutosave(markdown);
      }, 5000);
    };

    editor.on("update", handleAutosave);

    return () => {
      editor.off("update", handleAutosave);
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }
    };
  }, [editor, onAutosave]);

  if (!editor) {
    return (
      <div className="border border-border rounded-xl bg-card w-full">
        <div className="p-4 min-h-[600px] flex items-center justify-center">
          <div className="text-muted-foreground">A carregar editor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl bg-card w-full m-0.5">
      <MenuBar editor={editor} rightHeaderContent={rightHeaderContent} />
      <div className="p-4">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
