"use client";

import { DiffExtension, diffPluginKey } from "@/components/editor/extensions/DiffExtension";
import { AUTO_SAVE_DELAY } from "@/shared/config/constants";
import { htmlToMarkdown, markdownToHtml } from "@/shared/utils/markdown";
import { ImageBlockExtension } from "@/components/editor/extensions/ImageBlockExtension";
import Highlight from "@tiptap/extension-highlight";
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ImagePlus, Loader2 } from "lucide-react";
import { memo, useCallback, useEffect, useRef, type ChangeEvent } from "react";

interface TipTapEditorCoreProps {
  content: string;
  onChange: (content: string) => void;
  className?: string;
  onAutosave?: (markdown: string) => void;
  rightHeaderContent?: React.ReactNode;
  onEditorReady?: (editor: Editor) => void;
  onImageUpload?: (file: File) => Promise<void> | void;
  isImageUploading?: boolean;
}

// Memoized MenuBar component
const MenuBar = memo(function MenuBar({ 
  editor, 
  rightHeaderContent,
  onUploadImage,
  isImageUploading = false,
}: { 
  editor: Editor;
  rightHeaderContent?: React.ReactNode;
  onUploadImage?: () => void;
  isImageUploading?: boolean;
}) {
  const editorState = useEditorState({
    editor,
    selector: (ctx) => ({
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
    }),
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
  const handleUploadImage = useCallback(() => {
    onUploadImage?.();
  }, [onUploadImage]);

  return (
    <div className="sticky top-0 z-10 flex w-full items-center gap-2 overflow-hidden rounded-t-xl border-b border-border bg-card p-2">
      <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-0.5 pr-1">
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

      {onUploadImage && (
        <button
          onClick={handleUploadImage}
          disabled={isImageUploading}
          className={`p-2 rounded hover:bg-accent transition-colors ${
            isImageUploading
              ? "text-muted-foreground opacity-70"
              : "text-foreground"
          }`}
          title={isImageUploading ? "A carregar imagem..." : "Carregar imagem"}
          type="button"
        >
          {isImageUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
        </button>
      )}
      </div>
      {rightHeaderContent && (
        <div className="flex shrink-0 items-center gap-2 pl-1 sm:pl-2">
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
  onEditorReady,
  onImageUpload,
  isImageUploading = false,
}: TipTapEditorCoreProps) {
  const autosaveTimer = useRef<NodeJS.Timeout | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  // Track if the last change came from the editor (internal) vs props (external)
  const isInternalChangeRef = useRef(false);
  // Track the last content we set from props to avoid circular updates
  const lastExternalContentRef = useRef<string>(content);

  const handleUpdate = useCallback(
    ({ editor }: { editor: Editor }) => {
      // Skip onChange during diff/suggestions mode to prevent cascading updates
      const pluginState = diffPluginKey.getState(editor.state);
      if (pluginState?.active) {
        return;
      }

      const html = editor.getHTML();
      const markdown = htmlToMarkdown(html);
      // Mark this as an internal change before calling onChange
      isInternalChangeRef.current = true;
      onChange(markdown);
    },
    [onChange]
  );

  const editor = useEditor({
    extensions: [StarterKit, Highlight, DiffExtension, ImageBlockExtension],
    content: markdownToHtml(content),
    editorProps: {
      attributes: {
        class: `tiptap ${className}`,
      },
    },
    onUpdate: handleUpdate,
    immediatelyRender: false,
  });

  const handleToolbarUploadClick = useCallback(() => {
    if (!onImageUpload || isImageUploading) {
      return;
    }
    imageInputRef.current?.click();
  }, [onImageUpload, isImageUploading]);

  const handleImageFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file || !onImageUpload) {
        return;
      }
      await onImageUpload(file);
    },
    [onImageUpload]
  );

  // Expose editor instance to parent component
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

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
      // Skip autosave when diff/suggestions mode is active
      // Autosaving during diff mode would sync AI content back and destroy decorations
      const pluginState = diffPluginKey.getState(editor.state);
      if (pluginState?.active) {
        return;
      }

      const html = editor.getHTML();
      const markdown = htmlToMarkdown(html);
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }
      autosaveTimer.current = setTimeout(() => {
        onAutosave(markdown);
      }, AUTO_SAVE_DELAY);
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
    <div className="w-full rounded-xl border border-border bg-card">
      <MenuBar
        editor={editor}
        rightHeaderContent={rightHeaderContent}
        onUploadImage={onImageUpload ? handleToolbarUploadClick : undefined}
        isImageUploading={isImageUploading}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="hidden"
        onChange={handleImageFileChange}
      />
      <div className="p-2 sm:p-4">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
