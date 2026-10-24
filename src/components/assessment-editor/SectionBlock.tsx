"use client";

import { InlineText } from "@/components/blocks/inline-text";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/shared/utils/utils";
import type { AssessmentItem, AssessmentSection, ExerciseType } from "@/types/assessment";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BookOpen, Copy, GripVertical, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { PHONE_TOUCH, useAssessmentEditor } from "./context";
import { ExerciseEditor, ReadingEditor } from "./ExerciseEditor";
import { ExerciseView, ReadingView } from "./ExerciseView";
import { EXERCISE_TYPES, MAX_ITEMS, MAX_TEXT } from "./model";

export interface SectionActions {
  updateSection: (patch: Partial<AssessmentSection>) => void;
  deleteSection: () => void;
  updateItem: (item: AssessmentItem) => void;
  duplicateItem: (itemId: string) => void;
  deleteItem: (itemId: string) => void;
  addExercise: (type: ExerciseType) => void;
  addReading: () => void;
}

interface SectionBlockProps {
  section: AssessmentSection;
  subtotal: number | null;
  numbers: Map<string, number>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  canDelete: boolean;
  actions: SectionActions;
}

/** One Grupo: heading with subtotal, instructions, and its sortable items. */
export function SectionBlock({ section, subtotal, numbers, selectedId, onSelect, canDelete, actions }: SectionBlockProps) {
  const t = useTranslations("assessmentEditor");
  const { studentView } = useAssessmentEditor();
  const { setNodeRef } = useDroppable({ id: `section:${section.id}` });
  const [editingHeading, setEditingHeading] = useState(false);
  const full = section.items.length >= MAX_ITEMS;

  return (
    <section className="mt-6 first:mt-5">
      <div className="group/heading flex items-end justify-between gap-3 border-b-2 border-neutral-800 pb-0.5 font-sans max-md:items-center">
        {editingHeading && !studentView ? (
          <Input
            autoFocus
            value={section.title}
            maxLength={MAX_TEXT}
            placeholder={t("section.titlePlaceholder")}
            onChange={(e) => actions.updateSection({ title: e.target.value })}
            onBlur={() => setEditingHeading(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditingHeading(false)}
            className="mb-1 h-8 max-w-xs text-sm font-bold"
          />
        ) : (
          <button
            type="button"
            disabled={studentView}
            onClick={() => setEditingHeading(true)}
            className="min-w-0 truncate text-left text-[13px] font-bold enabled:hover:text-primary max-md:whitespace-normal"
          >
            {section.title || t("section.titlePlaceholder")}
          </button>
        )}
        <div className="flex shrink-0 items-center gap-1">
          {!studentView && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 transition-opacity focus-visible:opacity-100 group-hover/heading:opacity-100 data-[state=open]:opacity-100 max-md:opacity-100" aria-label={t("section.menu")}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={PHONE_TOUCH}>
                <DropdownMenuItem onClick={() => setEditingHeading(true)} className="gap-2">
                  <Pencil className="h-4 w-4" />
                  {t("section.titlePlaceholder")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={actions.addReading} disabled={full} className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  {t("section.addReading")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={actions.deleteSection} disabled={!canDelete} className="gap-2 text-destructive focus:text-destructive">
                  <Trash2 className="h-4 w-4" />
                  {t("section.deleteGroup")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {subtotal !== null && <span className="text-[13px] font-bold">{t("section.subtotal", { points: subtotal })}</span>}
        </div>
      </div>

      {studentView ? (
        section.instructions && <p className="mt-1.5 text-[13px] italic text-neutral-600"><InlineText value={section.instructions} /></p>
      ) : (
        // A textarea sized to its text, so long instructions wrap instead of being clipped on phones. One paragraph:
        // print collapses line breaks, so Enter adds none (and pasted ones become spaces).
        <textarea
          rows={1}
          ref={growWithoutFieldSizing}
          value={section.instructions ?? ""}
          maxLength={MAX_TEXT}
          placeholder={t("section.instructionsPlaceholder")}
          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
          onInput={(e) => growWithoutFieldSizing(e.currentTarget)}
          onChange={(e) => actions.updateSection({ instructions: e.target.value.replace(/\s*\n\s*/g, " ") || null })}
          className="mt-1.5 block w-full resize-none rounded bg-transparent px-1 -mx-1 text-[13px] italic text-neutral-600 outline-none [field-sizing:content] placeholder:text-neutral-300 hover:bg-neutral-50 focus:bg-neutral-50 focus:ring-1 focus:ring-primary/30"
        />
      )}

      <SortableContext items={section.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="mt-2 flex min-h-8 flex-col gap-1">
          {section.items.map((item) => (
            <SortableItem
              key={item.id}
              item={item}
              number={numbers.get(item.id) ?? 0}
              selected={selectedId === item.id}
              onSelect={onSelect}
              onlyItem={section.items.length === 1}
              actions={actions}
            />
          ))}
        </div>
      </SortableContext>

      {!studentView && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" disabled={full} title={full ? t("section.full", { max: MAX_ITEMS }) : undefined} className="mt-1 h-7 gap-1 px-2 font-sans text-xs text-neutral-500 hover:bg-neutral-100 hover:text-primary dark:hover:bg-neutral-100">
              <Plus className="h-3.5 w-3.5" />
              {full ? t("section.full", { max: MAX_ITEMS }) : t("section.addExercise")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className={cn("w-56", PHONE_TOUCH)}>
            {EXERCISE_TYPES.map((type) => (
              <DropdownMenuItem key={type} onClick={() => actions.addExercise(type)}>{t(`types.${type}`)}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </section>
  );
}

function SortableItem({ item, number, selected, onSelect, onlyItem, actions }: {
  item: AssessmentItem;
  number: number;
  selected: boolean;
  onSelect: (id: string | null) => void;
  onlyItem: boolean;
  actions: SectionActions;
}) {
  const t = useTranslations("assessmentEditor");
  const { studentView, phone } = useAssessmentEditor();
  // Phone reorders with up/down buttons in the ExerciseSheet, not drag.
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled: studentView || phone });
  const points = item.kind === "exercise" ? item.points : null;
  const chip = points !== null && (
    <span className={cn("rounded border border-neutral-300 bg-white px-1.5 py-px font-sans text-[11px] font-semibold", !phone && "absolute right-2 top-2")}>
      {t("points", { points })}
    </span>
  );

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      data-item-id={item.id}
      className={cn("relative", isDragging && "opacity-40")}
    >
      <div
        // A4Page breaks its page guides between these, as the files keep an exercise on one page.
        data-page-item
        // Mouse shortcut only; keyboard users reach the same action through the toolbar's "Editar" button.
        onClick={() => !studentView && !selected && onSelect(item.id)}
        className={cn(
          "group/item relative rounded-md px-2 py-2",
          points !== null && !phone && "pr-16",
          !studentView && "cursor-pointer outline-1 outline-transparent transition-colors hover:bg-[#f4f6ff] hover:outline hover:outline-[#c9d2ff]",
          selected && "cursor-default bg-[#f4f6ff] outline outline-[#c9d2ff]",
          isDragging && "bg-[#f4f6ff]",
        )}
      >
        {!studentView && !phone && (
          <div className={cn(
            "absolute -left-9 top-1 z-10 flex flex-col gap-0.5 rounded-md bg-neutral-900 p-0.5 font-sans text-white shadow-sm transition-opacity",
            selected ? "opacity-100" : "pointer-events-none opacity-0 group-hover/item:pointer-events-auto group-hover/item:opacity-100 group-focus-within/item:pointer-events-auto group-focus-within/item:opacity-100",
          )}>
            {!selected && (
              <ToolbarBtn label={t("item.edit")} onClick={() => onSelect(item.id)}><Pencil className="h-3.5 w-3.5" /></ToolbarBtn>
            )}
            <button
              ref={setActivatorNodeRef}
              type="button"
              aria-label={t("item.drag")}
              title={t("item.drag")}
              onClick={(e) => e.stopPropagation()}
              className="flex h-6 w-6 cursor-grab touch-none items-center justify-center rounded hover:bg-white/15 active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
            <ToolbarBtn label={t("item.duplicate")} onClick={() => actions.duplicateItem(item.id)}><Copy className="h-3.5 w-3.5" /></ToolbarBtn>
            <ToolbarBtn label={onlyItem ? t("item.lastItem") : t("item.delete")} onClick={() => actions.deleteItem(item.id)} disabled={onlyItem}>
              <Trash2 className="h-3.5 w-3.5" />
            </ToolbarBtn>
          </div>
        )}

        {item.kind === "exercise" ? <ExerciseView exercise={item} number={number} points={phone && chip ? chip : undefined} /> : <ReadingView item={item} />}

        {!phone && chip}
      </div>

      {selected && !studentView && !phone && (
        <div className="mt-2 mb-3">
          {item.kind === "exercise" ? (
            <ExerciseEditor className="paper-light" exercise={item} number={number} onChange={actions.updateItem} onClose={() => onSelect(null)} />
          ) : (
            <ReadingEditor className="paper-light" item={item} onChange={actions.updateItem} onClose={() => onSelect(null)} />
          )}
        </div>
      )}
    </div>
  );
}

function ToolbarBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="flex h-6 w-6 items-center justify-center rounded hover:bg-white/15 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/** Where `field-sizing: content` is unsupported (older Safari, Firefox), grow the textarea to its text by hand. */
function growWithoutFieldSizing(el: HTMLTextAreaElement | null) {
  if (!el || window.CSS?.supports?.("field-sizing", "content")) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}
