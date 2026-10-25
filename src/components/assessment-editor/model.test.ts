import { describe, expect, it } from "vitest";
import {
  addCategory, addLabel, addOption, addTableColumn, addTableRow, adoptGrids, adoptStudentOrder, boxedGap, cellAnswer, changeType, classifyItem, countBlanks, gridLetters,
  gridStale, gridWords, hasTextAnswer, isBlankCell, listedWords, missingAnswer, newExercise, parseAssessment, placedCells, removeCategory,
  removeLabel, removeOption, removeTableColumn, removeTableRow, setTableCell, skippedWordIndexes, splitBlanks, syncAnswer, toggleBlank, withEmptyCategories, withEmptyTable, withImage,
} from "./model";

const doc = parseAssessment(JSON.stringify({
  schemaVersion: 1, documentType: "test", title: "T", header: null, targetTotal: 100,
  sections: [{ id: "g1", title: "Grupo I", items: [
    { kind: "exercise", id: "e1", type: "multiple_choice", prompt: "?", options: [{ id: "a", text: "x" }, { id: "b", text: "y" }], answer: { optionIds: ["b"] }, points: 10 },
  ] }],
})) as NonNullable<ReturnType<typeof parseAssessment>>;

describe("assessment model", () => {
  it("fills missing fields when parsing", () => {
    const e = doc.sections[0].items[0];
    expect(doc.header.showFields).toEqual([]);
    expect(e.kind === "exercise" && e.answer.truth).toBeNull();
  });

  it("new exercise gets the next id, 0 points under a target, and lines only when written", () => {
    const e = newExercise(doc, "multiple_choice");
    expect(e.id).toBe("e2");
    expect(e.points).toBe(0);
    expect(e.answerSpace).toEqual({ kind: "none", count: null });
    expect(e.answer.optionIds).toEqual(["a"]);
    expect(newExercise(doc, "short_answer").answerSpace).toEqual({ kind: "lines", count: 3 });
  });

  it("keeps MC with a correct option when the correct one is removed", () => {
    const e = doc.sections[0].items[0];
    if (e.kind !== "exercise") throw new Error();
    expect(removeOption(e, "b").answer.optionIds).toEqual(["a"]);
  });

  it("syncs true_false, ordering and fill_gaps answers with their content", () => {
    const e = doc.sections[0].items[0];
    if (e.kind !== "exercise") throw new Error();
    const tf = addOption(changeType(e, "true_false"));
    expect(tf.answer.truth?.map((t) => t.statementId)).toEqual((tf.options ?? []).map((o) => o.id));
    const ord = changeType(e, "ordering");
    expect(ord.answer.order).toEqual((ord.options ?? []).map((o) => o.id));
    const gaps = syncAnswer({ ...changeType(e, "fill_gaps"), prompt: "A ___ e o ___." });
    expect(gaps.answer.gaps).toEqual(["", ""]);
  });

  it("drops matching pairs whose items were removed", () => {
    const e = doc.sections[0].items[0];
    if (e.kind !== "exercise") throw new Error();
    const m = removeOption(changeType(e, "matching"), "r1");
    expect(m.answer.pairs).toEqual([["l2", "r2"]]);
  });

  it("counts one blank per run of three or more underscores, like the server", () => {
    expect(countBlanks("O ______ bombeia.")).toBe(1);
    expect(countBlanks("O ___ e ______.")).toBe(2);
  });

  it("keeps a blank inside maths in its formula, numbered with the others", () => {
    const { parts, gaps } = splitBlanks("O ___ de $\\frac{1}{2} = \\frac{___}{4}$ e ___.", (gap) => `[${gap}]`);
    expect(parts).toEqual(["O ", " de $\\frac{1}{2} = \\frac{[1]}{4}$ e ", "."]);
    expect(gaps).toEqual([0, 2]);
    expect(boxedGap("3")).toBe("\\boxed{\\text{3}}");
    expect(boxedGap("$\\frac{1}{2}$")).toBe("\\boxed{\\frac{1}{2}}");
    expect(boxedGap(" ")).toBe("\\square");
  });
  it("label_image keeps one answer per target and renumbers after a removal", () => {
    const e = doc.sections[0].items[0];
    if (e.kind !== "exercise") throw new Error();
    const li = addLabel(changeType(e, "label_image"));
    expect(li.labels?.map((l) => l.n)).toEqual([1, 2, 3, 4]);
    expect(li.answer.labels?.map((a) => a.labelId)).toEqual(li.labels?.map((l) => l.id));
    expect(missingAnswer(li)).toBe("image");
    const removed = removeLabel(li, "l2");
    expect(removed.labels?.map((l) => [l.id, l.n])).toEqual([["l1", 1], ["l3", 2], ["l4", 3]]);
    expect(removed.answer.labels?.map((a) => a.labelId)).toEqual(["l1", "l3", "l4"]);
    expect(changeType(removed, "short_answer").labels).toBeNull();
  });
  it("label_image flags a missing picture, unresolved placeholder and unplaced pins", () => {
    const e = doc.sections[0].items[0];
    if (e.kind !== "exercise") throw new Error();
    const base = changeType(e, "label_image");
    const answered = { ...base, answer: { ...base.answer, labels: (base.labels ?? []).map((l) => ({ labelId: l.id, text: "x" })) } };
    expect(missingAnswer({ ...answered, media: { imageRef: null, placeholder: { query: "Diagrama do coração", alt: "Coração" } } })).toBe("image");
    const pictured = withImage(answered, "https://img/1");
    expect(missingAnswer(pictured)).toBe("pins");
    const placed = { ...pictured, labels: (pictured.labels ?? []).map((l) => ({ ...l, x: 0.5, y: 0.5 })) };
    expect(missingAnswer(placed)).toBeNull();
    // a new picture clears the pins; the same one keeps them
    expect(withImage(placed, "https://img/1").labels?.[0].x).toBe(0.5);
    expect(withImage(placed, "https://img/2").labels?.every((l) => l.x === null && l.y === null)).toBe(true);
  });

  it("word search: folds accents for the grid and keeps the list words", () => {
    expect(gridLetters("Esófago")).toBe("ESOFAGO");
    expect(gridLetters("intestino delgado")).toBe("INTESTINODELGADO");
    expect(gridWords(["boca", "Boca", "a", "coração", "otorrinolaringologista"])).toEqual(["BOCA", "CORACAO"]);
    const e = changeType(newExercise(doc, "short_answer"), "wordsearch");
    expect(e.words).toEqual(["", "", ""]);
    expect(e.options).toBeNull();
    expect(missingAnswer(e)).toBe("words");
    expect(missingAnswer({ ...e, words: ["boca", "dente", "língua"] })).toBeNull();
  });

  it("word search: the grid is stale until the save returns the rebuilt one", () => {
    const grid = { size: 10, rows: Array(10).fill("ABCDEFGHIJ"), placements: [
      { word: "BOCA", row: 0, col: 0, dir: "right" as const }, { word: "DENTE", row: 0, col: 9, dir: "down" as const },
    ] };
    const e = { ...changeType(newExercise(doc, "short_answer"), "wordsearch"), words: ["boca", "dente"], grid };
    expect(gridStale(e)).toBe(false);
    expect([...placedCells(e)]).toEqual(["0:0", "0:1", "0:2", "0:3", "0:9", "1:9", "2:9", "3:9", "4:9"]);
    const edited = { ...e, words: ["boca", "dente", "língua"] };
    expect(gridStale(edited)).toBe(true);

    const local = { ...doc, sections: [{ ...doc.sections[0], items: [edited] }] };
    const rebuilt = { ...grid, placements: [...grid.placements, { word: "LINGUA", row: 5, col: 0, dir: "right" as const }] };
    const saved = { ...local, sections: [{ ...local.sections[0], items: [{ ...edited, grid: rebuilt }] }] };
    const merged = adoptGrids(local, saved);
    const item = merged.sections[0].items[0];
    expect(item.kind === "exercise" && item.grid).toEqual(rebuilt);
    expect(item.kind === "exercise" && gridStale(item)).toBe(false);
    expect(adoptGrids(merged, saved)).toBe(merged);
    // words edited again while the save was on its way: keep them, the next save rebuilds
    const typing = { ...local, sections: [{ ...local.sections[0], items: [{ ...edited, words: ["boca"] }] }] };
    expect(adoptGrids(typing, saved)).toBe(typing);
  });

  it("after a save: takes the shuffled student order of a hand-written matching, except while it is open", () => {
    const typed = { ...changeType(newExercise(doc, "short_answer"), "matching"), id: "m1" };
    const named = { ...typed, options: (typed.options ?? []).map((o, i) => ({ ...o, text: `t${i}` })) };
    const local = { ...doc, sections: [{ ...doc.sections[0], items: [named] }] };
    const [l1, l2, r1, r2] = named.options;
    const saved = { ...local, sections: [{ ...local.sections[0], items: [{ ...named, options: [l1, l2, r2, r1] }] }] };

    // open in the editor: the fields stay where the teacher is typing
    expect(adoptStudentOrder(local, saved, "m1")).toBe(local);
    // closed: the screen shows the order that prints, and nothing else changes
    const adopted = adoptStudentOrder(local, saved, null);
    const item = adopted.sections[0].items[0];
    expect(item.kind === "exercise" && item.options?.map((o) => o.id)).toEqual(["l1", "l2", "r2", "r1"]);
    expect(item.kind === "exercise" && item.answer).toEqual(named.answer);
    expect(adoptStudentOrder(adopted, saved, null)).toBe(adopted);
    // typed again since the save (a text or an option changed): the next save's answer decides
    const retyped = { ...local, sections: [{ ...local.sections[0], items: [{ ...named, options: [l1, l2, { ...r1, text: "novo" }, r2] }] }] };
    expect(adoptStudentOrder(retyped, saved, null)).toBe(retyped);
    expect(adoptStudentOrder(local, null, null)).toBe(local);
  });

  it("word search: the listed words are the placed ones; skipped words are flagged", () => {
    const words = ["boca", "Boca", "a", " ", "dente"];
    expect([...skippedWordIndexes(words)]).toEqual([1, 2]);
    const grid = { size: 10, rows: Array(10).fill("ABCDEFGHIJ"), placements: [
      { word: "BOCA", row: 0, col: 0, dir: "right" as const }, { word: "DENTE", row: 0, col: 9, dir: "down" as const },
    ] };
    const e = { ...changeType(newExercise(doc, "short_answer"), "wordsearch"), words, grid };
    expect(listedWords(e)).toEqual(["boca", "dente"]);
    // stale: what the next save will place
    expect(listedWords({ ...e, words: [...words, "língua"] })).toEqual(["boca", "dente", "língua"]);
  });

  it("table: blanks keep their answers through row and column edits", () => {
    let e = changeType(newExercise(doc, "short_answer"), "table_completion");
    expect(e.table).toEqual({ headers: ["", ""], rows: [["", "___"], ["", "___"]] });
    expect(e.answerSpace.kind).toBe("none"); // filled in place, no answer lines
    expect(newExercise(doc, "table_completion").answerSpace.kind).toBe("none");
    expect(missingAnswer(e)).toBe("cells");
    e = setTableCell(e, 0, 0, "Gato");
    e = toggleBlank(e, 0, 0); // "Gato" becomes the answer of the new blank
    expect(e.table?.rows[0][0]).toBe("___");
    expect(cellAnswer(e, 0, 0)).toBe("Gato");
    e = syncAnswer({ ...e, answer: { ...e.answer, cells: (e.answer.cells ?? []).map((c) => ({ ...c, text: c.text || `r${c.row}c${c.col}` })) } });
    expect(missingAnswer(e)).toBeNull();
    e = removeTableRow(addTableRow(e), 0);
    expect(e.table?.rows).toEqual([["", "___"], ["", ""]]);
    expect(e.answer.cells).toEqual([{ row: 0, col: 1, text: "r1c1" }]);
    e = removeTableColumn(addTableColumn(e), 0);
    expect(e.table?.headers).toHaveLength(2);
    expect(e.answer.cells).toEqual([{ row: 0, col: 0, text: "r1c1" }]);
    e = toggleBlank(e, 0, 0); // back to a normal cell holding the answer
    expect(e.table?.rows[0][0]).toBe("r1c1");
    expect(e.answer.cells).toEqual([]);
    expect(missingAnswer(e)).toBe("blanks");
    expect(isBlankCell(" ____ ")).toBe(true);
    expect(isBlankCell("_a_")).toBe(false);
    expect(hasTextAnswer(e)).toBe(false);
    expect(hasTextAnswer({ ...e, table: null })).toBe(true);
    // a table started on a pre-structure exercise is filled in place: no answer lines
    const legacy = { ...e, table: null, answerSpace: { kind: "lines" as const, count: 3 } };
    expect(withEmptyTable(legacy).answerSpace.kind).toBe("none");
    expect(withEmptyCategories({ ...legacy, type: "classify" as const }).answerSpace.kind).toBe("none");
  });

  it("classify: one box per item, cleaned when items or boxes go", () => {
    let e = changeType(newExercise(doc, "short_answer"), "classify");
    expect(e.categories).toHaveLength(2);
    expect(e.options).toHaveLength(4);
    expect(missingAnswer(e)).toBe("classes");
    for (const [i, o] of (e.options ?? []).entries()) e = classifyItem(e, o.id, i % 2 ? "c2" : "c1");
    expect(missingAnswer(e)).toBeNull();
    e = classifyItem(e, "o1", "c2");
    expect(e.answer.classes?.filter((c) => c.optionId === "o1")).toEqual([{ optionId: "o1", categoryId: "c2" }]);
    e = removeOption(e, "o2");
    expect(e.answer.classes?.map((c) => c.optionId)).not.toContain("o2");
    e = removeCategory(addCategory(e), "c1");
    expect(e.categories?.map((c) => c.id)).toEqual(["c2", "c3"]);
    expect(e.answer.classes?.every((c) => c.categoryId === "c2")).toBe(true);
    expect(missingAnswer(e)).toBe("classes"); // o3 was in c1
    expect(missingAnswer({ ...e, categories: [{ id: "c2", label: "" }] })).toBe("categories");
  });
});
