"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { computeTotals } from "@/lib/assessment/totals";
import type { AeOutcome, AssessmentDocument, AssessmentItem, AssessmentSection } from "@/types/assessment";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { cn } from "@/shared/utils/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Loader2, MessageCircle, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { A4Page } from "./A4Page";
import { AssessmentEditorContext, PHONE_TOUCH, type AssessmentEditorContextValue } from "./context";
import { ExerciseSheet } from "./ExerciseSheet";
import { ExerciseView, ReadingView } from "./ExerciseView";
import { HeaderForm } from "./HeaderForm";
import { MAX_ITEMS, allExercises, exerciseNumbers, newExercise, nextId } from "./model";
import { SectionBlock, type SectionActions } from "./SectionBlock";
import { StudentToggle } from "./StudentToggle";
import { TotalsBar } from "./TotalsBar";

const MAX_SECTIONS = 10;
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export interface AssessmentWorkspaceProps {
  /** Null while the document is still being generated. */
  doc: AssessmentDocument | null;
  onChange: (doc: AssessmentDocument) => void;
  /** Locks editing (e.g. while the assistant revises the stored document). */
  readOnly?: boolean;
  /** Toolbar left: title and save status. */
  title: ReactNode;
  /** Toolbar right, after the student toggle: versions, share, export. */
  actions: ReactNode;
  chat: ReactNode;
  /** Opens the chat sheet; shown as "Conversa" in the bottom bar where the chat column is hidden (below lg). */
  onOpenChat?: () => void;
  /** Non-blocking notice under the toolbar (e.g. a failed save). */
  banner?: ReactNode;
  /** Above the first page and scrolling with it: the turma/lesson line. */
  lessonContext?: ReactNode;
  lookupAe: (ids: string[]) => Promise<AeOutcome[]>;
  /** False for an English document (see the context's `showAe`). */
  showAe?: boolean;
  searchAe: ((q: string) => Promise<AeOutcome[]>) | null;
  requestImage: (onPicked: (url: string) => void) => void;
  /** The item open in the editor (desktop form or phone sheet), or null. */
  onEditingChange?: (id: string | null) => void;
  answerChecks?: Record<string, string>;
  onConfirmCheck?: (exerciseId: string) => void;
  /** The document is in English (its printed labels follow it). */
  english?: boolean;
}

const AE_RETRY_MS = 10000;

/** Presentational editor: everything except loading, saving and chat transport. */
export function AssessmentWorkspace({ doc, onChange: onChangeProp, readOnly = false, title, actions, chat, onOpenChat, banner, lessonContext, lookupAe, showAe = true, searchAe, requestImage, onEditingChange, answerChecks, onConfirmCheck, english }: AssessmentWorkspaceProps) {
  const t = useTranslations("assessmentEditor");
  const phone = useIsMobile();
  const [studentView, setStudentView] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [aeLookup, setAeLookup] = useState<Record<string, AeOutcome | null>>({});
  const pendingAe = useRef(new Set<string>());
  const onChange = useCallback((next: AssessmentDocument) => !readOnly && onChangeProp(next), [readOnly, onChangeProp]);
  // "Anular" acts on the document as it is when clicked, not as it was when the toast opened.
  const docRef = useRef(doc);
  docRef.current = doc;
  const offerUndo = (message: string, restore: (current: AssessmentDocument) => AssessmentDocument | null) =>
    toast(message, {
      duration: 10000,
      action: {
        label: t("undo.action"),
        onClick: () => {
          const current = docRef.current;
          const restored = current && restore(current);
          if (restored) onChange(restored);
        },
      },
    });
  useEffect(() => {
    if (readOnly) setSelectedId(null);
  }, [readOnly]);
  useEffect(() => onEditingChange?.(selectedId), [selectedId, onEditingChange]);

  // Resolve labels for every AE id in the document that we have not looked up yet.
  const aeIds = useMemo(() => (doc && showAe ? [...new Set(allExercises(doc).flatMap((e) => e.aeOutcomeIds))] : []), [doc, showAe]);
  // A failed lookup (offline) is not "Objetivo indisponível": the chips keep loading and it is tried again.
  const [aeRetry, setAeRetry] = useState(0);
  useEffect(() => {
    const missing = aeIds.filter((id) => !(id in aeLookup) && !pendingAe.current.has(id));
    if (!missing.length) return;
    missing.forEach((id) => pendingAe.current.add(id));
    let retry: ReturnType<typeof setTimeout> | undefined;
    lookupAe(missing)
      .then((rows) => setAeLookup((prev) => {
        const next = { ...prev };
        for (const id of missing) next[id] = rows.find((r) => r.id === id) ?? null;
        return next;
      }))
      .catch(() => {
        retry = setTimeout(() => setAeRetry((n) => n + 1), AE_RETRY_MS);
      })
      .finally(() => missing.forEach((id) => pendingAe.current.delete(id)));
    return () => clearTimeout(retry);
  }, [aeIds, aeLookup, lookupAe, aeRetry]);

  const rememberAe = useCallback((o: AeOutcome) => setAeLookup((prev) => ({ ...prev, [o.id]: o })), []);
  const ctx = useMemo<AssessmentEditorContextValue>(
    () => ({ studentView, phone, aeLookup, showAe, searchAe, rememberAe, requestImage, answerChecks, confirmCheck: onConfirmCheck, english }),
    [studentView, phone, aeLookup, showAe, searchAe, rememberAe, requestImage, answerChecks, onConfirmCheck, english],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const toggleStudent = (on: boolean) => {
    setStudentView(on);
    if (on) setSelectedId(null);
  };

  return (
    <AssessmentEditorContext.Provider value={ctx}>
      <div className={cn("flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-muted/40", PHONE_TOUCH)}>
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-border bg-background px-4 py-2 max-md:gap-1.5 max-md:px-3">
          <div className="flex min-w-0 flex-1 items-center gap-3 max-md:basis-full">{title}</div>
          <StudentToggle pressed={studentView} onChange={toggleStudent} />
          {actions}
        </div>
        {banner}

        <div className="flex min-h-0 flex-1">
          <div className="relative min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 max-md:px-0 max-md:py-3" onClick={() => setSelectedId(null)} aria-busy={readOnly || undefined}>
            {readOnly && doc && (
              <div className="sticky top-0 z-20 mx-auto mb-3 flex w-fit items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                {t("chatLocked")}
              </div>
            )}
            {lessonContext}
            <div className={cn(readOnly && "pointer-events-none select-none opacity-60 transition-opacity")} inert={readOnly || undefined}>
              {doc ? renderPages(doc) : <GeneratingPages />}
            </div>
          </div>
          <aside className="hidden w-80 flex-shrink-0 flex-col overflow-hidden border-l border-border bg-background lg:flex">{chat}</aside>
        </div>

        {doc && (
          <div className="flex-shrink-0 border-t border-border bg-background px-4 py-2 max-md:px-3 max-md:py-1.5">
            <TotalsBar
              doc={doc}
              trailing={onOpenChat && (
                <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 gap-1.5 lg:hidden" onClick={onOpenChat}>
                  <MessageCircle className="h-4 w-4" />
                  {t("chatButton")}
                </Button>
              )}
            />
          </div>
        )}
      </div>
    </AssessmentEditorContext.Provider>
  );

  // A render function, not a component: a nested component would remount (and drop input focus) on every keystroke.
  function renderPages(doc: AssessmentDocument) {
    const onSelect = setSelectedId;
    const totals = computeTotals(doc);
    const dragItem = dragId ? doc.sections.flatMap((x) => x.items).find((i) => i.id === dragId) : undefined;
    const numbers = exerciseNumbers(doc);
    const setSections = (sections: AssessmentSection[]) => onChange({ ...doc, sections });
    const mapSection = (sid: string, fn: (s: AssessmentSection) => AssessmentSection) =>
      setSections(doc.sections.map((s) => (s.id === sid ? fn(s) : s)));

    const actionsFor = (s: AssessmentSection): SectionActions => ({
      updateSection: (patch) => mapSection(s.id, (x) => ({ ...x, ...patch })),
      deleteSection: () => {
        const at = doc.sections.findIndex((x) => x.id === s.id);
        setSections(doc.sections.filter((x) => x.id !== s.id));
        offerUndo(t("undo.groupDeleted", { count: s.items.length }), (current) =>
          current.sections.some((x) => x.id === s.id) ? null
            : { ...current, sections: [...current.sections.slice(0, at), s, ...current.sections.slice(at)] });
      },
      updateItem: (item) => mapSection(s.id, (x) => ({ ...x, items: x.items.map((i) => (i.id === item.id ? item : i)) })),
      duplicateItem: (itemId) => {
        if (s.items.length >= MAX_ITEMS) return;
        const idx = s.items.findIndex((i) => i.id === itemId);
        const copy: AssessmentItem = { ...structuredClone(s.items[idx]), id: nextId(doc, s.items[idx].kind === "exercise" ? "e" : "r") };
        mapSection(s.id, (x) => ({ ...x, items: [...x.items.slice(0, idx + 1), copy, ...x.items.slice(idx + 1)] }));
        onSelect(copy.id);
      },
      deleteItem: (itemId) => {
        if (s.items.length <= 1) return;
        const at = s.items.findIndex((i) => i.id === itemId);
        const removed = s.items[at];
        mapSection(s.id, (x) => ({ ...x, items: x.items.filter((i) => i.id !== itemId) }));
        if (selectedId === itemId) onSelect(null);
        offerUndo(t(removed.kind === "exercise" ? "undo.exerciseDeleted" : "undo.readingDeleted"), (current) => {
          const section = current.sections.find((x) => x.id === s.id);
          if (!section || section.items.length >= MAX_ITEMS || section.items.some((i) => i.id === itemId)) return null;
          const items = [...section.items.slice(0, at), removed, ...section.items.slice(at)];
          return { ...current, sections: current.sections.map((x) => (x.id === s.id ? { ...x, items } : x)) };
        });
      },
      addExercise: (type) => {
        if (s.items.length >= MAX_ITEMS) return;
        const ex = newExercise(doc, type);
        mapSection(s.id, (x) => ({ ...x, items: [...x.items, ex] }));
        onSelect(ex.id);
      },
      addReading: () => {
        if (s.items.length >= MAX_ITEMS) return;
        const id = nextId(doc, "r");
        mapSection(s.id, (x) => ({ ...x, items: [{ id, kind: "reading", title: null, body: "", media: null }, ...x.items] }));
        onSelect(id);
      },
    });

    const moveItem = (id: string, dir: -1 | 1) => {
      const si = doc.sections.findIndex((x) => x.items.some((i) => i.id === id));
      const from = doc.sections[si];
      const ii = from.items.findIndex((i) => i.id === id);
      const j = ii + dir;
      if (j >= 0 && j < from.items.length) return mapSection(from.id, (x) => ({ ...x, items: arrayMove(x.items, ii, j) }));
      // Past the Grupo's edge: into the neighbouring Grupo, unless that would empty this one.
      const to = doc.sections[si + dir];
      if (!to || from.items.length <= 1 || to.items.length >= MAX_ITEMS) return;
      const moved = from.items[ii];
      setSections(doc.sections.map((x) => {
        if (x.id === from.id) return { ...x, items: x.items.filter((i) => i.id !== id) };
        if (x.id === to.id) return { ...x, items: dir < 0 ? [...x.items, moved] : [moved, ...x.items] };
        return x;
      }));
    };

    const renderSheet = () => {
      const si = doc.sections.findIndex((x) => x.items.some((i) => i.id === selectedId));
      if (!phone || studentView || si < 0) return null;
      const s = doc.sections[si];
      const ii = s.items.findIndex((i) => i.id === selectedId);
      const item = s.items[ii];
      const acts = actionsFor(s);
      const movable = s.items.length > 1;
      return (
        <ExerciseSheet
          doc={doc}
          item={item}
          number={numbers.get(item.id) ?? 0}
          onChange={acts.updateItem}
          onClose={() => onSelect(null)}
          onMove={(dir) => moveItem(item.id, dir)}
          canMoveUp={ii > 0 || (si > 0 && movable)}
          canMoveDown={ii < s.items.length - 1 || (si < doc.sections.length - 1 && movable)}
          onDuplicate={() => acts.duplicateItem(item.id)}
          onDelete={() => acts.deleteItem(item.id)}
          canDelete={movable}
        />
      );
    };

    const addSection = () => {
      const ex = newExercise(doc, "multiple_choice");
      const n = doc.sections.length;
      setSections([...doc.sections, { id: nextId(doc, "g"), title: t("section.newTitle", { roman: ROMAN[n] ?? String(n + 1) }), instructions: null, items: [ex] }]);
      onSelect(ex.id);
    };

    const onDragEnd = ({ active, over }: DragEndEvent) => {
      setDragId(null);
      if (!over || active.id === over.id) return;
      const sectionOf = (id: string) =>
        id.startsWith("section:") ? doc.sections.find((s) => `section:${s.id}` === id) : doc.sections.find((s) => s.items.some((i) => i.id === id));
      const from = sectionOf(String(active.id));
      const to = sectionOf(String(over.id));
      if (!from || !to) return;
      const fromIdx = from.items.findIndex((i) => i.id === active.id);
      if (from.id === to.id) {
        const toIdx = to.items.findIndex((i) => i.id === over.id);
        if (toIdx >= 0) mapSection(from.id, (x) => ({ ...x, items: arrayMove(x.items, fromIdx, toIdx) }));
        return;
      }
      if (from.items.length <= 1 || to.items.length >= MAX_ITEMS) return; // a Grupo can't be left empty, nor take a 31st item
      const moved = from.items[fromIdx];
      const overIdx = to.items.findIndex((i) => i.id === over.id);
      const toIdx = overIdx < 0 ? to.items.length : overIdx;
      setSections(doc.sections.map((s) => {
        if (s.id === from.id) return { ...s, items: s.items.filter((i) => i.id !== moved.id) };
        if (s.id === to.id) return { ...s, items: [...s.items.slice(0, toIdx), moved, ...s.items.slice(toIdx)] };
        return s;
      }));
    };

    return (
      <>
        <A4Page>
          <div onClick={(e) => e.stopPropagation()}>
            <HeaderForm header={doc.header} onChange={(header) => onChange({ ...doc, header })} />
          </div>
          <DndContext
            id="assessment-dnd"
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={({ active }) => setDragId(String(active.id))}
            onDragCancel={() => setDragId(null)}
            onDragEnd={onDragEnd}
          >
            {doc.sections.map((s) => (
              <div key={s.id} onClick={(e) => e.stopPropagation()}>
                <SectionBlock
                  section={s}
                  subtotal={totals.target === null ? null : totals.sections.find((x) => x.id === s.id)?.points ?? 0}
                  numbers={numbers}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  canDelete={doc.sections.length > 1}
                  actions={actionsFor(s)}
                />
              </div>
            ))}
            {/* Follows the pointer across Grupos, where the sortable item itself can't move. */}
            <DragOverlay>
              {dragItem && (
                <div className="rounded-md bg-white px-2 py-2 font-serif text-[14px] text-neutral-900 shadow-xl ring-1 ring-[#c9d2ff]">
                  {dragItem.kind === "exercise" ? <ExerciseView exercise={dragItem} number={numbers.get(dragItem.id) ?? 0} /> : <ReadingView item={dragItem} />}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </A4Page>
        {renderSheet()}
        {!studentView && doc.sections.length < MAX_SECTIONS && (
          <div className="mx-auto mt-4 flex max-w-[794px] justify-center">
            <Button variant="outline" size="sm" className="gap-1.5 bg-background" onClick={(e) => { e.stopPropagation(); addSection(); }}>
              <Plus className="h-3.5 w-3.5" />
              {t("section.addGroup")}
            </Button>
          </div>
        )}
      </>
    );
  }
}

function GeneratingPages() {
  const t = useTranslations("assessmentEditor");
  return (
    <div className="mx-auto flex max-w-[794px] flex-col gap-6" aria-busy>
      <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
        <div>
          <p className="font-medium text-foreground">{t("generatingTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("generatingSubtitle")}</p>
        </div>
      </div>
      {[0, 1].map((page) => (
        <div key={page} className="rounded-md border border-neutral-200 bg-white px-6 pb-14 pt-8 md:px-12 shadow-[0_2px_10px_rgba(0,0,0,0.06)]" style={{ aspectRatio: "210 / 297" }}>
          {page === 0 && <Skeleton className="mb-6 h-20 w-full rounded bg-neutral-200" />}
          {[0, 1].map((group) => (
            <div key={group} className="mb-8">
              <div className="mb-4 flex justify-between border-b-2 border-neutral-200 pb-1">
                <Skeleton className="h-4 w-20 bg-neutral-200" />
                <Skeleton className="h-4 w-12 bg-neutral-200" />
              </div>
              {[0, 1, 2].map((row) => (
                <div key={row} className="mb-5 flex gap-3">
                  <Skeleton className="h-4 w-4 shrink-0 bg-neutral-200" />
                  <div className="flex flex-1 flex-col gap-2" style={{ animationDelay: `${row * 150}ms` }}>
                    <Skeleton className="h-4 w-11/12 bg-neutral-200" />
                    <Skeleton className="h-4 w-2/3 bg-neutral-200" />
                    {row !== 1 && <Skeleton className="h-3 w-1/3 bg-neutral-100" />}
                  </div>
                  <Skeleton className="h-5 w-12 shrink-0 bg-neutral-200" />
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
