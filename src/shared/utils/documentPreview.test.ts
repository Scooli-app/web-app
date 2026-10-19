import { describe, expect, it } from "vitest";
import { getDocumentPreview } from "./documentPreview";

const LESSON_PLAN = [
  "## 1. Identificação",
  "- **Disciplina**: Matemática",
  "- **Ano de escolaridade**: 2.º ano",
  "- **Duração**: 50 minutos",
  "- **Sumário**: Nesta aula, os alunos irão identificar números naturais.",
  "",
  "## 2. Aprendizagens Essenciais",
  "- Domínio: Números e Operações",
].join("\n");

describe("getDocumentPreview", () => {
  it("prefers the Sumário over the identification fields", () => {
    expect(getDocumentPreview(LESSON_PLAN)).toBe(
      "Nesta aula, os alunos irão identificar números naturais.",
    );
  });

  it("skips headings and key/value lines when there is no Sumário", () => {
    const md = "# Teste\n- **Disciplina**: História\n\nResponde às perguntas sobre o Estado Novo.";
    expect(getDocumentPreview(md)).toBe("Responde às perguntas sobre o Estado Novo.");
  });

  it("skips markdown table rows", () => {
    const md = "| Disciplina | Ano |\n|---|---|\n| Ciências | 5.º |\n\nPlanificação do 1.º período.";
    expect(getDocumentPreview(md)).toBe("Planificação do 1.º período.");
  });

  it("removes markdown escapes", () => {
    expect(getDocumentPreview("1\\. Introdução aos números")).toBe("1. Introdução aos números");
  });

  it("returns an empty string for empty content", () => {
    expect(getDocumentPreview("")).toBe("");
  });

  it("truncates long text to 160 characters with an ellipsis", () => {
    const preview = getDocumentPreview("a".repeat(400));
    expect(preview.length).toBeLessThanOrEqual(161);
    expect(preview.endsWith("…")).toBe(true);
  });

  it("lists the first slide titles of a v2 presentation", () => {
    const json = JSON.stringify({
      documentType: "presentation",
      schemaVersion: 2,
      slides: [
        { elements: [{ type: "text", role: "title", text: "O Ciclo da Água" }] },
        { elements: [{ type: "text", role: "title", text: "Evaporação" }] },
      ],
    });
    expect(getDocumentPreview(json)).toBe("O Ciclo da Água · Evaporação");
  });
});
