"use client";

import { htmlToMarkdown, markdownToHtml } from "@/lib/utils/markdown";
import Highlight from "@tiptap/extension-highlight";
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  className?: string;
  onAutosave?: (markdown: string) => void;
}

function MenuBar({ editor }: { editor: Editor }) {
  // Read the current editor's state, and re-render the component when it changes
  const editorState = useEditorState({
    editor,
    selector: (ctx) => {
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

  return (
    <div className="border-b border-[#C7C9D9] p-2 flex flex-wrap gap-1 sticky top-0 z-10 bg-white rounded-xl">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editorState.canBold}
        className={`p-2 rounded hover:bg-[#EEF0FF] transition-colors ${
          editorState.isBold ? "bg-[#6753FF] text-white" : ""
        }`}
        title="Negrito"
      >
        <strong>B</strong>
      </button>

      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editorState.canItalic}
        className={`p-2 rounded hover:bg-[#EEF0FF] transition-colors ${
          editorState.isItalic ? "bg-[#6753FF] text-white" : ""
        }`}
        title="Itálico"
      >
        <em>I</em>
      </button>

      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`p-2 rounded hover:bg-[#EEF0FF] transition-colors ${
          editorState.isHeading1 ? "bg-[#6753FF] text-white" : ""
        }`}
        title="Título 1"
      >
        H1
      </button>

      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`p-2 rounded hover:bg-[#EEF0FF] transition-colors ${
          editorState.isHeading2 ? "bg-[#6753FF] text-white" : ""
        }`}
        title="Título 2"
      >
        H2
      </button>

      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`p-2 rounded hover:bg-[#EEF0FF] transition-colors ${
          editorState.isHeading3 ? "bg-[#6753FF] text-white" : ""
        }`}
        title="Título 3"
      >
        H3
      </button>

      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-2 rounded hover:bg-[#EEF0FF] transition-colors ${
          editorState.isBulletList ? "bg-[#6753FF] text-white" : ""
        }`}
        title="Lista"
      >
        •
      </button>

      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-2 rounded hover:bg-[#EEF0FF] transition-colors ${
          editorState.isOrderedList ? "bg-[#6753FF] text-white" : ""
        }`}
        title="Lista Numerada"
      >
        1.
      </button>

      <button
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        className={`p-2 rounded hover:bg-[#EEF0FF] transition-colors ${
          editorState.isHighlight ? "bg-[#6753FF] text-white" : ""
        }`}
        title="Destacar"
      >
        <span className="bg-yellow-200 px-1">D</span>
      </button>

      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`p-2 rounded hover:bg-[#EEF0FF] transition-colors ${
          editorState.isBlockquote ? "bg-[#6753FF] text-white" : ""
        }`}
        title="Citação"
      >
        &ldquo;
      </button>

      <button
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={`p-2 rounded hover:bg-[#EEF0FF] transition-colors ${
          editorState.isCodeBlock ? "bg-[#6753FF] text-white" : ""
        }`}
        title="Bloco de Código"
      >
        {"<>"}
      </button>
    </div>
  );
}

export default function RichTextEditor({
  content,
  onChange,
  className = "",
  onAutosave,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit, Highlight],
    content: markdownToHtml(content),
    editorProps: {
      attributes: {
        class: `tiptap ${className}`,
      },
    },
    onUpdate: ({ editor }) => {
      // Convert HTML back to markdown and trigger onChange
      const html = editor.getHTML();
      const markdown = htmlToMarkdown(html);
      if (markdown !== content) {
        onChange(markdown);
      }
    },
    immediatelyRender: false,
  });

  // Only set content from prop on initial mount or when content changes from outside
  const prevContentRef = useRef<string | null>(null);
  useEffect(() => {
    if (editor && content !== prevContentRef.current) {
      editor.commands.setContent(markdownToHtml(content), {
        emitUpdate: false,
      });
      prevContentRef.current = content;
    }
    // Only run when the editor is first created or content changes from outside
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Debounced autosave logic
  const autosaveTimer = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!editor || !onAutosave) {
      return;
    }
    const handleUpdate = () => {
      const html = editor.getHTML();
      const markdown = htmlToMarkdown(html);
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }
      autosaveTimer.current = setTimeout(() => {
        onAutosave(markdown);
      }, 5000); // 5 seconds
    };
    editor.on("update", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }
    };
  }, [editor, onAutosave]);

  if (!editor) {
    return (
      <div className="border border-[#C7C9D9] rounded-xl bg-white">
        <div className="p-4 min-h-[600px] flex items-center justify-center">
          <div className="text-[#6C6F80]">A carregar editor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-[#C7C9D9] rounded-xl bg-white m-0.5">
      <MenuBar editor={editor} />
      <div className="p-4">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
