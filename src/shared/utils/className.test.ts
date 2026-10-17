import { describe, expect, it } from "vitest";
import { formatClassName } from "./className";

const labels = {
  gradeShort: (grade: number) => `${grade}.º`,
  subject: (value: string) => (value === "Mathematics" ? "Matemática" : value),
};

describe("formatClassName", () => {
  it("reads like the calendar: year, subject and class label", () => {
    expect(formatClassName({ gradeLevel: 2, subject: "Mathematics", classLabel: "2.º A" }, labels)).toBe(
      "2.º Matemática · 2.º A",
    );
  });

  it("drops the parts a turma doesn't have", () => {
    expect(formatClassName({ gradeLevel: 2, subject: "Mathematics", classLabel: "" }, labels)).toBe("2.º Matemática");
    expect(formatClassName({ subject: "Mathematics" }, labels)).toBe("Matemática");
  });

  it("falls back to the title when there is no subject", () => {
    expect(formatClassName({ title: "Clube de Ciência" }, labels)).toBe("Clube de Ciência");
  });
});
