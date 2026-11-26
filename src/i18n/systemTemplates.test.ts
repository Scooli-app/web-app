import { describe, expect, it } from "vitest";
import type { DocumentTemplate } from "@/shared/types";
import { STORED_SYSTEM_TEMPLATE_TEXTS, localizeSystemTemplate } from "./systemTemplates";

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
    expect(localizeSystemTemplate(own, "pt-BR")).toBe(own);
  });

  it("writes a system template the Brazilian way", () => {
    const worksheet: DocumentTemplate = {
      ...template,
      name: "Ficha com Registo e Reflexão",
      sections: [
        { id: "s1", title: "Registo  Final", description: "Conteúdos para estudo autónomo antes da aula", order: 0 },
        { id: "s2", title: "Desenvolvimento", description: "", order: 1 },
      ],
    };
    const localized = localizeSystemTemplate(worksheet, "pt-BR");

    expect(localized.name).toBe("Lista com Registro e Reflexão");
    expect(localized.sections.map((section) => section.title)).toEqual([
      "Registro Final",
      "Desenvolvimento",
    ]);
    expect(localized.sections[0].description).toBe("Conteúdos para estudo autônomo antes da aula");
  });

  it("leaves no European Portuguese term in any system template text for pt-BR", () => {
    const EUROPEAN =
      /(?<![A-Za-zÀ-ÿ])(fichas?|registos?|testes?|sec[çc][ãa]o|aut[óo]nomo|gerir|recolha|partilha|enquadramento|cota[çc][õo]es|fecho|NEE|numa|pistas|clarifica[çc][ãa]o|escolha m[úu]ltipla|ponto de situa[çc][ãa]o|intermédio|Aprendizagens Essenciais)(?![A-Za-zÀ-ÿ])|\d\.[ºo]/i;
    const offenders = STORED_SYSTEM_TEMPLATE_TEXTS.map((text) => {
      const localized = localizeSystemTemplate({ ...template, name: text }, "pt-BR").name;
      return EUROPEAN.test(localized) ? `${text} -> ${localized}` : null;
    }).filter(Boolean);
    expect(offenders).toEqual([]);
  });
});
