"use client";

import { InlineText } from "@/components/blocks/inline-text";
import { MathTextInput, type MathTextInputHandle } from "@/components/math/MathTextInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/shared/utils/utils";
import type { AssessmentExercise, AssessmentOption, AssessmentReadingBox, ExerciseType } from "@/types/assessment";
import { AlertTriangle, ArrowDown, ArrowUp, Check, ImageIcon, MapPin, Plus, Sigma, SquareDashed, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, type ReactNode } from "react";
import { AeChip } from "./AeChip";
import { AePicker } from "./AePicker";
import { PHONE_TOUCH, useAssessmentEditor } from "./context";
import { LabelImage } from "./ExerciseView";
import {
  EXERCISE_TYPES, MAX_CATEGORIES, MAX_LEVEL, MAX_MODEL_ANSWER, MAX_READING, MAX_SHORT, MAX_TEXT, MAX_WORDS, MAX_WORD_LETTERS, TABLE_MAX_COLS, TABLE_MAX_ROWS, addCategory, addLabel, addOption, addTableColumn,
  addTableRow, cellAnswer, changeType, classifyItem, gapText, isBlankCell, optionLetter, removeCategory, removeLabel, removeOption,
  removeTableColumn, removeTableRow, setTableCell, setTableHeader, skippedWordIndexes, syncAnswer, toggleBlank, withEmptyCategories,
  withEmptyTable, withImage,
} from "./model";

const NONE = "__none";

const halfPoints = (points: number) => Math.round(points * 2) / 2;

function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

function IconBtn({ label, onClick, children, disabled }: { label: string; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground" aria-label={label} title={label} onClick={onClick} disabled={disabled}>
      {children}
    </Button>
  );
}

function AddBtn({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <Button type="button" variant="ghost" size="sm" className="h-8 w-fit gap-1 px-2 text-primary" onClick={onClick} disabled={disabled}>
      <Plus className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}

type MathFieldOpts = {
  multiline?: boolean;
  maxLength?: number;
  placeholder?: string;
  autoFocus?: boolean;
  label?: string;
  /** Layout classes for the field's slot (flex sizing). */
  wrap?: string;
  className?: string;
};

/** Inline panel that edits every field of one exercise. Layout-agnostic: the parent decides where it sits. */
export function ExerciseEditor({ exercise: ex, number, onChange, onClose, toolbar, className, autoFocus = true }: {
  exercise: AssessmentExercise;
  number: number;
  onChange: (next: AssessmentExercise) => void;
  onClose: () => void;
  /** Extra row under the title (the phone sheet's move/duplicate/delete). */
  toolbar?: ReactNode;
  className?: string;
  autoFocus?: boolean;
}) {
  const t = useTranslations("assessmentEditor");
  const { aeLookup, showAe, searchAe, rememberAe, requestImage } = useAssessmentEditor();
  const options = ex.options ?? [];
  // label_image: the target the next click on the picture places.
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const set = (patch: Partial<AssessmentExercise>) => onChange(syncAnswer({ ...ex, ...patch }));

  // "Fórmula" goes into the text field used last (the statement until another is used). Every field shows its
  // maths as maths and edits it in place, so the teacher never reads LaTeX.
  const fields = useRef(new Map<string, MathTextInputHandle>());
  const lastField = useRef("prompt");
  const mathField = (key: string, value: string, onValue: (v: string) => void, opts: MathFieldOpts = {}) => (
    <div className={cn("min-w-0", opts.wrap)} onFocus={() => (lastField.current = key)}>
      <MathTextInput
        ref={(h) => {
          if (h) fields.current.set(key, h);
          else fields.current.delete(key);
        }}
        value={value}
        onChange={onValue}
        multiline={opts.multiline}
        maxLength={opts.maxLength}
        placeholder={opts.placeholder}
        autoFocus={opts.autoFocus}
        allowBlank={ex.type === "fill_gaps"}
        aria-label={opts.label}
        className={cn(!opts.multiline && "min-h-8 py-0.5 md:text-sm", opts.className)}
      />
    </div>
  );
  const insertFormula = () => (fields.current.get(lastField.current) ?? fields.current.get("prompt"))?.insertFormula();
  const setOption = (id: string, text: string) => set({ options: options.map((o) => (o.id === id ? { ...o, text } : o)) });
  const atMax = options.length >= 20;
  // MC needs 2 options; the word bank is optional; matching keeps one item per column (checked per row).
  const minOptions = ex.type === "multiple_choice" || ex.type === "classify" ? 2 : ex.type === "fill_gaps" ? 0 : 1;

  // `wrap`: on phones the extra controls drop under the text field instead of squeezing it.
  const optionRow = (o: AssessmentOption, i: number, prefix: ReactNode, placeholder?: string, extra?: ReactNode, wrap = false) => (
    <div key={o.id} className={cn("flex items-center gap-2", wrap && "max-md:flex-wrap")}>
      {prefix}
      {mathField(`option-${o.id}`, o.text, (v) => setOption(o.id, v), { maxLength: MAX_TEXT, placeholder: placeholder ?? `${optionLetter(i)}`, wrap: cn("flex-1", wrap && "max-md:basis-[calc(100%-1.75rem)]") })}
      {extra}
      <IconBtn label={t("editor.removeOption")} onClick={() => onChange(removeOption(ex, o.id))} disabled={ex.type === "matching" ? options.filter((x) => x.side === o.side).length <= 1 : options.length <= minOptions}>
        <X className="h-4 w-4" />
      </IconBtn>
    </div>
  );

  /** Model answer + criteria: open types, and tables / classify stored before they had a structure. */
  const openFields = () => {
    const criteria = ex.criteria ?? [];
    const setCriterion = (i: number, patch: Partial<(typeof criteria)[number]>) =>
      set({ criteria: criteria.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
    return (
      <>
        <Field label={t("editor.modelAnswer")}>
          {mathField("answer", ex.answer.text ?? "", (v) => set({ answer: { ...ex.answer, text: v } }), { multiline: true, maxLength: MAX_MODEL_ANSWER })}
        </Field>
        <Field label={t("editor.criteria")}>
          {criteria.map((c, i) => (
            <div key={i} className="flex items-center gap-2 max-md:flex-wrap">
              <Input value={c.level} maxLength={MAX_LEVEL} onChange={(e) => setCriterion(i, { level: e.target.value })} placeholder={t("editor.criterionLevel")} className="h-8 w-32 shrink-0 max-md:w-auto max-md:min-w-0 max-md:flex-1 max-md:shrink" />
              {mathField(`criterion-${i}`, c.descriptor, (v) => setCriterion(i, { descriptor: v }), { maxLength: MAX_TEXT, placeholder: t("editor.criterionDescriptor"), wrap: "flex-1 max-md:order-last max-md:basis-full" })}
              <Input type="number" min={0} step={0.5} value={c.points} onChange={(e) => setCriterion(i, { points: Math.min(1000, Math.max(0, Number(e.target.value) || 0)) })} onBlur={() => c.points !== halfPoints(c.points) && setCriterion(i, { points: halfPoints(c.points) })} aria-label={t("editor.criterionPoints")} className="h-8 w-20 shrink-0" />
              <IconBtn label={t("editor.removeOption")} onClick={() => set({ criteria: criteria.filter((_, j) => j !== i).length ? criteria.filter((_, j) => j !== i) : null })}>
                <X className="h-4 w-4" />
              </IconBtn>
            </div>
          ))}
          <AddBtn label={t("editor.addCriterion")} onClick={() => set({ criteria: [...criteria, { level: "", points: 0, descriptor: "" }] })} disabled={criteria.length >= 8} />
        </Field>
      </>
    );
  };

  const typeFields = () => {
    switch (ex.type) {
      case "multiple_choice": {
        const correct = ex.answer.optionIds ?? [];
        const multi = correct.length > 1;
        const toggle = (id: string) => {
          const next = multi || correct.length === 0 ? (correct.includes(id) ? correct.filter((x) => x !== id) : [...correct, id]) : [id];
          set({ answer: { ...ex.answer, optionIds: next.length ? next : correct } });
        };
        return (
          <Field label={t("editor.options")}>
            {options.map((o, i) =>
              optionRow(o, i,
                <button
                  type="button"
                  onClick={() => toggle(o.id)}
                  aria-pressed={correct.includes(o.id)}
                  title={t("editor.markCorrect")}
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-xs font-bold transition-colors",
                    correct.includes(o.id) ? "border-emerald-500 bg-emerald-500 text-white" : "border-input text-muted-foreground hover:border-emerald-400",
                  )}
                >
                  {correct.includes(o.id) ? <Check className="h-4 w-4" /> : optionLetter(i)}
                </button>,
              ),
            )}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <AddBtn label={t("editor.addOption")} onClick={() => onChange(addOption(ex))} disabled={atMax} />
              <label className="flex items-center gap-2 text-xs text-muted-foreground max-md:min-h-11">
                <Switch
                  className="data-[state=unchecked]:bg-muted-foreground/40"
                  checked={multi}
                  onCheckedChange={(on) => {
                    if (on) {
                      const extra = options.find((o) => !correct.includes(o.id));
                      if (extra) set({ answer: { ...ex.answer, optionIds: [...correct, extra.id] } });
                    } else {
                      set({ answer: { ...ex.answer, optionIds: correct.slice(0, 1) } });
                    }
                  }}
                />
                {t("editor.multipleCorrect")}
              </label>
            </div>
          </Field>
        );
      }
      case "true_false":
        return (
          <Field label={t("editor.statements")}>
            {options.map((o, i) => {
              const truth = ex.answer.truth?.find((x) => x.statementId === o.id);
              const setTruth = (patch: { value?: boolean; correction?: string | null }) =>
                set({ answer: { ...ex.answer, truth: (ex.answer.truth ?? []).map((x) => (x.statementId === o.id ? { ...x, ...patch } : x)) } });
              return (
                <div key={o.id} className="flex flex-col gap-1.5">
                  {optionRow(o, i, <span className="w-5 shrink-0 text-center text-xs font-semibold text-muted-foreground">{String.fromCharCode(97 + i)})</span>, undefined,
                    <div className="flex shrink-0 overflow-hidden rounded-md border border-input max-md:ml-7">
                      {[true, false].map((v) => (
                        <button
                          key={String(v)}
                          type="button"
                          aria-pressed={truth?.value === v}
                          onClick={() => setTruth({ value: v, correction: v ? null : truth?.correction ?? null })}
                          className={cn("h-8 w-8 text-xs font-bold", truth?.value === v ? "bg-emerald-500 text-white" : "text-muted-foreground hover:bg-accent")}
                        >
                          {v ? t("editor.trueShort") : t("editor.falseShort")}
                        </button>
                      ))}
                    </div>,
                    true,
                  )}
                  {truth && !truth.value && (
                    mathField(`correction-${o.id}`, truth.correction ?? "", (v) => setTruth({ correction: v || null }), {
                      maxLength: MAX_TEXT,
                      placeholder: t("editor.correctionPlaceholder"),
                      wrap: "ml-7 w-[calc(100%-4.75rem)] max-md:w-[calc(100%-1.75rem)]",
                      className: "md:text-xs",
                    })
                  )}
                </div>
              );
            })}
            <AddBtn label={t("editor.addStatement")} onClick={() => onChange(addOption(ex))} disabled={atMax} />
          </Field>
        );
      case "fill_gaps":
        return (
          <>
            <Field label={t("editor.gaps")}>
              {(ex.answer.gaps ?? []).length === 0 && <p className="text-xs text-muted-foreground">{t("editor.noGaps")}</p>}
              {(ex.answer.gaps ?? []).map((g, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-xs font-semibold text-muted-foreground">{t("editor.gapN", { n: i + 1 })}</span>
                  {mathField(`gap-${i}`, gapText(ex, g), (v) => set({ answer: { ...ex.answer, gaps: (ex.answer.gaps ?? []).map((x, j) => (j === i ? v : x)) } }), { maxLength: MAX_SHORT, wrap: "flex-1" })}
                </div>
              ))}
            </Field>
            <Field label={t("editor.wordBank")}>
              {options.map((o, i) => optionRow(o, i, null, t("editor.words")))}
              <AddBtn label={t("editor.addWord")} onClick={() => onChange(addOption(ex))} disabled={atMax} />
            </Field>
          </>
        );
      case "matching": {
        const left = options.filter((o) => o.side !== "right");
        const right = options.filter((o) => o.side === "right");
        const pairs = ex.answer.pairs ?? [];
        return (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={t("editor.leftColumn")}>
                {left.map((o, i) => optionRow(o, i, <span className="w-4 shrink-0 text-xs font-semibold text-muted-foreground">{i + 1}.</span>, String(i + 1)))}
                <AddBtn label={t("editor.addItem")} onClick={() => onChange(addOption(ex, "left"))} disabled={atMax} />
              </Field>
              <Field label={t("editor.rightColumn")}>
                {right.map((o, i) => optionRow(o, i, <span className="w-4 shrink-0 text-xs font-semibold text-muted-foreground">{optionLetter(i)}.</span>))}
                <AddBtn label={t("editor.addItem")} onClick={() => onChange(addOption(ex, "right"))} disabled={atMax} />
              </Field>
            </div>
            <Field label={t("editor.pairs")}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {left.map((l, i) => {
                  const current = pairs.find(([pl]) => pl === l.id)?.[1] ?? NONE;
                  return (
                    <div key={l.id} className="flex items-center gap-1.5">
                      <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-muted-foreground">{i + 1} –</span>
                      <Select
                        value={current}
                        onValueChange={(v) => set({ answer: { ...ex.answer, pairs: [...pairs.filter(([pl]) => pl !== l.id), ...(v === NONE ? [] : [[l.id, v] as [string, string]])] } })}
                      >
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent className={PHONE_TOUCH}>
                          <SelectItem value={NONE}>{t("editor.pairNone")}</SelectItem>
                          {right.map((r, j) => <SelectItem key={r.id} value={r.id}>{optionLetter(j)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </Field>
          </>
        );
      }
      case "table_completion": {
        if (!ex.table) return <><AddBtn label={t("editor.addTable")} onClick={() => onChange(withEmptyTable(ex))} />{openFields()}</>;
        const table = ex.table;
        const setAnswer = (row: number, col: number, text: string) =>
          set({ answer: { ...ex.answer, cells: (ex.answer.cells ?? []).map((c) => (c.row === row && c.col === col ? { ...c, text } : c)) } });
        return (
          <Field label={t("editor.table")} hint={t("editor.tableHint", { cols: TABLE_MAX_COLS, rows: TABLE_MAX_ROWS })}>
            {/* Only the grid scrolls sideways; the page never does. */}
            <div className="max-w-full overflow-x-auto pb-1" data-table-scroll>
              <table className="border-separate border-spacing-1">
                <thead>
                  <tr>
                    {table.headers.map((h, j) => (
                      <th key={j} className="font-normal">
                        <div className="flex items-center gap-1">
                          {mathField(`header-${j}`, h, (v) => onChange(setTableHeader(ex, j, v)), { maxLength: MAX_SHORT, placeholder: t("editor.headerN", { n: j + 1 }), wrap: "min-w-32 flex-1", className: "bg-muted font-semibold" })}
                          <IconBtn label={t("editor.removeColumn")} onClick={() => onChange(removeTableColumn(ex, j))} disabled={table.headers.length <= 1}>
                            <X className="h-4 w-4" />
                          </IconBtn>
                        </div>
                      </th>
                    ))}
                    <th aria-hidden />
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => {
                        const blank = isBlankCell(cell);
                        return (
                          <td key={j}>
                            <div className="flex items-start gap-1">
                              {mathField(`cell-${i}-${j}`, blank ? cellAnswer(ex, i, j) : cell, (v) => (blank ? setAnswer(i, j, v) : onChange(setTableCell(ex, i, j, v))), {
                                maxLength: MAX_SHORT,
                                placeholder: blank ? t("editor.cellAnswer") : undefined,
                                label: blank ? t("editor.cellAnswer") : undefined,
                                wrap: "min-w-32 flex-1",
                                className: cn(blank && "border-emerald-400 bg-emerald-50 text-emerald-900"),
                              })}
                              <button
                                type="button"
                                onClick={() => onChange(toggleBlank(ex, i, j))}
                                aria-pressed={blank}
                                title={blank ? t("editor.unmarkBlank") : t("editor.markBlank")}
                                aria-label={blank ? t("editor.unmarkBlank") : t("editor.markBlank")}
                                className={cn(
                                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors",
                                  blank ? "border-emerald-500 bg-emerald-500 text-white" : "border-input text-muted-foreground hover:border-emerald-400",
                                )}
                              >
                                <SquareDashed className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        );
                      })}
                      <td>
                        <IconBtn label={t("editor.removeRow")} onClick={() => onChange(removeTableRow(ex, i))} disabled={table.rows.length <= 1}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </IconBtn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-1">
              <AddBtn label={t("editor.addRow")} onClick={() => onChange(addTableRow(ex))} disabled={table.rows.length >= TABLE_MAX_ROWS} />
              <AddBtn label={t("editor.addColumn")} onClick={() => onChange(addTableColumn(ex))} disabled={table.headers.length >= TABLE_MAX_COLS} />
            </div>
          </Field>
        );
      }
      case "classify": {
        if (!ex.categories) return <><AddBtn label={t("editor.addCategories")} onClick={() => onChange(withEmptyCategories(ex))} />{openFields()}</>;
        const cats = ex.categories;
        const boxOf = (id: string) => ex.answer.classes?.find((c) => c.optionId === id)?.categoryId ?? NONE;
        return (
          <>
            <Field label={t("editor.categories")}>
              {cats.map((c, i) => (
                <div key={c.id} className="flex items-center gap-2">
                  {mathField(`category-${c.id}`, c.label, (v) => set({ categories: cats.map((x) => (x.id === c.id ? { ...x, label: v } : x)) }), { maxLength: MAX_SHORT, placeholder: t("editor.categoryN", { n: i + 1 }), wrap: "flex-1" })}
                  <IconBtn label={t("editor.removeOption")} onClick={() => onChange(removeCategory(ex, c.id))} disabled={cats.length <= 2}>
                    <X className="h-4 w-4" />
                  </IconBtn>
                </div>
              ))}
              <AddBtn label={t("editor.addCategory")} onClick={() => onChange(addCategory(ex))} disabled={cats.length >= MAX_CATEGORIES} />
            </Field>
            <Field label={t("editor.classifyItems")}>
              {options.map((o, i) =>
                optionRow(o, i, null, t("editor.itemN", { n: i + 1 }),
                  <Select value={boxOf(o.id)} onValueChange={(v) => onChange(classifyItem(ex, o.id, v === NONE ? null : v))}>
                    <SelectTrigger className="h-8 w-40 shrink-0 max-md:w-auto max-md:flex-1" aria-label={t("editor.itemCategory")}><SelectValue /></SelectTrigger>
                    <SelectContent className={PHONE_TOUCH}>
                      <SelectItem value={NONE}>{t("editor.noCategory")}</SelectItem>
                      {cats.map((c, k) => <SelectItem key={c.id} value={c.id}>{c.label || t("editor.categoryN", { n: k + 1 })}</SelectItem>)}
                    </SelectContent>
                  </Select>,
                  true,
                ),
              )}
              <AddBtn label={t("editor.addItem")} onClick={() => onChange(addOption(ex))} disabled={atMax} />
            </Field>
          </>
        );
      }
      case "ordering": {
        const order = ex.answer.order ?? [];
        const move = (i: number, d: number) => {
          const next = [...order];
          [next[i], next[i + d]] = [next[i + d], next[i]];
          set({ answer: { ...ex.answer, order: next } });
        };
        return (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t("editor.items")}>
              {options.map((o, i) => optionRow(o, i, null, String(i + 1)))}
              <AddBtn label={t("editor.addItem")} onClick={() => onChange(addOption(ex))} disabled={atMax} />
            </Field>
            <Field label={t("editor.correctOrder")}>
              {order.map((id, i) => (
                <div key={id} className="flex h-8 items-center gap-1 rounded-md border border-input px-2 text-sm max-md:h-auto">
                  <span className="w-5 shrink-0 text-xs font-bold text-emerald-700">{i + 1}.</span>
                  <span className="min-w-0 flex-1 truncate"><InlineText value={options.find((o) => o.id === id)?.text ?? ""} /></span>
                  <IconBtn label={t("editor.moveUp")} onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="h-3.5 w-3.5" /></IconBtn>
                  <IconBtn label={t("editor.moveDown")} onClick={() => move(i, 1)} disabled={i === order.length - 1}><ArrowDown className="h-3.5 w-3.5" /></IconBtn>
                </div>
              ))}
            </Field>
          </div>
        );
      }
      case "label_image": {
        const labels = [...(ex.labels ?? [])].sort((a, b) => a.n - b.n);
        const active = labels.find((l) => l.id === activeLabel) ?? labels.find((l) => l.x === null) ?? labels[0];
        const setLabel = (id: string, patch: Partial<(typeof labels)[number]>) =>
          set({ labels: (ex.labels ?? []).map((l) => (l.id === id ? { ...l, ...patch } : l)) });
        const setAnswer = (id: string, text: string) =>
          set({ answer: { ...ex.answer, labels: (ex.answer.labels ?? []).map((a) => (a.labelId === id ? { ...a, text } : a)) } });
        const place = (x: number, y: number) => {
          if (!active) return;
          setLabel(active.id, { x, y });
          // Next unplaced target, so the teacher can tap the parts one after another.
          setActiveLabel(labels.find((l) => l.id !== active.id && l.x === null)?.id ?? active.id);
        };
        return (
          <Field label={t("editor.labels")} hint={ex.media?.imageRef ? t("editor.pinHint") : t("editor.labelsNeedImage")}>
            {ex.media && (
              <LabelImage
                media={ex.media}
                labels={labels}
                teacher
                onPlace={ex.media.imageRef ? place : undefined}
                activeId={active?.id}
                placeLabel={active ? t("editor.placePin", { n: active.n }) : undefined}
              />
            )}
            {labels.map((l) => (
              <div key={l.id} className="flex items-center gap-2 max-md:flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveLabel(l.id)}
                  aria-pressed={active?.id === l.id}
                  title={t("editor.selectPin", { n: l.n })}
                  className={cn(
                    "flex h-8 w-11 shrink-0 items-center justify-center gap-0.5 rounded-md border text-xs font-bold transition-colors",
                    active?.id === l.id ? "border-primary bg-primary text-primary-foreground" : "border-input text-muted-foreground hover:border-primary/60",
                  )}
                >
                  {l.n}
                  {l.x !== null && <MapPin className="h-3 w-3" aria-label={t("editor.pinPlaced")} />}
                </button>
                {mathField(`hint-${l.id}`, l.hint ?? "", (v) => setLabel(l.id, { hint: v || null }), { maxLength: MAX_SHORT, placeholder: t("editor.labelHint"), wrap: "flex-1 max-md:basis-[calc(100%-3.25rem)]" })}
                {mathField(`label-${l.id}`, ex.answer.labels?.find((a) => a.labelId === l.id)?.text ?? "", (v) => setAnswer(l.id, v), { maxLength: MAX_SHORT, placeholder: t("editor.labelAnswer"), wrap: "flex-1 max-md:ml-[3.25rem]" })}
                <IconBtn label={t("editor.removeOption")} onClick={() => onChange(removeLabel(ex, l.id))} disabled={labels.length <= 1}>
                  <X className="h-4 w-4" />
                </IconBtn>
              </div>
            ))}
            <AddBtn label={t("editor.addLabel")} onClick={() => onChange(addLabel(ex))} disabled={labels.length >= 20} />
          </Field>
        );
      }
      case "wordsearch": {
        const words = ex.words ?? [];
        const setWords = (next: string[]) => set({ words: next });
        const skipped = skippedWordIndexes(words);
        return (
          <Field label={t("editor.words")} hint={t("editor.wordsHint", { max: MAX_WORDS, letters: MAX_WORD_LETTERS })}>
            {words.map((w, i) => (
              <div key={i} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Input
                    value={w}
                    maxLength={MAX_WORD_LETTERS}
                    onChange={(e) => setWords(words.map((x, j) => (j === i ? e.target.value : x)))}
                    placeholder={t("editor.wordN", { n: i + 1 })}
                    aria-invalid={skipped.has(i) || undefined}
                    className="h-8 min-w-0 flex-1"
                  />
                  <IconBtn label={t("editor.removeOption")} onClick={() => setWords(words.filter((_, j) => j !== i))} disabled={words.length <= 1}>
                    <X className="h-4 w-4" />
                  </IconBtn>
                </div>
                {skipped.has(i) && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-amber-700">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {t("editor.wordNotInGrid")}
                  </span>
                )}
              </div>
            ))}
            <AddBtn label={t("editor.addWord")} onClick={() => setWords([...words, ""])} disabled={words.length >= MAX_WORDS} />
          </Field>
        );
      }
      default:
        return openFields();
    }
  };

  return (
    <div
      className={cn("flex flex-col gap-4 rounded-xl border border-border bg-card p-4 font-sans text-sm text-card-foreground shadow-lg", className)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        // Escape closes the exercise; one pressed in a menu or dialog (portals, outside this box) is theirs.
        if (e.key === "Escape" && e.currentTarget.contains(e.target as Node)) onClose();
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold">{t("editor.title", { number })}</p>
        <Button type="button" size="sm" onClick={onClose}>{t("editor.close")}</Button>
      </div>
      {toolbar}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
        <Field label={t("editor.type")}>
          <Select value={ex.type} onValueChange={(v) => onChange(changeType(ex, v as ExerciseType))}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent className={PHONE_TOUCH}>
              {EXERCISE_TYPES.map((type) => <SelectItem key={type} value={type}>{t(`types.${type}`)}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t("editor.points")}>
          <Input
            type="number"
            min={0}
            max={1000}
            step={0.5}
            value={ex.points ?? ""}
            placeholder={t("editor.pointsPlaceholder")}
            onChange={(e) => set({ points: e.target.value === "" ? null : Math.min(1000, Math.max(0, Number(e.target.value) || 0)) })}
            // Whole or half points, as the totals and the rescale assume (7,25 became 7,5 only in print).
            onBlur={() => ex.points !== null && ex.points !== halfPoints(ex.points) && set({ points: halfPoints(ex.points) })}
            className="h-9"
          />
        </Field>
      </div>

      <Field label={t("editor.prompt")} hint={ex.type === "fill_gaps" ? t("editor.promptGapsHint") : undefined}>
        {mathField("prompt", ex.prompt, (v) => set({ prompt: v }), { multiline: true, maxLength: MAX_TEXT, autoFocus })}
      </Field>

      <div>
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onMouseDown={(e) => e.preventDefault()} onClick={insertFormula}>
          <Sigma className="h-3.5 w-3.5" />
          {t("editor.formula")}
        </Button>
      </div>

      {typeFields()}

      <Field label={t("editor.explanation")}>
        {mathField("explanation", ex.explanation ?? "", (v) => set({ explanation: v || null }), { multiline: true, maxLength: MAX_TEXT })}
      </Field>

      <div className="flex flex-wrap items-end gap-3">
        <Field label={t("editor.answerSpace")}>
          <Select
            value={ex.answerSpace.kind}
            onValueChange={(kind) => set({ answerSpace: { kind: kind as AssessmentExercise["answerSpace"]["kind"], count: kind === "none" ? null : ex.answerSpace.count ?? 3 } })}
          >
            <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
            <SelectContent className={PHONE_TOUCH}>
              <SelectItem value="lines">{t("editor.spaceLines")}</SelectItem>
              <SelectItem value="box">{t("editor.spaceBox")}</SelectItem>
              <SelectItem value="none">{t("editor.spaceNone")}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        {ex.answerSpace.kind !== "none" && (
          <Field label={t("editor.lineCount")}>
            <Input
              type="number"
              min={1}
              max={30}
              value={ex.answerSpace.count ?? 3}
              onChange={(e) => set({ answerSpace: { ...ex.answerSpace, count: Math.min(30, Math.max(1, Number(e.target.value) || 1)) } })}
              className="h-9 w-24"
            />
          </Field>
        )}
        <Field label={t("editor.image")}>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => requestImage((url) => onChange(syncAnswer(withImage(ex, url))))}>
              <ImageIcon className="h-3.5 w-3.5" />
              {ex.media ? t("editor.replaceImage") : t("editor.addImage")}
            </Button>
            {ex.media && (
              <Button type="button" variant="ghost" size="sm" className="h-9 gap-1.5 text-muted-foreground" onClick={() => set({ media: null })}>
                <Trash2 className="h-3.5 w-3.5" />
                {t("editor.removeImage")}
              </Button>
            )}
          </div>
        </Field>
      </div>

      {showAe && <Field label={t("editor.goals")}>
        <div className="flex flex-wrap items-center gap-1.5">
          {ex.aeOutcomeIds.map((id) => (
            <AeChip key={id} outcome={aeLookup[id]} onRemove={() => set({ aeOutcomeIds: ex.aeOutcomeIds.filter((x) => x !== id) })} />
          ))}
          <AePicker
            search={searchAe}
            selectedIds={ex.aeOutcomeIds}
            onPick={(o) => {
              rememberAe(o);
              set({ aeOutcomeIds: [...ex.aeOutcomeIds, o.id] });
            }}
          />
        </div>
      </Field>}

    </div>
  );
}

/** Edits a "texto de apoio". */
export function ReadingEditor({ item, onChange, onClose, toolbar, className, autoFocus = true }: {
  item: AssessmentReadingBox;
  onChange: (next: AssessmentReadingBox) => void;
  onClose: () => void;
  toolbar?: ReactNode;
  className?: string;
  autoFocus?: boolean;
}) {
  const t = useTranslations("assessmentEditor");
  const { requestImage } = useAssessmentEditor();
  return (
    <div className={cn("flex flex-col gap-4 rounded-xl border border-border bg-card p-4 font-sans text-sm text-card-foreground shadow-lg", className)} onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold">{t("editor.readingTitle")}</p>
        <Button type="button" size="sm" onClick={onClose}>{t("editor.close")}</Button>
      </div>
      {toolbar}
      <Field label={t("item.readingTitle")}>
        <Input value={item.title ?? ""} maxLength={MAX_TEXT} onChange={(e) => onChange({ ...item, title: e.target.value || null })} className="h-9" />
      </Field>
      <Field label={t("item.readingBody")}>
        <MathTextInput value={item.body} maxLength={MAX_READING} onChange={(body) => onChange({ ...item, body })} multiline autoFocus={autoFocus} className="min-h-24" />
      </Field>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => requestImage((url) => onChange({ ...item, media: { imageRef: url, placeholder: item.media?.placeholder ?? null } }))}>
          <ImageIcon className="h-3.5 w-3.5" />
          {item.media ? t("editor.replaceImage") : t("editor.addImage")}
        </Button>
        {item.media && (
          <Button type="button" variant="ghost" size="sm" className="h-9 gap-1.5 text-muted-foreground" onClick={() => onChange({ ...item, media: null })}>
            <Trash2 className="h-3.5 w-3.5" />
            {t("editor.removeImage")}
          </Button>
        )}
      </div>
    </div>
  );
}
