"use client";

import { InlineText } from "@/components/blocks/inline-text";
import { cn } from "@/shared/utils/utils";
import type { AssessmentExercise, AssessmentLabel, AssessmentMedia, AssessmentReadingBox } from "@/types/assessment";
import { AlertTriangle, Check, ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { AeChip } from "./AeChip";
import { useAssessmentEditor } from "./context";
import { cellAnswer, gapText, gridStale, hasTextAnswer, isBlankCell, listedWords, missingAnswer, optionLetter, placedCells, splitBlanks } from "./model";

const correctCls = "rounded bg-emerald-50 px-1 text-emerald-900 ring-1 ring-emerald-200";

/** Read-only rendering of one exercise as it prints. Teacher extras disappear in the student view. */
/** `points`, when given, sits beside the number on its own row (phone layout) and the body takes the full width. */
export function ExerciseView({ exercise: ex, number, points }: { exercise: AssessmentExercise; number: number; points?: ReactNode }) {
  const t = useTranslations("assessmentEditor");
  const { studentView, aeLookup, showAe } = useAssessmentEditor();
  const teacher = !studentView;
  const options = ex.options ?? [];
  const missing = teacher ? missingAnswer(ex) : null;

  const prompt = ex.type === "fill_gaps" ? (
    splitBlanks(ex.prompt).map((part, i, parts) => (
      <Fragment key={i}>
        <InlineText value={part} />
        {i < parts.length - 1 && (
          <span className={cn("mx-0.5 inline-block min-w-20 border-b border-neutral-700 text-center", teacher && "font-medium text-emerald-800")}>
            {teacher ? <InlineText value={gapText(ex, ex.answer.gaps?.[i] ?? "")} /> : " "}
          </span>
        )}
      </Fragment>
    ))
  ) : ex.prompt ? (
    <InlineText value={ex.prompt} />
  ) : (
    <span className="font-sans text-sm italic text-neutral-400">{t("item.emptyPrompt")}</span>
  );

  // A picture to label is the exercise itself: it sits under the prompt, full width, not beside it.
  const sideMedia = ex.media && ex.type !== "label_image" ? ex.media : null;
  const content = (
      <div className="min-w-0 flex-1">
        <div className={cn(sideMedia && "grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_auto]")}>
          <div className="min-w-0">
            <p className="leading-relaxed">{prompt}</p>
            {renderBody()}
          </div>
          {sideMedia && <MediaBox media={sideMedia} teacher={teacher} />}
        </div>

        <AnswerSpace ex={ex} />

        {teacher && hasTextAnswer(ex) && ex.answer.text && (
          <div className={cn("mt-2 px-2 py-1 text-sm", correctCls)}>
            <span className="font-sans text-[11px] font-semibold uppercase tracking-wide text-emerald-700">{t("view.answer")} </span>
            <InlineText value={ex.answer.text} />
          </div>
        )}
        {teacher && ex.criteria && ex.criteria.length > 0 && (
          <div className="mt-2 rounded border border-neutral-200 font-sans text-xs">
            <p className="border-b border-neutral-200 bg-neutral-50 px-2 py-1 font-semibold text-neutral-700">{t("view.criteria")}</p>
            {ex.criteria.map((c, i) => (
              // Phones: level and points on one line, the descriptor full width under them.
              <div key={i} className="flex flex-wrap gap-x-3 border-b border-neutral-100 px-2 py-1 last:border-0">
                <span className="w-28 shrink-0 font-medium max-md:w-auto max-md:flex-1">{c.level}</span>
                <span className="min-w-0 flex-1 text-neutral-600 max-md:order-last max-md:basis-full"><InlineText value={c.descriptor} /></span>
                <span className="shrink-0 font-semibold">{t("points", { points: c.points })}</span>
              </div>
            ))}
          </div>
        )}
        {teacher && ex.explanation && (
          <p className="mt-2 font-sans text-xs text-neutral-600">
            <span className="font-semibold">{t("view.explanation")}: </span>
            <InlineText value={ex.explanation} />
          </p>
        )}
        {missing && (
          <p className="mt-2 flex items-center gap-1.5 font-sans text-xs font-medium text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {t(`missing.${missing}`)}
          </p>
        )}
        {teacher && showAe && ex.aeOutcomeIds.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {ex.aeOutcomeIds.map((id) => <AeChip key={id} outcome={aeLookup[id]} />)}
          </div>
        )}
      </div>
  );

  return points !== undefined ? (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-bold">{number}.</span>
        {points}
      </div>
      {content}
    </div>
  ) : (
    <div className="flex gap-2">
      <span className="shrink-0 font-bold">{number}.</span>
      {content}
    </div>
  );

  function renderBody() {
    switch (ex.type) {
      case "multiple_choice": {
        const short = options.every((o) => o.text.length <= 32);
        return (
          <div className={cn("mt-1.5 grid gap-x-6 gap-y-1", short && options.length > 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
            {options.map((o, i) => {
              const correct = teacher && ex.answer.optionIds?.includes(o.id);
              return (
                <span key={o.id} className={cn("w-fit", correct && correctCls)}>
                  ({optionLetter(i)}) <InlineText value={o.text} />
                  {correct && <Check className="ml-1 inline h-3.5 w-3.5 text-emerald-700" aria-hidden />}
                </span>
              );
            })}
          </div>
        );
      }
      case "true_false":
        return (
          <ol className="mt-1.5 flex flex-col gap-1">
            {options.map((o, i) => {
              const truth = ex.answer.truth?.find((x) => x.statementId === o.id);
              return (
                <li key={o.id}>
                  <div className="flex items-baseline gap-3">
                    <span className="min-w-0 flex-1">{String.fromCharCode(97 + i)}) <InlineText value={o.text} /></span>
                    {teacher && truth ? (
                      <span className={cn("shrink-0 font-sans text-xs font-bold", correctCls)}>{truth.value ? t("editor.trueShort") : t("editor.falseShort")}</span>
                    ) : (
                      <span className="shrink-0 font-sans text-xs text-neutral-500">{t("view.trueFalseBlank")}</span>
                    )}
                  </div>
                  {teacher && truth && !truth.value && truth.correction && (
                    <p className="ml-4 font-sans text-xs italic text-emerald-800"><InlineText value={t("view.correction", { text: truth.correction })} /></p>
                  )}
                </li>
              );
            })}
          </ol>
        );
      case "fill_gaps":
        return options.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 rounded border border-dashed border-neutral-400 px-2 py-1 text-sm">
            <span className="font-sans text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{t("view.wordBank")}</span>
            {options.map((o) => <span key={o.id}><InlineText value={o.text} /></span>)}
          </div>
        ) : null;
      case "matching":
        return <MatchingView ex={ex} teacher={teacher} />;
      case "table_completion":
        return ex.table ? <TableView ex={ex} table={ex.table} teacher={teacher} /> : null;
      case "classify":
        return ex.categories ? <ClassifyView ex={ex} cats={ex.categories} teacher={teacher} /> : null;
      case "ordering":
        return (
          <div className="mt-1.5 flex flex-col gap-1">
            {options.map((o) => {
              const pos = (ex.answer.order ?? []).indexOf(o.id) + 1;
              return (
                <span key={o.id} className="flex items-baseline gap-2">
                  <span className={cn("inline-flex h-5 w-6 shrink-0 items-center justify-center border border-neutral-600 font-sans text-xs font-bold", teacher && pos && "border-emerald-400 bg-emerald-50 text-emerald-800")}>
                    {teacher && pos ? pos : ""}
                  </span>
                  <InlineText value={o.text} />
                </span>
              );
            })}
          </div>
        );
      case "label_image": {
        const labels = [...(ex.labels ?? [])].sort((a, b) => a.n - b.n);
        // Hints in one column so every answer line starts at the same place.
        const hints = labels.some((l) => l.hint);
        return (
          <>
            {ex.media && <LabelImage media={ex.media} labels={labels} teacher={teacher} />}
            <ol className="mt-2 flex flex-col gap-1.5">
              {labels.map((l) => {
                const answer = teacher ? ex.answer.labels?.find((x) => x.labelId === l.id)?.text : null;
                return (
                  <li key={l.id} className={cn("grid items-end gap-2", hints ? "grid-cols-[1.5rem_minmax(0,2fr)_minmax(0,3fr)] max-md:grid-cols-[1.5rem_minmax(0,1fr)] max-md:gap-y-1" : "grid-cols-[1.5rem_minmax(0,1fr)]")}>
                    <span className="font-bold">{l.n}.</span>
                    {hints && <span className="font-sans text-xs text-neutral-500">{l.hint && <InlineText value={l.hint} />}</span>}
                    {/* phones: the answer line goes under its hint */}
                    <span className={cn("min-w-0 border-b border-dotted border-neutral-500 pb-0.5", hints && "max-md:col-start-2", answer && "font-medium text-emerald-800")}>
                      {answer || " "}
                    </span>
                  </li>
                );
              })}
            </ol>
          </>
        );
      }
      case "wordsearch":
        return <WordSearchView ex={ex} teacher={teacher} />;
      default:
        return null;
    }
  }
}

/**
 * The letter grid as it prints (square cells that shrink with the page width) and the word list. The teacher view
 * shades the placed words; while the words differ from the grid's, the grid is dimmed until the next save rebuilds it.
 */
function WordSearchView({ ex, teacher }: { ex: AssessmentExercise; teacher: boolean }) {
  const t = useTranslations("assessmentEditor");
  const grid = ex.grid;
  const stale = gridStale(ex);
  const key = teacher ? placedCells(ex) : null;
  const words = listedWords(ex);
  return (
    <div className="mt-2">
      {grid && grid.rows.length > 0 && (
        <div className="@container w-full" style={{ maxWidth: `${grid.size * 2}rem` }}>
          <div
            data-wordgrid
            className={cn("grid border-l border-t border-neutral-600 font-sans font-medium", stale && "opacity-40")}
            style={{ gridTemplateColumns: `repeat(${grid.size}, minmax(0, 1fr))`, fontSize: `calc(55cqw / ${grid.size})` }}
          >
            {grid.rows.flatMap((row, r) => [...row].map((ch, c) => (
              <span
                key={`${r}:${c}`}
                className={cn(
                  "flex aspect-square items-center justify-center border-b border-r border-neutral-600 leading-none",
                  key?.has(`${r}:${c}`) && "bg-emerald-100 font-bold text-emerald-900",
                )}
              >
                {ch}
              </span>
            )))}
          </div>
        </div>
      )}
      {teacher && stale && <p className="mt-1 font-sans text-xs text-neutral-500">{t("view.gridOnSave")}</p>}
      {words.length > 0 && (
        <p className="mt-1.5 text-sm">
          <span className="font-sans text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{t("view.words")}: </span>
          {words.map((w, i) => <Fragment key={i}>{i > 0 && " · "}{w}</Fragment>)}
        </p>
      )}
    </div>
  );
}

const Dot = ({ id }: { id: string }) => <span data-dot={id} aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-neutral-900" />;

/**
 * Matching as a printed worksheet: left items numbered with a dot after them, right items lettered with a dot before
 * them, a wide gap between for the student's lines (stacked on phones). The teacher view draws the pairs as lines
 * between the dots (side by side only) and lists them under the columns.
 */
function MatchingView({ ex, teacher }: { ex: AssessmentExercise; teacher: boolean }) {
  const options = ex.options ?? [];
  const left = options.filter((o) => o.side !== "right");
  const right = options.filter((o) => o.side === "right");
  const pairs = (ex.answer.pairs ?? [])
    .map(([l, r]) => [left.findIndex((o) => o.id === l), right.findIndex((o) => o.id === r)])
    .filter(([l, r]) => l >= 0 && r >= 0)
    .sort((a, b) => a[0] - b[0]);
  const pairsKey = teacher ? pairs.map(([l, r]) => `${l}-${r}`).join(",") : "";
  const box = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number }[]>([]);

  useEffect(() => {
    const el = box.current;
    if (!el || !pairsKey) return;
    // ResizeObserver reports once on observe, then on every reflow (text edits, page width).
    const ro = new ResizeObserver(() => {
      const b = el.getBoundingClientRect();
      const center = (id: string) => {
        const r = el.querySelector(`[data-dot="${id}"]`)?.getBoundingClientRect();
        return r ? { x: r.left + r.width / 2 - b.left, y: r.top + r.height / 2 - b.top } : null;
      };
      const next = [];
      for (const pair of pairsKey.split(",")) {
        const [l, r] = pair.split("-");
        const a = center(`l${l}`);
        const c = center(`r${r}`);
        // Stacked columns (phone): the right dot is not right of the left one, so no line.
        if (a && c && c.x > a.x + 8) next.push({ x1: a.x, y1: a.y, x2: c.x, y2: c.y });
      }
      setLines(next);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [pairsKey]);

  return (
    <>
      <div ref={box} className="relative mt-2">
        <div className="flex flex-col gap-3 md:grid md:grid-cols-[minmax(0,1fr)_6rem_minmax(0,1fr)] md:gap-0">
          <ol className="flex flex-col gap-1.5">
            {left.map((o, i) => (
              <li key={o.id} className="flex items-center gap-2">
                <span className="shrink-0 font-bold">{i + 1}.</span>
                <span className="min-w-0 flex-1 break-words"><InlineText value={o.text} /></span>
                <Dot id={`l${i}`} />
              </li>
            ))}
          </ol>
          <span aria-hidden className="hidden md:block" />
          <ol className="flex flex-col gap-1.5">
            {right.map((o, i) => (
              <li key={o.id} className="flex items-center gap-2">
                <Dot id={`r${i}`} />
                <span className="shrink-0 font-bold">{optionLetter(i)}.</span>
                <span className="min-w-0 flex-1 break-words"><InlineText value={o.text} /></span>
              </li>
            ))}
          </ol>
        </div>
        {pairsKey && (
          <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full overflow-visible text-emerald-700">
            {lines.map((l, i) => <line key={i} {...l} stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />)}
          </svg>
        )}
      </div>
      {teacher && pairs.length > 0 && (
        <p className={cn("mt-2 w-fit font-sans text-xs font-medium", correctCls)}>
          {pairs.map(([l, r]) => `${l + 1} – ${optionLetter(r)}`).join(" · ")}
        </p>
      )}
    </>
  );
}

/** A real table; blanks are empty boxes for the student and hold the answer for the teacher. Scrolls inside itself. */
function TableView({ ex, table, teacher }: { ex: AssessmentExercise; table: NonNullable<AssessmentExercise["table"]>; teacher: boolean }) {
  return (
    <div className="mt-2 max-w-full overflow-x-auto" data-table-scroll>
      <table className="w-full border-collapse text-sm" style={{ minWidth: `${table.headers.length * 5.5}rem` }}>
        <thead>
          <tr>
            {table.headers.map((h, j) => (
              <th key={j} className="border border-neutral-600 bg-neutral-100 px-2 py-1 text-left font-semibold"><InlineText value={h} /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => {
                const blank = isBlankCell(cell);
                return (
                  <td key={j} className={cn("h-8 border border-neutral-600 px-2 py-1", blank && teacher && "bg-emerald-50 font-semibold text-emerald-800")}>
                    {blank ? (teacher ? <InlineText value={cellAnswer(ex, i, j)} /> : null) : <InlineText value={cell} />}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Category boxes: empty under the item bank for the student; filled with their items for the teacher. */
function ClassifyView({ ex, cats, teacher }: { ex: AssessmentExercise; cats: NonNullable<AssessmentExercise["categories"]>; teacher: boolean }) {
  const options = ex.options ?? [];
  const boxOf = (id: string) => ex.answer.classes?.find((c) => c.optionId === id)?.categoryId;
  // The teacher sees only what is not in a box yet.
  const bank = teacher ? options.filter((o) => !cats.some((c) => c.id === boxOf(o.id))) : options;
  return (
    <div className="mt-2 flex flex-col gap-2">
      {bank.length > 0 && (
        <p className="rounded border border-dashed border-neutral-400 px-2 py-1 text-sm leading-relaxed">
          {bank.map((o, i) => (
            <Fragment key={o.id}>
              {i > 0 && <span className="text-neutral-400"> · </span>}
              <InlineText value={o.text} />
            </Fragment>
          ))}
        </p>
      )}
      <div className={cn("grid grid-cols-1 gap-2 sm:grid-cols-2", cats.length > 2 && "md:grid-cols-3")}>
        {cats.map((c) => (
          <div key={c.id} className="flex min-h-24 min-w-0 flex-col rounded-sm border border-neutral-600 px-2 py-1">
            <p className="border-b border-neutral-600 pb-1 font-semibold break-words"><InlineText value={c.label} /></p>
            {teacher && (
              <ul className="mt-1 flex flex-col gap-0.5 text-sm text-emerald-800">
                {options.filter((o) => boxOf(o.id) === c.id).map((o) => <li key={o.id}><InlineText value={o.text} /></li>)}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AnswerSpace({ ex }: { ex: AssessmentExercise }) {
  const { kind, count } = ex.answerSpace;
  if (kind === "lines") {
    return (
      <div className="mt-1" aria-hidden>
        {Array.from({ length: count ?? 3 }, (_, i) => <div key={i} className="h-7 border-b border-dotted border-neutral-500" />)}
      </div>
    );
  }
  if (kind === "box") {
    return <div aria-hidden className="mt-2 rounded-sm border border-neutral-500" style={{ height: `${(count ?? 6) * 1.75}rem` }} />;
  }
  return null;
}

/**
 * The picture of a label_image exercise with its numbered pins (where placed). With `onPlace`, a click or tap
 * on the picture reports its position (0–1) so the editor can place the selected target there.
 */
export function LabelImage({ media, labels, teacher, onPlace, activeId, placeLabel }: {
  media: AssessmentMedia;
  labels: AssessmentLabel[];
  teacher: boolean;
  onPlace?: (x: number, y: number) => void;
  activeId?: string | null;
  placeLabel?: string;
}) {
  const t = useTranslations("assessmentEditor.item");
  if (!media.imageRef) return <div className="mt-2"><MediaBox media={media} teacher={teacher} /></div>;
  const pins = labels.filter((l) => l.x !== null && l.y !== null);
  const picture = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- data URIs and arbitrary hosts; next/image adds nothing here */}
      <img src={media.imageRef} alt={media.placeholder?.alt ?? t("imageAlt")} className="block max-h-80 max-w-full rounded object-contain" draggable={false} />
      {pins.map((l) => (
        <span
          key={l.id}
          aria-hidden
          style={{ left: `${(l.x ?? 0) * 100}%`, top: `${(l.y ?? 0) * 100}%` }}
          className={cn(
            "pointer-events-none absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-neutral-900 bg-white font-sans text-xs font-bold text-neutral-900 shadow-sm",
            activeId === l.id && "border-primary bg-primary text-primary-foreground",
          )}
        >
          {l.n}
        </span>
      ))}
    </>
  );
  if (!onPlace) return <div className="relative mt-2 w-fit max-w-full">{picture}</div>;
  return (
    <button
      type="button"
      aria-label={placeLabel}
      className="relative mt-2 block w-fit max-w-full cursor-crosshair rounded ring-offset-2 focus-visible:ring-2 focus-visible:ring-primary"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const clamp = (v: number) => Math.min(1, Math.max(0, Math.round(v * 1000) / 1000));
        onPlace(clamp((e.clientX - r.left) / r.width), clamp((e.clientY - r.top) / r.height));
      }}
    >
      {picture}
    </button>
  );
}

export function MediaBox({ media, teacher }: { media: AssessmentMedia; teacher: boolean }) {
  const t = useTranslations("assessmentEditor.item");
  if (media.imageRef) {
    // eslint-disable-next-line @next/next/no-img-element -- data URIs and arbitrary hosts; next/image adds nothing here
    return <img src={media.imageRef} alt={media.placeholder?.alt ?? t("imageAlt")} className="max-h-44 w-40 rounded object-contain" />;
  }
  if (!teacher) return null;
  return (
    <div className="flex h-28 w-40 flex-col items-center justify-center gap-1 rounded border border-dashed border-neutral-300 p-2 text-center font-sans text-[11px] text-neutral-500">
      <ImageIcon className="h-4 w-4" />
      {media.placeholder?.alt ?? t("imageAlt")}
    </div>
  );
}

export function ReadingView({ item }: { item: AssessmentReadingBox }) {
  const t = useTranslations("assessmentEditor.item");
  const { studentView } = useAssessmentEditor();
  return (
    <div className="rounded border border-neutral-400 bg-neutral-50/60 px-3 py-2">
      <p className="mb-1 font-sans text-xs font-semibold uppercase tracking-wide text-neutral-600">{item.title || t("readingDefaultTitle")}</p>
      <div className={cn(item.media && "grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_auto]")}>
        <div className="flex flex-col gap-1.5 leading-relaxed">
          {item.body.split(/\n+/).map((p, i) => <p key={i}><InlineText value={p} /></p>)}
        </div>
        {item.media && <MediaBox media={item.media} teacher={!studentView} />}
      </div>
    </div>
  );
}
