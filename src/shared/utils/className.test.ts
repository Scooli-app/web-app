import { describe, expect, it } from "vitest";
import { formatClassName, sameClassWords } from "./className";

const labels = {
  gradeShort: (grade: number) => `${grade}.º`,
  subject: (value: string) => (value === "Mathematics" ? "Matemática" : value),
};

describe("formatClassName", () => {
  it("reads like the calendar: year, subject and class label", () => {
    expect(formatClassName({ gradeLevel: 2, subject: "Mathematics", classLabel: "A" }, labels)).toBe("2.º Matemática · A");
  });

  it("says the year once when the class label already has it (audit: \"7.º Matemática · 7.º B\")", () => {
    expect(formatClassName({ gradeLevel: 2, subject: "Mathematics", classLabel: "2.º A" }, labels)).toBe("Matemática · 2.º A");
    expect(formatClassName({ gradeLevel: 2, subject: "Mathematics", classLabel: "2.ºA" }, labels)).toBe("Matemática · 2.ºA");
  });

  it("drops the parts a turma doesn't have", () => {
    expect(formatClassName({ gradeLevel: 2, subject: "Mathematics", classLabel: "" }, labels)).toBe("2.º Matemática");
    expect(formatClassName({ subject: "Mathematics" }, labels)).toBe("Matemática");
  });

  it("falls back to the title when there is no subject", () => {
    expect(formatClassName({ title: "Clube de Ciência" }, labels)).toBe("Clube de Ciência");
  });
});

describe("sameClassWords", () => {
  it("treats a reordered name as the same (audit: \"6.º Português · C\" over \"6.º C Português\")", () => {
    expect(sameClassWords("6.º C Português", "6.º Português · C")).toBe(true);
    expect(sameClassWords("Clube de Ciência", "6.º Ciências · C")).toBe(false);
  });
});
