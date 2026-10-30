"use client";

import {
  DiffExtension,
  diffPluginKey,
} from "@/components/editor/extensions/DiffExtension";
import { ImageBlockExtension } from "@/components/editor/extensions/ImageBlockExtension";
import { MathFieldPopover } from "@/components/math/MathFieldPopover";
import { AUTO_SAVE_DELAY } from "@/shared/config/constants";
import { htmlToMarkdown, markdownToHtml } from "@/shared/utils/markdown";
import { TableKit } from "@tiptap/extension-table";
import Highlight from "@tiptap/extension-highlight";
import { Mathematics } from "@tiptap/extension-mathematics";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useTranslations } from "next-intl";
import {
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  Code,
  Columns2,
  Highlighter,
  ImagePlus,
  Loader2,
  Quote,
  Rows2,
  Table2,
  Trash2,
} from "lucide-react";
import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type TouchEvent,
} from "react";
import { createPortal } from "react-dom";

interface TipTapEditorCoreProps {
  content: string;
  onChange: (content: string) => void;
  className?: string;
  onAutosave?: (markdown: string) => void;
  rightHeaderContent?: React.ReactNode;
  onEditorReady?: (editor: Editor) => void;
  onEditorActivity?: () => void;
  onImageUpload?: (file: File) => Promise<void> | void;
  isImageUploading?: boolean;
  page?: boolean;
}

interface MathEditState {
  latex: string;
  pos: number;
  type: "inline" | "block";
  x: number;
  y: number;
}

// Memoized MenuBar component
const MenuBar = memo(function MenuBar({
  editor,
  rightHeaderContent,
  onEditorActivity,
  onUploadImage,
  isImageUploading = false,
  onOpenFormula,
}: {
  editor: Editor;
  rightHeaderContent?: React.ReactNode;
  onEditorActivity?: () => void;
  onUploadImage?: () => void;
  isImageUploading?: boolean;
  onOpenFormula?: () => void;
}) {
  const t = useTranslations("editor.richTextEditor");
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
      isMath:
        ctx.editor.isActive("inlineMath") || ctx.editor.isActive("blockMath"),
    }),
  });

  const runEditorCommand = useCallback(
    (command: () => void) => {
      onEditorActivity?.();
      command();
    },
    [onEditorActivity],
  );

  const handleBold = useCallback(
    () => runEditorCommand(() => editor.chain().focus().toggleBold().run()),
    [editor, runEditorCommand],
  );
  const handleItalic = useCallback(
    () => runEditorCommand(() => editor.chain().focus().toggleItalic().run()),
    [editor, runEditorCommand],
  );
  const handleH1 = useCallback(
    () =>
      runEditorCommand(() =>
        editor.chain().focus().toggleHeading({ level: 1 }).run(),
      ),
    [editor, runEditorCommand],
  );
  const handleH2 = useCallback(
    () =>
      runEditorCommand(() =>
        editor.chain().focus().toggleHeading({ level: 2 }).run(),
      ),
    [editor, runEditorCommand],
  );
  const handleH3 = useCallback(
    () =>
      runEditorCommand(() =>
        editor.chain().focus().toggleHeading({ level: 3 }).run(),
      ),
    [editor, runEditorCommand],
  );
  const handleBullet = useCallback(
    () =>
      runEditorCommand(() => editor.chain().focus().toggleBulletList().run()),
    [editor, runEditorCommand],
  );
  const handleOrdered = useCallback(
    () =>
      runEditorCommand(() => editor.chain().focus().toggleOrderedList().run()),
    [editor, runEditorCommand],
  );
  const handleHighlight = useCallback(
    () =>
      runEditorCommand(() => editor.chain().focus().toggleHighlight().run()),
    [editor, runEditorCommand],
  );
  const handleBlockquote = useCallback(
    () =>
      runEditorCommand(() => editor.chain().focus().toggleBlockquote().run()),
    [editor, runEditorCommand],
  );
  const handleCodeBlock = useCallback(
    () =>
      runEditorCommand(() => editor.chain().focus().toggleCodeBlock().run()),
    [editor, runEditorCommand],
  );
  const handleInsertMath = useCallback(
    () => runEditorCommand(() => onOpenFormula?.()),
    [onOpenFormula, runEditorCommand],
  );
  const handleInsertTable = useCallback(
    () => runEditorCommand(() =>
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    ),
    [editor, runEditorCommand],
  );

  const handleUploadImage = useCallback(() => {
    onEditorActivity?.();
    onUploadImage?.();
  }, [onEditorActivity, onUploadImage]);

  return (
    <div className="sticky top-0 z-10 flex w-full items-center gap-2 overflow-hidden rounded-t-xl border-b border-border bg-card p-2">
      <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-0.5 pr-1">
        <button
          onClick={handleBold}
          disabled={!editorState.canBold}
          className={`p-2 rounded hover:bg-accent transition-colors ${editorState.isBold ? "bg-primary text-primary-foreground" : "text-foreground"}`}
          title={t("bold")}
          type="button"
        >
          <strong>B</strong>
        </button>
        <button
          onClick={handleItalic}
          disabled={!editorState.canItalic}
          className={`p-2 rounded hover:bg-accent transition-colors ${editorState.isItalic ? "bg-primary text-primary-foreground" : "text-foreground"}`}
          title={t("italic")}
          type="button"
        >
          <em>I</em>
        </button>
        <button
          onClick={handleH1}
          className={`p-2 rounded hover:bg-accent transition-colors ${editorState.isHeading1 ? "bg-primary text-primary-foreground" : "text-foreground"}`}
          title={t("heading1")}
          type="button"
        >
          H1
        </button>
        <button
          onClick={handleH2}
          className={`p-2 rounded hover:bg-accent transition-colors ${editorState.isHeading2 ? "bg-primary text-primary-foreground" : "text-foreground"}`}
          title={t("heading2")}
          type="button"
        >
          H2
        </button>
        <button
          onClick={handleH3}
          className={`p-2 rounded hover:bg-accent transition-colors ${editorState.isHeading3 ? "bg-primary text-primary-foreground" : "text-foreground"}`}
          title={t("heading3")}
          type="button"
        >
          H3
        </button>
        <button
          onClick={handleBullet}
          className={`p-2 rounded hover:bg-accent transition-colors ${editorState.isBulletList ? "bg-primary text-primary-foreground" : "text-foreground"}`}
          title={t("bulletList")}
          type="button"
        >
          •
        </button>
        <button
          onClick={handleOrdered}
          className={`p-2 rounded hover:bg-accent transition-colors ${editorState.isOrderedList ? "bg-primary text-primary-foreground" : "text-foreground"}`}
          title={t("orderedList")}
          type="button"
        >
          1.
        </button>
        <button
          onClick={handleHighlight}
          className={`p-2 rounded hover:bg-accent transition-colors ${editorState.isHighlight ? "bg-primary text-primary-foreground" : "text-foreground"}`}
          title={t("highlight")}
          type="button"
        >
          <Highlighter className="h-4 w-4" />
        </button>
        <button
          onClick={handleBlockquote}
          className={`p-2 rounded hover:bg-accent transition-colors ${editorState.isBlockquote ? "bg-primary text-primary-foreground" : "text-foreground"}`}
          title={t("blockquote")}
          type="button"
        >
          <Quote className="h-4 w-4" />
        </button>
        <button
          onClick={handleCodeBlock}
          className={`p-2 rounded hover:bg-accent transition-colors ${editorState.isCodeBlock ? "bg-primary text-primary-foreground" : "text-foreground"}`}
          title={t("codeBlock")}
          type="button"
        >
          <Code className="h-4 w-4" />
        </button>
        <button
          onClick={handleInsertMath}
          className={`p-2 rounded hover:bg-accent transition-colors ${editorState.isMath ? "bg-primary text-primary-foreground" : "text-foreground"}`}
          title={t("insertMath")}
          type="button"
        >
          Σ
        </button>
        <button
          onClick={handleInsertTable}
          className="p-2 rounded hover:bg-accent transition-colors text-foreground"
          title={t("insertTable")}
          type="button"
        >
          <Table2 className="h-4 w-4" />
        </button>
        {onUploadImage && (
          <button
            onClick={handleUploadImage}
            disabled={isImageUploading}
            className={`p-2 rounded hover:bg-accent transition-colors ${isImageUploading ? "text-muted-foreground opacity-70" : "text-foreground"}`}
            title={isImageUploading ? t("uploadingImage") : t("uploadImage")}
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
  onEditorActivity,
  onImageUpload,
  isImageUploading = false,
  page = false,
}: TipTapEditorCoreProps) {
  const t = useTranslations("editor.richTextEditor");
  const autosaveTimer = useRef<NodeJS.Timeout | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const isInternalChangeRef = useRef(false);
  const lastExternalContentRef = useRef<string>(content);

  // Math edit popover state
  const [mathEdit, setMathEdit] = useState<MathEditState | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const setMathEditRef = useRef(setMathEdit);
  setMathEditRef.current = setMathEdit;

  const mathOnClick = useRef({
    inline: (node: ProseMirrorNode, pos: number) => {
      const ed = editorRef.current;
      if (!ed) return;
      const coords = ed.view.coordsAtPos(pos);
      setMathEditRef.current({
        latex: node.attrs.latex,
        pos,
        type: "inline",
        x: coords.left,
        y: coords.bottom,
      });
    },
    block: (node: ProseMirrorNode, pos: number) => {
      const ed = editorRef.current;
      if (!ed) return;
      const coords = ed.view.coordsAtPos(pos);
      setMathEditRef.current({
        latex: node.attrs.latex,
        pos,
        type: "block",
        x: coords.left,
        y: coords.bottom,
      });
    },
  });

  const handleUpdate = useCallback(
    ({ editor }: { editor: Editor }) => {
      const pluginState = diffPluginKey.getState(editor.state);
      if (pluginState?.active) return;
      const html = editor.getHTML();
      const markdown = htmlToMarkdown(html);
      isInternalChangeRef.current = true;
      onChange(markdown);
    },
    [onChange],
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      TableKit,
      Highlight,
      Mathematics.configure({
        inlineOptions: { onClick: mathOnClick.current.inline },
        blockOptions: { onClick: mathOnClick.current.block },
      }),
      DiffExtension,
      ImageBlockExtension,
    ],
    content: markdownToHtml(content),
    editorProps: { attributes: { class: `tiptap ${className}` } },
    onUpdate: handleUpdate,
    onFocus: () => {
      onEditorActivity?.();
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // The formula field: null = cancelled; "" = emptied, so the formula goes.
  const handleMathSave = useCallback(
    (tex: string | null) => {
      setMathEdit(null);
      if (!editor || !mathEdit) return;
      const node = editor.state.doc.nodeAt(mathEdit.pos);
      if ((tex === null && !mathEdit.latex) || (tex !== null && !tex.trim())) {
        if (node) editor.chain().focus().deleteRange({ from: mathEdit.pos, to: mathEdit.pos + node.nodeSize }).run();
        return;
      }
      if (tex === null || tex === mathEdit.latex) return;
      if (mathEdit.type === "inline") editor.commands.updateInlineMath({ latex: tex, pos: mathEdit.pos });
      else editor.commands.updateBlockMath({ latex: tex, pos: mathEdit.pos });
    },
    [editor, mathEdit],
  );

  // "Fórmula": an empty formula at the cursor, opened straight away.
  const handleFormulaInsert = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertContent({ type: "inlineMath", attrs: { latex: "" } }).run();
    const pos = editor.state.selection.from - 1;
    const coords = editor.view.coordsAtPos(pos);
    setMathEdit({ latex: "", pos, type: "inline", x: coords.left, y: coords.bottom });
  }, [editor]);


  const handleToolbarUploadClick = useCallback(() => {
    if (!onImageUpload || isImageUploading) return;
    imageInputRef.current?.click();
  }, [onImageUpload, isImageUploading]);

  const handleImageFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file || !onImageUpload) return;
      await onImageUpload(file);
    },
    [onImageUpload],
  );

  useEffect(() => {
    if (editor && onEditorReady) onEditorReady(editor);
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (!editor) return;
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      lastExternalContentRef.current = content;
      return;
    }
    if (content !== lastExternalContentRef.current) {
      const currentHtml = editor.getHTML();
      const newHtml = markdownToHtml(content);
      if (currentHtml !== newHtml) {
        editor.commands.setContent(newHtml, { emitUpdate: false });
      }
      lastExternalContentRef.current = content;
    }
  }, [editor, content]);

  useEffect(() => {
    if (!editor || !onAutosave) return;
    const handleAutosave = () => {
      const pluginState = diffPluginKey.getState(editor.state);
      if (pluginState?.active) return;
      const html = editor.getHTML();
      const markdown = htmlToMarkdown(html);
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(() => {
        onAutosave(markdown);
      }, AUTO_SAVE_DELAY);
    };
    editor.on("update", handleAutosave);
    return () => {
      editor.off("update", handleAutosave);
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [editor, onAutosave]);

  // ── Table right-click context menu ─────────────────────────────────────────
  const [tableCtx, setTableCtx] = useState<{ x: number; y: number } | null>(null);
  const tableCtxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tableCtx) return;
    function close(e: MouseEvent) {
      if (tableCtxRef.current && !tableCtxRef.current.contains(e.target as Node)) {
        setTableCtx(null);
      }
    }
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") setTableCtx(null);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    document.addEventListener("scroll", () => setTableCtx(null), { once: true, capture: true });
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [tableCtx]);

  function handleContextMenu(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest("td, th")) return;
    e.preventDefault();
    showTableCtx(e.clientX, e.clientY);
  }

  // Long-press for touch screens (500 ms hold on a table cell)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressPos = useRef<{ x: number; y: number } | null>(null);

  function handleTouchStart(e: TouchEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (!target.closest("td, th")) return;
    const touch = e.touches[0];
    longPressPos.current = { x: touch.clientX, y: touch.clientY };
    longPressTimer.current = setTimeout(() => {
      if (longPressPos.current) showTableCtx(longPressPos.current.x, longPressPos.current.y);
    }, 500);
  }

  function handleTouchEnd() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressPos.current = null;
  }

  function showTableCtx(x: number, y: number) {
    // Keep menu inside viewport horizontally
    const menuWidth = 224;
    const safeX = x + menuWidth > window.innerWidth ? window.innerWidth - menuWidth - 8 : x;
    setTableCtx({ x: safeX, y });
  }

  if (!editor) {
    return (
      <div className="border border-border rounded-xl bg-card w-full">
        <div className="p-4 min-h-[600px] flex items-center justify-center">
          <div className="text-muted-foreground">{t("loadingEditor")}</div>
        </div>
      </div>
    );
  }

  // Defined after the !editor guard so `editor` is non-null throughout.
  type CtxAction =
    | { divider: true }
    | { label: string; icon: React.ElementType; run: () => void; destructive?: boolean };

  const tableCtxActions: CtxAction[] = [
    { label: t("insertRowAbove"),   icon: ArrowUpToLine,    run: () => editor.chain().focus().addRowBefore().run() },
    { label: t("insertRowBelow"),   icon: ArrowDownToLine,  run: () => editor.chain().focus().addRowAfter().run() },
    { label: t("deleteRow"),        icon: Rows2,            run: () => editor.chain().focus().deleteRow().run() },
    { divider: true },
    { label: t("insertColumnLeft"), icon: ArrowLeftToLine,  run: () => editor.chain().focus().addColumnBefore().run() },
    { label: t("insertColumnRight"),icon: ArrowRightToLine, run: () => editor.chain().focus().addColumnAfter().run() },
    { label: t("deleteColumn"),     icon: Columns2,         run: () => editor.chain().focus().deleteColumn().run() },
    { divider: true },
    { label: t("deleteTable"),      icon: Trash2,           run: () => editor.chain().focus().deleteTable().run(), destructive: true },
  ];

  return (
    <div className="relative w-full">
      {mathEdit && (
        <MathFieldPopover
          tex={mathEdit.latex}
          anchor={{ x: mathEdit.x, y: mathEdit.y }}
          onSave={(tex) => handleMathSave(tex)}
          onCancel={() => handleMathSave(null)}
        />
      )}
      <div className={page ? "w-full rounded-md border border-border bg-card shadow-sm" : "w-full rounded-xl border border-border bg-card"}>
        <MenuBar
          editor={editor}
          rightHeaderContent={rightHeaderContent}
          onEditorActivity={onEditorActivity}
          onUploadImage={onImageUpload ? handleToolbarUploadClick : undefined}
          isImageUploading={isImageUploading}
          onOpenFormula={handleFormulaInsert}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          className="hidden"
          onChange={handleImageFileChange}
        />
        <div
          className={page ? "px-4 py-6 sm:px-10 sm:py-8" : "p-2 sm:p-4"}
          onContextMenu={handleContextMenu}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchEnd}
        >
          <EditorContent editor={editor} />
        </div>
      </div>
      {/* Table context menu portal */}
      {tableCtx && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={tableCtxRef}
            style={{ position: "fixed", top: tableCtx.y, left: tableCtx.x, zIndex: 9999 }}
            className="w-56 rounded-lg border border-border bg-card py-1 shadow-xl"
          >
            {tableCtxActions.map((action, i) => {
              if ("divider" in action) {
                return <div key={i} className="my-1 border-t border-border" />;
              }
              const Icon = action.icon;
              return (
                <button
                  key={i}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    action.run();
                    setTableCtx(null);
                  }}
                  className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent ${action.destructive ? "text-destructive hover:text-destructive" : "text-foreground"}`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {action.label}
                </button>
              );
            })}
          </div>,
          document.body
        )
      }
    </div>
  );
}
