"use client";

import { cn } from "@/shared/utils/utils";
import { Extension } from "@tiptap/core";
import { InlineMath } from "@tiptap/extension-mathematics";
import { Plugin } from "@tiptap/pm/state";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type Ref } from "react";
import { MathFieldPopover, type MathAnchor } from "./MathFieldPopover";
import { docToText, textToDoc, type MathRule } from "./mathText";

export interface MathTextInputHandle {
  /** Inserts an empty formula at the cursor and opens it. */
  insertFormula: () => void;
}

// The formula node keeps how it was written, so untouched text is saved back unchanged (mathText.ts).
const StoredInlineMath = InlineMath.extend({
  addAttributes() {
    return { ...this.parent?.(), raw: { default: null, rendered: false } };
  },
});

type Editing = { pos: number; tex: string; anchor: MathAnchor };

/**
 * A text field whose formulas show as maths and edit like in Word (click one, type in it); the teacher never sees
 * LaTeX. The value stays the stored string ("Calcula $\frac{3}{4}$."). Looks like the app's Input/Textarea.
 */
export function MathTextInput({
  value,
  onChange,
  multiline = false,
  allowBlank = false,
  placeholder,
  maxLength,
  autoFocus = false,
  className,
  style,
  plain = false,
  onBlur,
  onKeyDown,
  onEnter,
  onTooLong,
  initialFormula,
  mathRule = "slide",
  ref,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  /** Fill-in-the-gaps: the formula field offers a blank. */
  allowBlank?: boolean;
  placeholder?: string;
  maxLength?: number;
  autoFocus?: boolean;
  className?: string;
  style?: CSSProperties;
  /** No input chrome (border, padding): for text edited in place, like a slide's text box. */
  plain?: boolean;
  onBlur?: (value: string) => void;
  onKeyDown?: (e: ReactKeyboardEvent<HTMLDivElement>) => void;
  /** Enter (without Shift) finishes instead of starting a new line; Shift+Enter still breaks the line. */
  onEnter?: () => void;
  /** An edit was refused because the text would go over maxLength. */
  onTooLong?: () => void;
  /** Opens this formula (by order in the text) as soon as the field is ready. */
  initialFormula?: number;
  /** Which `$…$` are formulas: the rule of the text's renderer ("sheet" for exercises, see mathText.ts). */
  mathRule?: MathRule;
  ref?: Ref<MathTextInputHandle>;
  "aria-label"?: string;
}) {
  const [editing, setEditing] = useState<Editing | null>(null);
  const editingRef = useRef<Editing | null>(null);
  editingRef.current = editing;
  const latest = useRef({ value, onChange, onBlur, maxLength, onEnter, onTooLong });
  latest.current = { value, onChange, onBlur, maxLength, onEnter, onTooLong };
  // Set while the value from outside replaces the content: that is never refused for its length.
  const replacing = useRef(false);
  const editorRef = useRef<Editor | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const open = (editor: Editor, pos: number) => {
    const node = editor.state.doc.nodeAt(pos);
    const dom = editor.view.nodeDOM(pos) as HTMLElement | null;
    if (!node || node.type.name !== "inlineMath" || !dom) return;
    const r = dom.getBoundingClientRect();
    setEditing({ pos, tex: String(node.attrs.latex ?? ""), anchor: { x: r.left, y: r.bottom } });
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        blockquote: false, bold: false, bulletList: false, code: false, codeBlock: false, heading: false,
        horizontalRule: false, italic: false, listItem: false, listKeymap: false, link: false, orderedList: false,
        strike: false, underline: false, dropcursor: false, gapcursor: false, trailingNode: false,
      }),
      StoredInlineMath.configure({ onClick: (_node, pos) => editorRef.current && open(editorRef.current, pos) }),
      // Over maxLength the edit is refused as a whole (typing, paste, a formula), never half undone.
      Extension.create({
        name: "lengthLimit",
        addProseMirrorPlugins: () => [
          new Plugin({
            filterTransaction: (tr, state) => {
              const max = latest.current.maxLength;
              if (max === undefined || !tr.docChanged || replacing.current) return true;
              const next = docToText(tr.doc.toJSON(), mathRule).length;
              if (next <= max || next <= docToText(state.doc.toJSON(), mathRule).length) return true;
              latest.current.onTooLong?.();
              return false;
            },
          }),
        ],
      }),
    ],
    content: textToDoc(value, multiline, mathRule),
    autofocus: autoFocus ? "end" : false,
    editorProps: {
      attributes: {
        // Long text wraps in single-line fields too (table cells, options); Enter still adds no line.
        class: "math-text-input whitespace-pre-wrap break-words outline-none",
        ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
        role: "textbox",
        ...(multiline ? { "aria-multiline": "true" } : {}),
      },
      handleKeyDown: (view, event) => {
        if (event.key === "Enter" && !event.shiftKey && latest.current.onEnter) {
          latest.current.onEnter();
          return true;
        }
        // A single-line field has no line breaks (as an <input>).
        if (event.key === "Enter" && !multiline) return true;
        // Enter on a selected formula opens it, for keyboard users.
        const sel = view.state.selection as { node?: { type: { name: string } }; from: number };
        if (event.key === "Enter" && sel.node?.type.name === "inlineMath" && editorRef.current) {
          open(editorRef.current, sel.from);
          return true;
        }
        return false;
      },
      handlePaste: (_view, event) => {
        // Pasted text keeps its $…$ formulas; a single-line field drops line breaks.
        const text = event.clipboardData?.getData("text/plain");
        if (text === undefined || !editorRef.current) return false;
        const clean = multiline ? text : text.replace(/\s*\n\s*/g, " ");
        const doc = textToDoc(clean, multiline, mathRule);
        editorRef.current.commands.insertContent(multiline ? doc.content ?? [] : doc.content?.[0]?.content ?? []);
        return true;
      },
    },
    onUpdate: ({ editor: ed }) => {
      const next = docToText(ed.getJSON(), mathRule);
      if (next !== latest.current.value) latest.current.onChange(next);
    },
    onBlur: ({ editor: ed }) => {
      // Opening a formula moves focus to its field: that isn't leaving the text.
      if (!editingRef.current) latest.current.onBlur?.(docToText(ed.getJSON(), mathRule));
    },
  });
  editorRef.current = editor;

  // A value changed from outside (undo, chat, another field) replaces the content.
  useEffect(() => {
    if (!editor || docToText(editor.getJSON(), mathRule) === value) return;
    // An open formula would point into the old text.
    setEditing(null);
    replacing.current = true;
    editor.commands.setContent(textToDoc(value, multiline, mathRule), { emitUpdate: false });
    replacing.current = false;
  }, [editor, value, multiline, mathRule]);

  // Opened on a formula (a double-click on it): that formula's field opens once the editor is there.
  const openedInitial = useRef(false);
  useEffect(() => {
    if (!editor || initialFormula === undefined || openedInitial.current) return;
    openedInitial.current = true;
    let n = 0;
    let found = -1;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "inlineMath" && n++ === initialFormula) found = pos;
      return found < 0;
    });
    if (found >= 0) open(editor, found);
  }, [editor, initialFormula]);

  useImperativeHandle(ref, () => ({
    insertFormula: () => {
      if (!editor) return;
      editor.chain().focus().insertContent({ type: "inlineMath", attrs: { latex: "" } }).run();
      open(editor, editor.state.selection.from - 1);
    },
  }), [editor]);

  const finish = (tex: string | null) => {
    const current = editingRef.current;
    setEditing(null);
    if (!editor || !current) return;
    if (tex === null) {
      // Cancelled: a formula just inserted and still empty goes away.
      if (!current.tex) editor.chain().deleteRange({ from: current.pos, to: current.pos + 1 }).run();
    } else if (!tex.trim()) {
      editor.chain().deleteRange({ from: current.pos, to: current.pos + 1 }).run();
    } else if (tex !== current.tex) {
      editor.commands.updateInlineMath({ latex: tex, pos: current.pos });
    }
    editor.commands.focus(current.pos + 1);
  };

  const empty = value === "";
  return (
    <div
      className={cn(
        "relative w-full min-w-0 cursor-text",
        !plain && "rounded-md border border-input bg-transparent px-3 text-base shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 dark:bg-input/30 md:text-sm",
        !plain && (multiline ? "min-h-16 py-2" : "flex min-h-9 items-center py-1"),
        "[&_.tiptap-mathematics-render]:cursor-pointer [&_.tiptap-mathematics-render]:rounded [&_.tiptap-mathematics-render]:px-0.5 [&_.tiptap-mathematics-render:hover]:bg-primary/10",
        className,
      )}
      style={style}
      ref={boxRef}
      // The formula popover is a portal but a React child: its clicks and keys bubble here and are not the text's.
      onKeyDown={(e) => e.currentTarget.contains(e.target as Node) && onKeyDown?.(e)}
      onClick={(e) => e.currentTarget.contains(e.target as Node) && editor?.commands.focus()}
    >
      {empty && placeholder && (
        <span className="pointer-events-none absolute text-muted-foreground" aria-hidden>
          {placeholder}
        </span>
      )}
      <EditorContent editor={editor} className={cn("min-w-0 flex-1", !plain && "overflow-x-auto")} />
      {editing && (
        <MathFieldPopover
          tex={editing.tex}
          anchor={editing.anchor}
          allowBlank={allowBlank}
          within={boxRef.current?.closest<HTMLElement>('[role="dialog"]') ?? null}
          onSave={(tex) => finish(tex)}
          onCancel={() => finish(null)}
        />
      )}
    </div>
  );
}
