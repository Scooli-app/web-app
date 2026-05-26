/**
 * SlideEditorView — WYSIWYG click-to-edit slide editor.
 *
 * Mirrors the visual layouts from SlideRenderer but every text node is
 * contenteditable. No separate form panel — the slide IS the editor.
 *
 * Design rules:
 *  - Subtle dashed ring on hover, primary ring on focus (edit mode).
 *  - List items: individual contenteditable spans + per-item trash button.
 *  - Image placeholders: editable prompt text inside a styled zone.
 *  - Enter key blurs (commits) instead of inserting a newline.
 *  - External value changes are synced via ref without clobbering the cursor.
 */
"use client";

import { cn } from "@/shared/utils/utils";
import type { ContentBlock, SlideBlock } from "@/shared/types/blocks";
import { Plus, Trash2, ImageIcon } from "lucide-react";
import { useEffect, useRef } from "react";

/* --------------------------------------------------------------------------
 * Slide frame — identical to SlideRenderer's, with edit-mode cursor.
 * -------------------------------------------------------------------------- */

function SlideFrame({
  children,
  className,
  pad = true,
}: {
  children: React.ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
      <div className={cn("absolute inset-0", pad && "p-[4%]", className)}>
        {children}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * EditableText — contenteditable block element.
 * Uses onInput for real-time sync; external value changes pushed via ref.
 * -------------------------------------------------------------------------- */

function EditableText({
  value,
  onChange,
  className,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isComposing = useRef(false);

  // Push external changes without disturbing the cursor
  useEffect(() => {
    const el = ref.current;
    if (el && el.textContent !== value) {
      el.textContent = value;
    }
  }, [value]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder ?? ""}
      onCompositionStart={() => {
        isComposing.current = true;
      }}
      onCompositionEnd={(e) => {
        isComposing.current = false;
        onChange(e.currentTarget.textContent ?? "");
      }}
      onInput={(e) => {
        if (!isComposing.current)
          onChange(e.currentTarget.textContent ?? "");
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      className={cn(
        "outline-none min-h-[1em] rounded px-1 -mx-1 transition-colors",
        "hover:bg-white/5 focus:bg-white/5",
        "ring-0 hover:ring-1 hover:ring-primary/30 focus:ring-1 focus:ring-primary ring-inset",
        // Placeholder via CSS :empty pseudo — works in modern browsers
        "empty:before:content-[attr(data-placeholder)] empty:before:opacity-30 empty:before:pointer-events-none empty:before:select-none",
        className,
      )}
    />
  );
}

/* --------------------------------------------------------------------------
 * Editable list (bullet or ordered).
 * -------------------------------------------------------------------------- */

function EditableList({
  items,
  ordered,
  onChange,
  itemClassName,
}: {
  items: string[];
  ordered: boolean;
  onChange: (items: string[]) => void;
  itemClassName?: string;
}) {
  const updateItem = (i: number, v: string) => {
    const next = [...items];
    next[i] = v;
    onChange(next);
  };
  const removeItem = (i: number) => {
    if (items.length > 1) onChange(items.filter((_, idx) => idx !== i));
  };
  const addItem = () => {
    if (items.length < 6) onChange([...items, ""]);
  };

  return (
    <div className="flex flex-col gap-[0.3em]">
      {items.map((item, i) => (
        <div key={i} className="group/item flex items-start gap-[0.4em]">
          <span className="shrink-0 select-none text-primary mt-[0.05em]">
            {ordered ? `${i + 1}.` : "•"}
          </span>
          <EditableListItem
            value={item}
            onChange={(v) => updateItem(i, v)}
            className={itemClassName}
            placeholder={`Item ${i + 1}`}
            onEnter={addItem}
          />
          {items.length > 1 ? (
            <button
              onClick={() => removeItem(i)}
              className="shrink-0 mt-[0.1em] opacity-0 group-hover/item:opacity-60 hover:!opacity-100 transition-opacity text-destructive"
              title="Remover item"
            >
              <Trash2 className="h-[0.9em] w-[0.9em]" />
            </button>
          ) : null}
        </div>
      ))}
      {items.length < 6 ? (
        <button
          onClick={addItem}
          className="flex items-center gap-1 text-[0.8em] text-muted-foreground/50 hover:text-primary transition-colors w-fit mt-[0.1em] ml-[1.4em]"
        >
          <Plus className="h-[0.8em] w-[0.8em]" />
          Adicionar item
        </button>
      ) : null}
    </div>
  );
}

function EditableListItem({
  value,
  onChange,
  className,
  placeholder,
  onEnter,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
  onEnter?: () => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isComposing = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (el && el.textContent !== value) el.textContent = value;
  }, [value]);

  return (
    <span
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder ?? ""}
      onCompositionStart={() => {
        isComposing.current = true;
      }}
      onCompositionEnd={(e) => {
        isComposing.current = false;
        onChange(e.currentTarget.textContent ?? "");
      }}
      onInput={(e) => {
        if (!isComposing.current)
          onChange(e.currentTarget.textContent ?? "");
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onEnter?.();
        }
      }}
      className={cn(
        "flex-1 outline-none min-h-[1em] rounded px-0.5 -mx-0.5 transition-colors",
        "hover:bg-white/5 focus:bg-white/5",
        "ring-0 hover:ring-1 hover:ring-primary/30 focus:ring-1 focus:ring-primary ring-inset",
        "empty:before:content-[attr(data-placeholder)] empty:before:opacity-30 empty:before:pointer-events-none",
        className,
      )}
    />
  );
}

/* --------------------------------------------------------------------------
 * Image placeholder zone — shows the prompt text (editable).
 * -------------------------------------------------------------------------- */

function ImagePlaceholderZone({
  prompt,
  onChange,
  className,
}: {
  prompt: string;
  onChange: (prompt: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/50 bg-muted/20 text-center p-4",
        className,
      )}
    >
      <ImageIcon className="h-[10%] w-[10%] min-h-4 min-w-4 text-muted-foreground/40" />
      <EditableText
        value={prompt}
        onChange={onChange}
        className="text-[1.2cqw] text-muted-foreground text-center"
        placeholder="Descrição da imagem a gerar"
      />
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Editable content block dispatcher.
 * -------------------------------------------------------------------------- */

function EditableBlock({
  block,
  onChange,
  onRemove,
  textSize = "text-[1.7cqw]",
}: {
  block: ContentBlock;
  onChange: (patch: Partial<ContentBlock>) => void;
  onRemove: () => void;
  textSize?: string;
}) {
  return (
    <div className="group/block relative">
      {/* Trash button — appears on block hover */}
      <button
        onClick={onRemove}
        className="absolute -right-1 -top-1 z-10 opacity-0 group-hover/block:opacity-60 hover:!opacity-100 transition-opacity text-destructive bg-card rounded p-0.5"
        title="Remover bloco"
      >
        <Trash2 className="h-3 w-3" />
      </button>

      {block.type === "paragraph" && (
        <EditableText
          value={block.text}
          onChange={(text) => onChange({ text } as Partial<ContentBlock>)}
          className={textSize}
          placeholder="Parágrafo"
        />
      )}

      {block.type === "heading" && (
        <EditableText
          value={block.text}
          onChange={(text) => onChange({ text } as Partial<ContentBlock>)}
          className={cn(
            block.level === 2 && "text-[2.2cqw] font-semibold",
            block.level === 3 && "text-[1.9cqw] font-medium",
            block.level === 4 && "text-[1.7cqw] font-medium",
          )}
          placeholder="Título"
        />
      )}

      {(block.type === "bullet_list" || block.type === "ordered_list") && (
        <EditableList
          items={block.items}
          ordered={block.type === "ordered_list"}
          onChange={(items) => onChange({ items } as Partial<ContentBlock>)}
          itemClassName={textSize}
        />
      )}

      {block.type === "math" && (
        <div className="font-mono rounded bg-muted/30 px-2 py-1">
          <EditableText
            value={block.tex}
            onChange={(tex) => onChange({ tex } as Partial<ContentBlock>)}
            className={cn(textSize, "font-mono")}
            placeholder="\frac{1}{2}"
          />
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Layout-specific editor components.
 * -------------------------------------------------------------------------- */

type EditorProps = {
  slide: SlideBlock;
  onChange: (patch: Partial<SlideBlock>) => void;
};

function useContentCallbacks(slide: SlideBlock, onChange: (p: Partial<SlideBlock>) => void) {
  const updateBlock = (blockId: string, patch: Partial<ContentBlock>) => {
    onChange({
      content: (slide.content ?? []).map((b) =>
        b.id === blockId ? ({ ...b, ...patch } as ContentBlock) : b,
      ),
    });
  };
  const removeBlock = (blockId: string) => {
    onChange({ content: (slide.content ?? []).filter((b) => b.id !== blockId) });
  };
  return { updateBlock, removeBlock };
}

function TitleEditor({ slide, onChange }: EditorProps) {
  return (
    <SlideFrame className="flex flex-col items-center justify-center text-center gap-4">
      <EditableText
        value={slide.title}
        onChange={(title) => onChange({ title })}
        className="text-[4cqw] font-bold leading-tight text-foreground w-full text-center"
        placeholder="Título"
      />
      <EditableText
        value={slide.subtitle ?? ""}
        onChange={(v) => onChange({ subtitle: v || undefined })}
        className="text-[2.2cqw] text-muted-foreground w-full text-center"
        placeholder="Subtítulo (opcional)"
      />
    </SlideFrame>
  );
}

function TitleContentEditor({ slide, onChange }: EditorProps) {
  const { updateBlock, removeBlock } = useContentCallbacks(slide, onChange);
  return (
    <SlideFrame className="flex flex-col gap-[3%]">
      <EditableText
        value={slide.title}
        onChange={(title) => onChange({ title })}
        className="text-[3cqw] font-semibold text-foreground"
        placeholder="Título"
      />
      <div className="flex flex-1 flex-col gap-3 overflow-hidden text-[1.7cqw]">
        {(slide.content ?? []).map((block) => (
          <EditableBlock
            key={block.id}
            block={block}
            onChange={(patch) => updateBlock(block.id, patch)}
            onRemove={() => removeBlock(block.id)}
          />
        ))}
      </div>
    </SlideFrame>
  );
}

function ImageLeftEditor({ slide, onChange }: EditorProps) {
  const { updateBlock, removeBlock } = useContentCallbacks(slide, onChange);
  return (
    <SlideFrame className="flex flex-col gap-[3%]">
      <EditableText
        value={slide.title}
        onChange={(title) => onChange({ title })}
        className="text-[3cqw] font-semibold text-foreground"
        placeholder="Título"
      />
      <div className="grid flex-1 grid-cols-[42%_minmax(0,1fr)] gap-[3%] overflow-hidden">
        <div className="overflow-hidden">
          <ImagePlaceholderZone
            prompt={slide.image?.type === "visual_placeholder" ? slide.image.prompt : ""}
            onChange={(prompt) =>
              onChange({
                image: slide.image?.type === "visual_placeholder"
                  ? { ...slide.image, prompt }
                  : slide.image,
              })
            }
            className="h-full"
          />
        </div>
        <div className="flex flex-col gap-3 overflow-hidden text-[1.6cqw]">
          {(slide.content ?? []).map((block) => (
            <EditableBlock
              key={block.id}
              block={block}
              textSize="text-[1.6cqw]"
              onChange={(patch) => updateBlock(block.id, patch)}
              onRemove={() => removeBlock(block.id)}
            />
          ))}
        </div>
      </div>
    </SlideFrame>
  );
}

function ImageRightEditor({ slide, onChange }: EditorProps) {
  const { updateBlock, removeBlock } = useContentCallbacks(slide, onChange);
  return (
    <SlideFrame className="flex flex-col gap-[3%]">
      <EditableText
        value={slide.title}
        onChange={(title) => onChange({ title })}
        className="text-[3cqw] font-semibold text-foreground"
        placeholder="Título"
      />
      <div className="grid flex-1 grid-cols-[minmax(0,1fr)_42%] gap-[3%] overflow-hidden">
        <div className="flex flex-col gap-3 overflow-hidden text-[1.6cqw]">
          {(slide.content ?? []).map((block) => (
            <EditableBlock
              key={block.id}
              block={block}
              textSize="text-[1.6cqw]"
              onChange={(patch) => updateBlock(block.id, patch)}
              onRemove={() => removeBlock(block.id)}
            />
          ))}
        </div>
        <div className="overflow-hidden">
          <ImagePlaceholderZone
            prompt={slide.image?.type === "visual_placeholder" ? slide.image.prompt : ""}
            onChange={(prompt) =>
              onChange({
                image: slide.image?.type === "visual_placeholder"
                  ? { ...slide.image, prompt }
                  : slide.image,
              })
            }
            className="h-full"
          />
        </div>
      </div>
    </SlideFrame>
  );
}

function TwoColumnEditor({ slide, onChange }: EditorProps) {
  const { updateBlock, removeBlock } = useContentCallbacks(slide, onChange);
  const content = slide.content ?? [];
  const mid = Math.ceil(content.length / 2);
  const left = content.slice(0, mid);
  const right = content.slice(mid);
  return (
    <SlideFrame className="flex flex-col gap-[3%]">
      <EditableText
        value={slide.title}
        onChange={(title) => onChange({ title })}
        className="text-[3cqw] font-semibold text-foreground"
        placeholder="Título"
      />
      <div className="grid flex-1 grid-cols-2 gap-[4%] overflow-hidden text-[1.5cqw]">
        <div className="flex flex-col gap-3 overflow-hidden">
          {left.map((block) => (
            <EditableBlock
              key={block.id}
              block={block}
              textSize="text-[1.5cqw]"
              onChange={(patch) => updateBlock(block.id, patch)}
              onRemove={() => removeBlock(block.id)}
            />
          ))}
        </div>
        <div className="flex flex-col gap-3 overflow-hidden">
          {right.map((block) => (
            <EditableBlock
              key={block.id}
              block={block}
              textSize="text-[1.5cqw]"
              onChange={(patch) => updateBlock(block.id, patch)}
              onRemove={() => removeBlock(block.id)}
            />
          ))}
        </div>
      </div>
    </SlideFrame>
  );
}

function FullImageEditor({ slide, onChange }: EditorProps) {
  return (
    <SlideFrame pad={false}>
      <div className="relative h-full w-full">
        {/* Image zone covers the whole slide */}
        <div className="absolute inset-0">
          <ImagePlaceholderZone
            prompt={slide.image?.type === "visual_placeholder" ? slide.image.prompt : ""}
            onChange={(prompt) =>
              onChange({
                image: slide.image?.type === "visual_placeholder"
                  ? { ...slide.image, prompt }
                  : slide.image,
              })
            }
            className="h-full rounded-none border-0"
          />
        </div>
        {/* Overlay title at the bottom */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-[4%] text-white">
          <EditableText
            value={slide.title}
            onChange={(title) => onChange({ title })}
            className="text-[3.5cqw] font-bold"
            placeholder="Título"
          />
          <EditableText
            value={slide.subtitle ?? ""}
            onChange={(v) => onChange({ subtitle: v || undefined })}
            className="mt-2 text-[2cqw] opacity-90"
            placeholder="Subtítulo (opcional)"
          />
        </div>
      </div>
    </SlideFrame>
  );
}

function ConclusionEditor({ slide, onChange }: EditorProps) {
  const { updateBlock, removeBlock } = useContentCallbacks(slide, onChange);
  return (
    <SlideFrame className="flex flex-col gap-[3%] bg-accent/30">
      <span className="text-[1.4cqw] uppercase tracking-widest text-primary select-none">
        Conclusão
      </span>
      <EditableText
        value={slide.title}
        onChange={(title) => onChange({ title })}
        className="text-[3.5cqw] font-bold text-foreground"
        placeholder="Título da conclusão"
      />
      <div className="flex flex-1 flex-col gap-3 overflow-hidden text-[1.7cqw]">
        {(slide.content ?? []).map((block) => (
          <EditableBlock
            key={block.id}
            block={block}
            onChange={(patch) => updateBlock(block.id, patch)}
            onRemove={() => removeBlock(block.id)}
          />
        ))}
      </div>
    </SlideFrame>
  );
}

/* --------------------------------------------------------------------------
 * Main export — dispatches to the right layout editor.
 * -------------------------------------------------------------------------- */

const LAYOUT_EDITORS: Record<string, (props: EditorProps) => React.ReactElement> = {
  title: TitleEditor,
  "title-content": TitleContentEditor,
  "image-left": ImageLeftEditor,
  "image-right": ImageRightEditor,
  "two-column": TwoColumnEditor,
  "full-image": FullImageEditor,
  conclusion: ConclusionEditor,
};

export function SlideEditorView({ slide, onChange }: EditorProps) {
  const Editor = LAYOUT_EDITORS[slide.layout] ?? TitleContentEditor;
  return (
    // container-type: inline-size enables cqw units inside
    <div className="@container w-full" style={{ containerType: "inline-size" }}>
      <Editor slide={slide} onChange={onChange} />
    </div>
  );
}
