import type { SectionChange } from "@/shared/types/document-suggestions";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyPayload,
  diffSegments,
  stripSectionHeading,
  TITLE_KEY,
  withoutSectionHeadings,
  initialSelection,
  isLongText,
  pollUntilDone,
  reviewableChanges,
  selectedCount,
  toggleAll,
  toggleSection,
  toReadableText,
  unchangedCount,
} from "./suggestion-review";

function change(over: Partial<SectionChange> & Pick<SectionChange, "key" | "type" | "position">): SectionChange {
  return { title: over.key, before: null, after: null, ...over };
}

const CHANGES: SectionChange[] = [
  change({ key: "c", type: "changed", position: 2, before: "a", after: "b" }),
  change({ key: "u", type: "unchanged", position: 1 }),
  change({ key: "n", type: "added", position: 3, after: "novo" }),
  change({ key: "r", type: "removed", position: 0, before: "velho" }),
];

describe("diffSegments", () => {
  it("marks inserted words as added and removed words as removed", () => {
    const segments = diffSegments("A aula corre bem", "A aula correu muito bem");

    const added = segments.filter((s) => s.added).map((s) => s.value).join("");
    expect(added).toContain("correu");
    expect(added).toContain("muito");
    expect(segments.filter((s) => s.removed).map((s) => s.value.trim())).toEqual(["corre"]);
    expect(segments.filter((s) => !s.added && !s.removed).map((s) => s.value).join("")).toContain("A aula");
  });

  it("treats a new section as all added and a removed one as all removed", () => {
    expect(diffSegments(null, "Texto novo").every((s) => s.added)).toBe(true);
    expect(diffSegments("Texto antigo", null).every((s) => s.removed)).toBe(true);
  });

  it("strips heading hashes and bold markers before diffing", () => {
    expect(toReadableText("## Objetivos\n\n**Importante**: rever")).toBe("Objetivos\n\nImportante: rever");
  });
});

describe("selection and apply payload", () => {
  it("starts with every reviewable section selected, in document order, without unchanged ones", () => {
    const selection = initialSelection(CHANGES);

    expect([...selection]).toEqual(["r", "c", "n"]);
    expect(reviewableChanges(CHANGES).map((c) => c.key)).toEqual(["r", "c", "n"]);
    expect(unchangedCount(CHANGES)).toBe(1);
  });

  it("sends null when every reviewable section is selected", () => {
    expect(applyPayload(CHANGES, initialSelection(CHANGES))).toBeNull();
  });

  it("sends the selected keys when some are left out", () => {
    const selection = toggleSection(initialSelection(CHANGES), "c");

    expect(applyPayload(CHANGES, selection)).toEqual(["r", "n"]);
    expect(selectedCount(CHANGES, selection)).toBe(2);
  });

  it("select-all clears the selection when everything is already selected, and selects all otherwise", () => {
    const all = initialSelection(CHANGES);
    expect(toggleAll(CHANGES, all).size).toBe(0);
    expect(toggleAll(CHANGES, new Set()).size).toBe(3);
  });

  it("never selects an unchanged section", () => {
    expect(toggleAll(CHANGES, new Set()).has("u")).toBe(false);
  });
});

describe("long sections", () => {
  it("clamps only when there are more lines than the clamp", () => {
    expect(isLongText(Array.from({ length: 12 }, () => "x").join("\n"))).toBe(false);
    expect(isLongText(Array.from({ length: 13 }, () => "x").join("\n"))).toBe(true);
  });
});

describe("pollUntilDone", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("checks every 5 seconds and stops once the check resolves true", async () => {
    const check = vi.fn<() => Promise<boolean>>().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    pollUntilDone({ check });

    await vi.advanceTimersByTimeAsync(5000);
    expect(check).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5000);
    expect(check).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(60000);
    expect(check).toHaveBeenCalledTimes(2);
  });

  it("stops polling when the returned stop function is called (unmount)", async () => {
    const check = vi.fn<() => Promise<boolean>>().mockResolvedValue(false);
    const stop = pollUntilDone({ check });

    await vi.advanceTimersByTimeAsync(5000);
    expect(check).toHaveBeenCalledTimes(1);
    stop();
    await vi.advanceTimersByTimeAsync(30000);
    expect(check).toHaveBeenCalledTimes(1);
  });

  it("keeps polling after a failed check", async () => {
    const check = vi.fn<() => Promise<boolean>>().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(true);
    pollUntilDone({ check });

    await vi.advanceTimersByTimeAsync(5000);
    await vi.advanceTimersByTimeAsync(5000);
    expect(check).toHaveBeenCalledTimes(2);
  });
});

describe("stripSectionHeading", () => {
  it("drops the first line when it is a heading with the section title", () => {
    expect(stripSectionHeading("# 1. Identificação\n\nO texto da secção.", "1. Identificação")).toBe(
      "O texto da secção.",
    );
  });

  it("matches the title ignoring heading level, bold markers and case", () => {
    expect(stripSectionHeading("## **Objetivos**\nAlunos.", "objetivos")).toBe("Alunos.");
  });

  it("keeps the text when the first line is different from the title", () => {
    const text = "# Outra coisa\nTexto.";
    expect(stripSectionHeading(text, "Objetivos")).toBe(text);
  });

  it("only looks at the first non-empty line", () => {
    const text = "Texto.\n# Objetivos\nMais.";
    expect(stripSectionHeading(text, "Objetivos")).toBe(text);
  });

  it("returns null for a missing side", () => {
    expect(stripSectionHeading(null, "Objetivos")).toBeNull();
  });
});

describe("withoutSectionHeadings", () => {
  it("strips the repeated heading from both sides of a markdown change", () => {
    const [change] = withoutSectionHeadings([
      { key: "k", type: "changed", title: "Objetivos", before: "# Objetivos\nAntes.", after: "# Objetivos\nDepois.", position: 1 },
    ]);
    expect(change.before).toBe("Antes.");
    expect(change.after).toBe("Depois.");
  });

  it("leaves the title row untouched", () => {
    const [change] = withoutSectionHeadings([
      { key: TITLE_KEY, type: "changed", title: null, before: "Plano", after: "Plano novo", position: 0 },
    ]);
    expect(change.before).toBe("Plano");
    expect(change.after).toBe("Plano novo");
  });
});

describe("title pseudo change", () => {
  const TITLE: SectionChange = { key: TITLE_KEY, type: "changed", title: null, before: "Plano", after: "Plano novo", position: 3 };

  it("is listed first and selected by default", () => {
    const changes = [CHANGES[0], TITLE];
    expect(reviewableChanges(changes).map((c) => c.key)).toEqual([TITLE_KEY, "c"]);
    expect(initialSelection(changes).has(TITLE_KEY)).toBe(true);
  });

  it("is included in the apply payload when selected, first in document order", () => {
    const changes = [CHANGES[0], CHANGES[2], TITLE];
    expect(applyPayload(changes, new Set([TITLE_KEY]))).toEqual([TITLE_KEY]);
    expect(applyPayload(changes, new Set([TITLE_KEY, "n"]))).toEqual([TITLE_KEY, "n"]);
    expect(applyPayload(changes, initialSelection(changes))).toBeNull();
  });
});
