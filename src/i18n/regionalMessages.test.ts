import { describe, expect, it } from "vitest";
import ptBR from "../../messages/pt-BR.json";
import ptPT from "../../messages/pt-PT.json";
import { mergeCatalogues } from "./regionalMessages";

function leaves(node: unknown, path = "", out = new Map<string, string>()) {
  if (typeof node === "string") {
    out.set(path, node);
    return out;
  }
  if (typeof node !== "object" || node === null) return out;
  for (const [key, value] of Object.entries(node)) {
    leaves(value, path ? `${path}.${key}` : key, out);
  }
  return out;
}

/** Simple ICU argument names (`{count}`, `{count, plural, ...}`), not the text inside branches. */
function argumentNames(text: string): string[] {
  // Unique names: a Brazilian `select` may use an argument twice ("{grade, select, … other {{grade}º ano}}").
  return [...new Set([...text.matchAll(/\{\s*([A-Za-z_][\w]*)\s*[,}]/g)].map((match) => match[1]))].sort();
}

describe("mergeCatalogues", () => {
  it("keeps base keys the overlay lacks and ignores shape mismatches", () => {
    const merged = mergeCatalogues(
      { a: { b: "base b", c: "base c" }, d: "base d" },
      { a: { b: "overlay b" }, d: { nested: "wrong shape" } },
    );
    expect(merged).toEqual({ a: { b: "overlay b", c: "base c" }, d: "base d" });
  });

  it("replaces arrays whole instead of turning them into objects", () => {
    const merged = mergeCatalogues(
      { list: [{ label: "a" }, { label: "b" }] },
      { list: [{ label: "x" }] },
    );
    expect(merged).toEqual({ list: [{ label: "x" }] });
    expect(Array.isArray(merged.list)).toBe(true);
  });
});

describe("pt-BR catalogue", () => {
  const base = leaves(ptPT);
  const overlay = leaves(ptBR);

  it("only has keys that exist in pt-PT", () => {
    const unknown = [...overlay.keys()].filter((key) => !base.has(key));
    expect(unknown).toEqual([]);
  });

  it("covers every pt-PT key", () => {
    const missing = [...base.keys()].filter((key) => !overlay.has(key));
    expect(missing).toEqual([]);
  });

  it("keeps the same ICU arguments as pt-PT", () => {
    const mismatched = [...overlay.entries()]
      .filter(([key, text]) => {
        const original = base.get(key);
        return (
          original !== undefined &&
          argumentNames(original).join() !== argumentNames(text).join()
        );
      })
      .map(([key]) => key);
    expect(mismatched).toEqual([]);
  });

  it("uses Brazilian words, not the European ones", () => {
    const EUROPEAN =
      /(?<![A-Za-zÀ-ÿ])(ficheiros?|ecrãs?|utilizador(es)?|partilhar|telemóve(l|is)|palavra-passe|equipas?|contactos?|registos?|por preparar|a acompanhar|Aprendizagens Essenciais|objetivos das AE)(?![A-Za-zÀ-ÿ])/i;
    // Controls only shown to Portuguese teachers may name the Portuguese curriculum.
    const PT_ONLY = new Set(["documentCreation.sourcePicker.includeAe"]);
    const offenders = [...overlay.entries()]
      .filter(([key, text]) => !PT_ONLY.has(key) && EUROPEAN.test(text))
      .map(([key, text]) => `${key} = ${text}`);
    expect(offenders).toEqual([]);
  });

  it("names the BR curriculum goals after the BNCC", () => {
    // The pt-PT footer says "sem objetivos das AE" (Portuguese curriculum).
    expect(overlay.get("assessmentEditor.totals.goals")).toContain("BNCC");
  });
});
