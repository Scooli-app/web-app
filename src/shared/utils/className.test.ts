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
    expect(formatClassName({ gradeLevel: 7, subject: "Mathematics", classLabel: "7ºB" }, labels)).toBe("Matemática · 7ºB");
    expect(formatClassName({ gradeLevel: 7, subject: "Mathematics", classLabel: "7B" }, labels)).toBe("Matemática · 7B");
    // Another number is not the year: "10" in year 1, "1" in year 7.
    expect(formatClassName({ gradeLevel: 1, subject: "Mathematics", classLabel: "10" }, labels)).toBe("1.º Matemática · 10");
    expect(formatClassName({ gradeLevel: 7, subject: "Mathematics", classLabel: "1" }, labels)).toBe("7.º Matemática · 1");
  });

  it("matches the shown number, so a Brazilian 1ª série (year 10) class \"1A\" says it once", () => {
    const br = { ...labels, gradeShort: (grade: number) => (grade >= 10 ? `${grade - 9}ª série` : `${grade}º`) };
    expect(formatClassName({ gradeLevel: 10, subject: "Mathematics", classLabel: "1A" }, br)).toBe("Matemática · 1A");
    expect(formatClassName({ gradeLevel: 10, subject: "Mathematics", classLabel: "B" }, br)).toBe("1ª série Matemática · B");
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
