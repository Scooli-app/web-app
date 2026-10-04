import { describe, expect, it } from "vitest";
import type { DocumentTemplate } from "@/shared/types";
import { localizeSystemTemplate } from "./systemTemplates";

const template: DocumentTemplate = {
  id: "t",
  name: "Plano de Aula Tradicional",
  description:
    "Estrutura tradicional de plano de aula com foco em objetivos, desenvolvimento e avaliação",
  documentType: "lessonPlan",
  isDefault: true,
  isSystem: true,
  createdAt: "",
  updatedAt: "",
  sections: [
    // Stored with a double space in the seed data.
    { id: "s1", title: "Questões  de Resposta Curta", description: "Afirmações  para validar", order: 0 },
    { id: "s2", title: "Secção do professor", description: "", order: 1 },
  ],
};

describe("localizeSystemTemplate", () => {
  it("translates a system template for English", () => {
    const localized = localizeSystemTemplate(template, "en");

    expect(localized.name).toBe("Traditional Lesson Plan");
    expect(localized.description).toBe(
      "Traditional lesson plan structure focused on objectives, development and assessment",
    );
    expect(localized.sections.map((section) => section.title)).toEqual([
      "Short-Answer Questions",
      "Secção do professor",
    ]);
    expect(localized.sections[0].description).toBe("Statements to check");
  });

  it("leaves Portuguese untouched", () => {
    expect(localizeSystemTemplate(template, "pt-PT")).toBe(template);
    expect(localizeSystemTemplate(template, null)).toBe(template);
  });

  it("leaves a teacher's own template untouched", () => {
    const own = { ...template, isSystem: false };
    expect(localizeSystemTemplate(own, "en")).toBe(own);
  });
});
