import type { SectionChange } from "@/shared/types/document-suggestions";
import { describe, expect, it } from "vitest";
import { assessmentChanges } from "./assessment-review";

const mc = (id: string, prompt: string, points: number) =>
  JSON.stringify({
    id, kind: "exercise", type: "multiple_choice", prompt, points,
    options: [{ id: "a", text: "Sim", side: null }, { id: "b", text: "Não", side: null }],
    answer: { optionIds: ["a"] }, answerSpace: { kind: "none", count: null },
  });

let position = 0;
const change = (key: string, type: SectionChange["type"], before: string | null, after: string | null): SectionChange =>
  ({ key, type, title: null, before, after, position: position++ });

describe("assessmentChanges", () => {
  const meta = (total: number, duration: number) =>
    JSON.stringify({ documentType: "test", title: null, targetTotal: total, header: { duration, school: null, gradeClass: null } });
  const changes: SectionChange[] = [
    change("_meta", "changed", meta(100, 45), meta(100, 50)),
    change("group:g1", "changed", JSON.stringify({ id: "g1", title: "Grupo I", instructions: null }),
      JSON.stringify({ id: "g1", title: "Grupo I", instructions: "Lê com atenção." })),
    change("e1", "unchanged", mc("e1", "Um?", 20), mc("e1", "Um?", 20)),
    change("e2", "changed", mc("e2", "Dois?", 40), mc("e2", "Dois?", 30)),
    change("e3", "removed", mc("e3", "Três?", 40), null),
    change("r1", "added", null, JSON.stringify({ id: "r1", kind: "reading", title: "Texto", body: "Era uma vez." })),
    change("e4", "added", null, mc("e4", "Quatro?", 10)),
    change("e5", "changed", mc("e5", "Cinco?", 10), mc("e5", "Cinco, revisto?", 10)),
  ];

  it("lists only reviewable changes, in order, numbered as in the suggested version", () => {
    const views = assessmentChanges(changes);
    expect(views.map((v) => v.change.key)).toEqual(["_meta", "group:g1", "e2", "e3", "r1", "e4", "e5"]);
    const numberOf = (key: string) => {
      const v = views.find((x) => x.change.key === key);
      return v?.kind === "item" ? v.number : undefined;
    };
    expect(numberOf("e2")).toBe(2);
    expect(numberOf("e3")).toBe(3); // its number in the current version
    expect(numberOf("r1")).toBeNull(); // reading boxes are not numbered
    expect(numberOf("e4")).toBe(3); // e3 is gone in the suggestion
    expect(numberOf("e5")).toBe(4);
  });

  it("tells points-only rebalances from real edits and parses both sides", () => {
    const views = assessmentChanges(changes);
    const e2 = views.find((v) => v.change.key === "e2");
    const e5 = views.find((v) => v.change.key === "e5");
    const e4 = views.find((v) => v.change.key === "e4");
    expect(e2?.kind === "item" && e2.parts).toEqual(["points"]);
    expect(e5?.kind === "item" && e5.parts).toEqual(["prompt"]);
    expect(e4?.kind === "item" && e4.before === null && e4.after?.kind === "exercise" && e4.after.answer.text).toBeNull();
  });

  it("reports the settings and group fields that changed", () => {
    const views = assessmentChanges(changes);
    const settings = views.find((v) => v.kind === "settings");
    const group = views.find((v) => v.kind === "group");
    expect(settings?.kind === "settings" && settings.fields).toEqual([{ field: "duration", before: "45", after: "50" }]);
    expect(group?.kind === "group" && group.fields).toEqual([{ field: "instructions", before: null, after: "Lê com atenção." }]);
  });

  it("keeps an unreadable body as null instead of throwing", () => {
    const views = assessmentChanges([change("e9", "changed", "{oops", mc("e9", "Nove?", 5))]);
    expect(views[0].kind === "item" && views[0].before).toBeNull();
  });
});
