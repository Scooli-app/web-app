import type {
  AssessmentAnswer,
  AssessmentDocument,
  AssessmentExercise,
  AssessmentItem,
  AssessmentOption,
  ExerciseType,
} from "@/types/assessment";

export const EXERCISE_TYPES: ExerciseType[] = [
  "multiple_choice", "true_false", "fill_gaps", "matching", "ordering", "short_answer",
  "long_answer", "calculation", "table_completion", "classify", "wordsearch", "label_image",
];

/** Types answered in writing: model answer + criteria, answer lines by default. */
export const OPEN_TYPES: ExerciseType[] = ["short_answer", "long_answer", "calculation"];

/** A written model answer is the key: open types, and tables / classify stored before they had a structure. */
export const hasTextAnswer = (ex: AssessmentExercise) =>
  OPEN_TYPES.includes(ex.type) || (ex.type === "table_completion" && !ex.table) || (ex.type === "classify" && !ex.categories);

export const MAX_AE_PER_EXERCISE = 5;

const BLANK = /_{3,}/g;

export const countBlanks = (prompt: string) => (prompt.match(BLANK) ?? []).length;

/** Splits a fill_gaps prompt around its `___` blanks. */
export const splitBlanks = (prompt: string) => prompt.split(BLANK);

const emptyAnswer = (): AssessmentAnswer => ({
  optionIds: null, text: null, pairs: null, order: null, truth: null, gaps: null, labels: null, cells: null, classes: null,
});

const opt = (id: string, text = "", side: AssessmentOption["side"] = null): AssessmentOption => ({ id, text, side });

/** Defaults a stored (or AI-written) document so every field the editor reads exists. */
export function parseAssessment(content: string | null | undefined): AssessmentDocument | null {
  if (!content) return null;
  let raw: Partial<AssessmentDocument>;
  try {
    raw = JSON.parse(content);
  } catch {
    return null;
  }
  if (!raw || !Array.isArray(raw.sections)) return null;
  return {
    schemaVersion: 1,
    documentType: raw.documentType ?? "test",
    title: raw.title ?? null,
    header: {
      school: raw.header?.school ?? null,
      gradeClass: raw.header?.gradeClass ?? null,
      duration: raw.header?.duration ?? null,
      showFields: raw.header?.showFields ?? [],
    },
    targetTotal: raw.targetTotal ?? null,
    sections: raw.sections.map((s) => ({
      id: s.id,
      title: s.title ?? "",
      instructions: s.instructions ?? null,
      items: (s.items ?? []).map(normalizeItem),
    })),
  };
}

export function normalizeItem(item: AssessmentItem): AssessmentItem {
  if (item.kind === "reading") {
    return { id: item.id, kind: "reading", title: item.title ?? null, body: item.body ?? "", media: item.media ?? null };
  }
  const e = item as Partial<AssessmentExercise> & { id: string; type: ExerciseType };
  return {
    id: e.id,
    kind: "exercise",
    type: e.type,
    prompt: e.prompt ?? "",
    options: e.options?.map((o) => opt(o.id, o.text ?? "", o.side ?? null)) ?? null,
    answer: { ...emptyAnswer(), ...e.answer },
    explanation: e.explanation ?? null,
    points: e.points ?? null,
    answerSpace: { kind: e.answerSpace?.kind ?? "none", count: e.answerSpace?.count ?? null },
    media: e.media ?? null,
    aeCodes: e.aeCodes ?? [],
    aeOutcomeIds: e.aeOutcomeIds ?? [],
    criteria: e.criteria ?? null,
    labels: e.labels?.map((l) => ({ id: l.id, n: l.n, hint: l.hint ?? null, x: l.x ?? null, y: l.y ?? null })) ?? null,
    // Phase-1 word searches kept their words as options.
    words: e.words ?? (e.type === "wordsearch" ? e.options?.map((o) => o.text ?? "") ?? [] : null),
    grid: e.grid ?? null,
    table: e.table ? { headers: e.table.headers ?? [], rows: e.table.rows ?? [] } : null,
    categories: e.categories ?? null,
  };
}

/* ── Table to complete ───────────────────────────────────────────────
 * Answers are keyed by cell position, so every row/column edit moves them with their cell. */

export const TABLE_MAX_COLS = 8;
export const TABLE_MAX_ROWS = 20;
export const BLANK_CELL = "___";

/** Mirrors AssessmentValidator.isBlank: a cell of only underscores (3+) is a blank. */
export const isBlankCell = (cell: string) => /^\s*_{3,}\s*$/.test(cell);

export const cellAnswer = (ex: AssessmentExercise, row: number, col: number) =>
  ex.answer.cells?.find((c) => c.row === row && c.col === col)?.text ?? "";

type Table = NonNullable<AssessmentExercise["table"]>;

/** Rebuilds table and answers together; `at(row, col)` maps each new cell to the old one it came from (or null). */
function reshape(ex: AssessmentExercise, table: Table, at: (row: number, col: number) => [number, number] | null): AssessmentExercise {
  const cells: NonNullable<AssessmentExercise["answer"]["cells"]> = [];
  table.rows.forEach((r, i) => r.forEach((cell, j) => {
    if (!isBlankCell(cell)) return;
    const from = at(i, j);
    cells.push({ row: i, col: j, text: from ? cellAnswer(ex, from[0], from[1]) : "" });
  }));
  return { ...ex, table, answer: { ...ex.answer, cells } };
}

const emptyTable = (): Table => ({ headers: ["", ""], rows: [["", BLANK_CELL], ["", BLANK_CELL]] });

export function setTableCell(ex: AssessmentExercise, row: number, col: number, text: string): AssessmentExercise {
  const t = ex.table ?? emptyTable();
  const rows = t.rows.map((r, i) => (i === row ? r.map((c, j) => (j === col ? text : c)) : r));
  return reshape(ex, { ...t, rows }, (i, j) => [i, j]);
}

/** Turns a cell into a blank (its text becomes the answer) or back (the answer becomes its text). */
export function toggleBlank(ex: AssessmentExercise, row: number, col: number): AssessmentExercise {
  const t = ex.table ?? emptyTable();
  const cell = t.rows[row]?.[col] ?? "";
  const blank = isBlankCell(cell);
  const next = setTableCell(ex, row, col, blank ? cellAnswer(ex, row, col) : BLANK_CELL);
  if (blank) return next;
  return { ...next, answer: { ...next.answer, cells: (next.answer.cells ?? []).map((c) => (c.row === row && c.col === col ? { ...c, text: cell } : c)) } };
}

export function addTableRow(ex: AssessmentExercise): AssessmentExercise {
  const t = ex.table ?? emptyTable();
  if (t.rows.length >= TABLE_MAX_ROWS) return ex;
  return reshape(ex, { ...t, rows: [...t.rows, t.headers.map(() => "")] }, (i, j) => [i, j]);
}

export function removeTableRow(ex: AssessmentExercise, row: number): AssessmentExercise {
  const t = ex.table ?? emptyTable();
  if (t.rows.length <= 1) return ex;
  return reshape(ex, { ...t, rows: t.rows.filter((_, i) => i !== row) }, (i, j) => [i < row ? i : i + 1, j]);
}

export function addTableColumn(ex: AssessmentExercise): AssessmentExercise {
  const t = ex.table ?? emptyTable();
  if (t.headers.length >= TABLE_MAX_COLS) return ex;
  return reshape(ex, { headers: [...t.headers, ""], rows: t.rows.map((r) => [...r, ""]) }, (i, j) => [i, j]);
}

export function removeTableColumn(ex: AssessmentExercise, col: number): AssessmentExercise {
  const t = ex.table ?? emptyTable();
  if (t.headers.length <= 1) return ex;
  const drop = <T,>(r: T[]) => r.filter((_, j) => j !== col);
  return reshape(ex, { headers: drop(t.headers), rows: t.rows.map(drop) }, (i, j) => [i, j < col ? j : j + 1]);
}

export function setTableHeader(ex: AssessmentExercise, col: number, text: string): AssessmentExercise {
  const t = ex.table ?? emptyTable();
  return { ...ex, table: { ...t, headers: t.headers.map((h, j) => (j === col ? text : h)) } };
}

/** Starts the table of an exercise stored before tables had a structure. */
export const withEmptyTable = (ex: AssessmentExercise) => syncAnswer({ ...ex, table: emptyTable(), answerSpace: { kind: "none", count: null } });

/* ── Classify ──────────────────────────────────────────────────────── */

export const MAX_CATEGORIES = 6;

const emptyCategories = () => [{ id: "c1", label: "" }, { id: "c2", label: "" }];

export function addCategory(ex: AssessmentExercise): AssessmentExercise {
  const cats = ex.categories ?? [];
  const used = new Set(cats.map((c) => c.id));
  let k = 1;
  while (used.has(`c${k}`)) k++;
  return syncAnswer({ ...ex, categories: [...cats, { id: `c${k}`, label: "" }] });
}

export const removeCategory = (ex: AssessmentExercise, id: string) =>
  syncAnswer({ ...ex, categories: (ex.categories ?? []).filter((c) => c.id !== id) });

/** Puts an item in a category (null takes it out). */
export function classifyItem(ex: AssessmentExercise, optionId: string, categoryId: string | null): AssessmentExercise {
  const rest = (ex.answer.classes ?? []).filter((c) => c.optionId !== optionId);
  return syncAnswer({ ...ex, answer: { ...ex.answer, classes: categoryId ? [...rest, { optionId, categoryId }] : rest } });
}

/** Starts the boxes of an exercise stored before classify had a structure. */
export const withEmptyCategories = (ex: AssessmentExercise) =>
  syncAnswer({ ...ex, categories: emptyCategories(), options: ex.options ?? [opt("o1"), opt("o2")], answerSpace: { kind: "none", count: null } });

/* ── Word search ─────────────────────────────────────────────────────
 * The grid is built on the server (WordSearchGrid.java) when the words change; the editor shows the grid the
 * last save returned, so screen and print are the same grid. */

export const MAX_WORDS = 12;
/** Letters per word (the input limit counts characters, which are never fewer than letters). */
export const MAX_WORD_LETTERS = 15;

/** Mirrors WordSearchGrid.normalize: "esófago" → "ESOFAGO". */
export const gridLetters = (word: string) =>
  word.normalize("NFD").replace(/\p{M}+/gu, "").toUpperCase().replace(/[^A-Z]/g, "");

/** Mirrors WordSearchGrid.gridWords: normalised, 2+ letters, no repeats, at most 12. */
export function gridWords(words: string[] | null): string[] {
  const out: string[] = [];
  for (const w of words ?? []) {
    const n = gridLetters(w);
    if (n.length >= 2 && n.length <= MAX_WORD_LETTERS && !out.includes(n) && out.length < MAX_WORDS) out.push(n);
  }
  return out;
}

/** Index of every non-blank word the grid leaves out (repeated after folding, under 2 letters, beyond 12). */
export function skippedWordIndexes(words: string[] | null): Set<number> {
  const seen: string[] = [];
  const out = new Set<number>();
  (words ?? []).forEach((w, i) => {
    const n = gridLetters(w);
    if (n.length >= 2 && n.length <= MAX_WORD_LETTERS && !seen.includes(n) && seen.length < MAX_WORDS) seen.push(n);
    else if (w.trim()) out.add(i);
  });
  return out;
}

/**
 * The word list under the grid, as WordSearchGrid.printedWords: only words the student can find. While the grid is
 * stale, the words the next save will place.
 */
export function listedWords(ex: AssessmentExercise): string[] {
  const skipped = skippedWordIndexes(ex.words);
  const kept = (ex.words ?? []).filter((w, i) => w.trim() && !skipped.has(i)).map((w) => w.trim());
  if (gridStale(ex)) return kept;
  const placed = new Set(ex.grid?.placements.map((p) => p.word) ?? []);
  return kept.filter((w) => placed.has(gridLetters(w)));
}

/** True when the words changed since the grid was built (the next save rebuilds it). */
export function gridStale(ex: AssessmentExercise): boolean {
  const expected = gridWords(ex.words);
  const placed = ex.grid?.placements.map((p) => p.word) ?? [];
  return expected.length !== placed.length || expected.some((w, i) => w !== placed[i]);
}

/** Cells ("row:col") covered by the placed words: the answer key. */
export function placedCells(ex: AssessmentExercise): Set<string> {
  const cells = new Set<string>();
  for (const p of ex.grid?.placements ?? []) {
    const dr = p.dir === "right" ? 0 : 1;
    const dc = p.dir === "down" ? 0 : 1;
    for (let i = 0; i < p.word.length; i++) cells.add(`${p.row + i * dr}:${p.col + i * dc}`);
  }
  return cells;
}

/**
 * After a save: takes the server's grid for every word search whose words still match what the server saved
 * (edits made meanwhile keep theirs until the next save). Returns `local` itself when nothing changes.
 */
export function adoptGrids(local: AssessmentDocument, saved: AssessmentDocument | null): AssessmentDocument {
  if (!saved) return local;
  const server = new Map(allExercises(saved).map((e) => [e.id, e]));
  let changed = false;
  const sections = local.sections.map((s) => {
    let touched = false;
    const items = s.items.map((it) => {
      const from = it.kind === "exercise" && it.type === "wordsearch" ? server.get(it.id) : undefined;
      if (!from || it.kind !== "exercise" || JSON.stringify(from.words) !== JSON.stringify(it.words)
        || JSON.stringify(from.grid) === JSON.stringify(it.grid)) return it;
      touched = true;
      return { ...it, grid: from.grid };
    });
    if (!touched) return s;
    changed = true;
    return { ...s, items };
  });
  return changed ? { ...local, sections } : local;
}

/**
 * After a save: takes the server's option order for every exercise whose options are still the ones saved, only
 * reordered (a hand-written ordering, matching, word bank or classify typed in answer order comes back shuffled, so
 * the screen shows what prints). `editingId`: the exercise open in the editor keeps its order for now (adopting
 * would move the fields under the teacher's hands). Returns `local` itself when nothing changes.
 */
export function adoptStudentOrder(local: AssessmentDocument, saved: AssessmentDocument | null, editingId: string | null): AssessmentDocument {
  if (!saved) return local;
  const server = new Map(allExercises(saved).map((e) => [e.id, e]));
  const key = (o: AssessmentOption) => JSON.stringify([o.id, o.text, o.side]);
  let changed = false;
  const sections = local.sections.map((s) => {
    let touched = false;
    const items = s.items.map((it) => {
      const from = it.kind === "exercise" && it.id !== editingId ? server.get(it.id) : undefined;
      if (!from?.options || it.kind !== "exercise" || !it.options) return it;
      const mine = it.options.map(key);
      const theirs = from.options.map(key);
      if (mine.join() === theirs.join() || [...mine].sort().join() !== [...theirs].sort().join()) return it;
      touched = true;
      return { ...it, options: from.options };
    });
    if (!touched) return s;
    changed = true;
    return { ...s, items };
  });
  return changed ? { ...local, sections } : local;
}

/** Next free id with this prefix ("e" → e7). Ids are unique across the whole document. */
export function nextId(doc: AssessmentDocument, prefix: string): string {
  const used = new Set<string>();
  for (const s of doc.sections) {
    used.add(s.id);
    for (const i of s.items) used.add(i.id);
  }
  let n = 1;
  while (used.has(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}

const nextOptionId = (options: AssessmentOption[], prefix: string) => {
  const used = new Set(options.map((o) => o.id));
  let n = 1;
  while (used.has(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
};

export function addOption(ex: AssessmentExercise, side: AssessmentOption["side"] = null): AssessmentExercise {
  const options = ex.options ?? [];
  const prefix = side === "right" ? "r" : side === "left" ? "l" : "o";
  return syncAnswer({ ...ex, options: [...options, opt(nextOptionId(options, prefix), "", side)] });
}

export function removeOption(ex: AssessmentExercise, id: string): AssessmentExercise {
  return syncAnswer({ ...ex, options: (ex.options ?? []).filter((o) => o.id !== id) });
}

/** Sets the exercise picture; a new picture for label_image clears the pins (they pointed at the old one). */
export function withImage(ex: AssessmentExercise, url: string): AssessmentExercise {
  const media = { imageRef: url, placeholder: ex.media?.placeholder ?? null };
  const labels = ex.type === "label_image" && ex.media?.imageRef !== url
    ? ex.labels?.map((l) => ({ ...l, x: null, y: null })) ?? null
    : ex.labels;
  return { ...ex, media, labels };
}

/** label_image: a new target numbered after the last one (unplaced). */
export function addLabel(ex: AssessmentExercise): AssessmentExercise {
  const labels = ex.labels ?? [];
  const used = new Set(labels.map((l) => l.id));
  let k = 1;
  while (used.has(`l${k}`)) k++;
  const n = labels.reduce((m, l) => Math.max(m, l.n), 0) + 1;
  return syncAnswer({ ...ex, labels: [...labels, { id: `l${k}`, n, hint: null, x: null, y: null }] });
}

/** Removes a target and renumbers the rest 1..n, so the printed numbers stay consecutive. */
export function removeLabel(ex: AssessmentExercise, id: string): AssessmentExercise {
  const labels = (ex.labels ?? []).filter((l) => l.id !== id).sort((a, b) => a.n - b.n).map((l, i) => ({ ...l, n: i + 1 }));
  return syncAnswer({ ...ex, labels });
}

/** Content and answer for a fresh exercise of this type. Structurally valid; unfilled answers are only save warnings. */
function typeDefaults(type: ExerciseType, keptTexts: string[]): Pick<AssessmentExercise, "options" | "answer" | "answerSpace" | "criteria" | "labels" | "words" | "grid" | "table" | "categories"> {
  const texts = (n: number) => Array.from({ length: Math.max(n, keptTexts.length) }, (_, i) => keptTexts[i] ?? "");
  const answer = emptyAnswer();
  const none = { kind: "none" as const, count: null };
  const base = { labels: null, words: null, grid: null, table: null, categories: null };
  switch (type) {
    case "table_completion":
      return { ...base, options: null, answer: { ...answer, cells: [] }, answerSpace: none, criteria: null, table: emptyTable() };
    case "classify":
      // Kept option texts become the items to sort.
      return { ...base, options: texts(4).map((t, i) => opt(`o${i + 1}`, t)), answer: { ...answer, classes: [] }, answerSpace: none, criteria: null, categories: emptyCategories() };
    case "label_image": {
      const labels = [1, 2, 3].map((n) => ({ id: `l${n}`, n, hint: null, x: null, y: null }));
      return { ...base, options: null, answer: { ...answer, labels: labels.map((l) => ({ labelId: l.id, text: "" })) }, answerSpace: none, criteria: null, labels };
    }
    case "wordsearch":
      // Kept option texts become words; the server builds the grid on the next save.
      return { ...base, options: null, answer, answerSpace: none, criteria: null, words: texts(3).map((w) => w.slice(0, MAX_WORD_LETTERS)).slice(0, MAX_WORDS) };
    case "multiple_choice": {
      const options = texts(4).map((t, i) => opt(String.fromCharCode(97 + i), t));
      return { ...base, options, answer: { ...answer, optionIds: [options[0].id] }, answerSpace: none, criteria: null };
    }
    case "true_false":
    case "ordering": {
      const options = texts(type === "true_false" ? 2 : 3).map((t, i) => opt(`o${i + 1}`, t));
      return { ...base, options, answer, answerSpace: none, criteria: null };
    }
    case "matching":
      return {
        ...base,
        options: [opt("l1", keptTexts[0] ?? "", "left"), opt("l2", keptTexts[1] ?? "", "left"), opt("r1", "", "right"), opt("r2", "", "right")],
        answer: { ...answer, pairs: [["l1", "r1"], ["l2", "r2"]] },
        answerSpace: none,
        criteria: null,
      };
    case "fill_gaps":
      return { ...base, options: null, answer: { ...answer, gaps: [] }, answerSpace: none, criteria: null };
    default:
      return { ...base, options: null, answer: { ...answer, text: "" }, answerSpace: { kind: "lines", count: 3 }, criteria: null };
  }
}

export function newExercise(doc: AssessmentDocument, type: ExerciseType = "short_answer"): AssessmentExercise {
  return syncAnswer({
    id: nextId(doc, "e"),
    kind: "exercise",
    type,
    prompt: "",
    explanation: null,
    // Tests with a target need a number on every exercise; 0 keeps the total honest until the teacher sets it.
    points: doc.targetTotal !== null ? 0 : null,
    media: null,
    aeCodes: [],
    aeOutcomeIds: [],
    ...typeDefaults(type, []),
    // Brief: a new exercise always starts with 3 answer lines (a picture to label, a word search, a table and
    // classify boxes are answered in place).
    answerSpace: ["label_image", "wordsearch", "table_completion", "classify"].includes(type) ? { kind: "none", count: null } : { kind: "lines", count: 3 },
  });
}

/** Switches type, keeping prompt, points, AE goals, explanation, media and any option texts. */
export function changeType(ex: AssessmentExercise, type: ExerciseType): AssessmentExercise {
  if (ex.type === type) return ex;
  const kept = (ex.options ?? []).map((o) => o.text).filter(Boolean);
  const defaults = typeDefaults(type, kept);
  return syncAnswer({ ...ex, type, ...defaults, answer: { ...defaults.answer, text: OPEN_TYPES.includes(type) ? ex.answer.text ?? "" : null } });
}

/**
 * Repairs answer references after any edit so a manual save never fails integrity:
 * refs point at existing options, true_false has one truth per statement, ordering
 * covers every item, fill_gaps has one answer per blank, MC keeps a correct option.
 */
export function syncAnswer(ex: AssessmentExercise): AssessmentExercise {
  const options = ex.options ?? [];
  const ids = new Set(options.map((o) => o.id));
  const side = (id: string) => options.find((o) => o.id === id)?.side;
  const a: AssessmentAnswer = { ...ex.answer };
  switch (ex.type) {
    case "multiple_choice": {
      const kept = (a.optionIds ?? []).filter((id) => ids.has(id));
      a.optionIds = kept.length || !options.length ? kept : [options[0].id];
      break;
    }
    case "true_false":
      a.truth = options.map((o) => a.truth?.find((t) => t.statementId === o.id) ?? { statementId: o.id, value: true, correction: null });
      break;
    case "ordering": {
      const kept = (a.order ?? []).filter((id) => ids.has(id));
      a.order = [...kept, ...options.map((o) => o.id).filter((id) => !kept.includes(id))];
      break;
    }
    case "matching":
      a.pairs = (a.pairs ?? []).filter(([l, r]) => side(l) === "left" && side(r) === "right");
      break;
    case "fill_gaps": {
      const n = countBlanks(ex.prompt);
      a.gaps = Array.from({ length: n }, (_, i) => a.gaps?.[i] ?? "");
      break;
    }
    case "label_image":
      a.labels = (ex.labels ?? []).map((l) => a.labels?.find((x) => x.labelId === l.id) ?? { labelId: l.id, text: "" });
      break;
    case "table_completion":
      if (ex.table) {
        const cells: NonNullable<AssessmentAnswer["cells"]> = [];
        ex.table.rows.forEach((r, i) => r.forEach((cell, j) => {
          if (isBlankCell(cell)) cells.push({ row: i, col: j, text: a.cells?.find((c) => c.row === i && c.col === j)?.text ?? "" });
        }));
        a.cells = cells;
      }
      break;
    case "classify": {
      const cats = new Set((ex.categories ?? []).map((c) => c.id));
      const seen = new Set<string>();
      a.classes = (a.classes ?? []).filter((c) => ids.has(c.optionId) && cats.has(c.categoryId) && !seen.has(c.optionId) && seen.add(c.optionId));
      break;
    }
  }
  return { ...ex, answer: a };
}

/** fill_gaps answers may be a word or (older documents) a word-bank option id. */
export const gapText = (ex: AssessmentExercise, gap: string) =>
  ex.options?.find((o) => o.id === gap)?.text ?? gap;

export const optionLetter = (i: number) => String.fromCharCode(65 + i);

export function exerciseNumbers(doc: AssessmentDocument): Map<string, number> {
  const map = new Map<string, number>();
  let n = 0;
  for (const s of doc.sections) for (const i of s.items) if (i.kind === "exercise") map.set(i.id, ++n);
  return map;
}

export function allExercises(doc: AssessmentDocument): AssessmentExercise[] {
  return doc.sections.flatMap((s) => s.items.filter((i): i is AssessmentExercise => i.kind === "exercise"));
}

export type MissingAnswer = "answer" | "correct" | "truth" | "pairs" | "order" | "gaps" | "options" | "labels" | "image" | "pins" | "words"
  | "blanks" | "cells" | "categories" | "classes";

/** What the teacher still has to fill in (manual saves allow it; the answer key would be incomplete). */
export function missingAnswer(ex: AssessmentExercise): MissingAnswer | null {
  const a = ex.answer;
  switch (ex.type) {
    case "multiple_choice":
      return (ex.options ?? []).length < 2 ? "options" : a.optionIds?.length ? null : "correct";
    case "true_false":
      return a.truth?.length ? null : "truth";
    case "matching":
      return a.pairs?.length ? null : "pairs";
    case "ordering":
      return a.order?.length ? null : "order";
    case "fill_gaps":
      return a.gaps && a.gaps.every((g) => g.trim()) ? null : "gaps";
    case "wordsearch":
      return gridWords(ex.words).length < 3 ? "words" : null;
    case "label_image":
      if (!ex.labels?.length) return "labels";
      // A placeholder whose image never resolved prints nothing: the picture is still missing.
      if (!ex.media?.imageRef) return "image";
      if (!ex.labels.every((l) => a.labels?.find((x) => x.labelId === l.id)?.text.trim())) return "answer";
      return ex.labels.some((l) => l.x === null || l.y === null) ? "pins" : null;
    case "table_completion": {
      if (!ex.table) break;
      const blanks = ex.table.rows.flatMap((r, i) => r.map((cell, j) => (isBlankCell(cell) ? [i, j] : null))).filter((x) => x !== null);
      if (!blanks.length) return "blanks";
      return blanks.every(([i, j]) => cellAnswer(ex, i, j).trim()) ? null : "cells";
    }
    case "classify": {
      if (!ex.categories) break;
      if (ex.categories.length < 2) return "categories";
      if ((ex.options ?? []).length < 2) return "options";
      return (ex.options ?? []).every((o) => a.classes?.some((c) => c.optionId === o.id)) ? null : "classes";
    }
  }
  // Open types, and tables / classify stored before they had a structure.
  return a.text?.trim() ? null : "answer";
}
