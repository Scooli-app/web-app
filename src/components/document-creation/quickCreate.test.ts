import { describe, expect, it } from "vitest";
import { buildQuickCreateUrl, parseQuickCreate, stripParsedTokens } from "./quickCreate";

function strip(text: string) {
  return stripParsedTokens(text, parseQuickCreate(text));
}

describe("stripParsedTokens", () => {
  it("drops the type keyword, the connector and the year phrase", () => {
    expect(strip("Plano de aula sobre frações para o 5.º ano")).toBe("frações");
  });

  it("drops a bare trailing year", () => {
    expect(strip("frações 5.º ano")).toBe("frações");
  });

  it("leaves a topic with nothing parsed untouched", () => {
    expect(strip("frações")).toBe("frações");
  });

  it("drops an explicitly named subject", () => {
    expect(strip("Teste de Matemática sobre frações do 5.º ano")).toBe("frações");
  });

  it("keeps words that only imply the subject", () => {
    expect(strip("Os Lusíadas 9.º ano")).toBe("Os Lusíadas");
  });

  it("keeps a type word that is part of the topic", () => {
    expect(strip("Plano inclinado 10.º ano")).toBe("Plano inclinado");
    expect(strip("Plano cartesiano 7.º ano")).toBe("Plano cartesiano");
    expect(strip("Teste de hipóteses 12.º ano")).toBe("Teste de hipóteses");
  });

  it("keeps a subject name that is part of the topic", () => {
    expect(strip("A história de Portugal 7.º ano")).toBe("A história de Portugal");
  });

  it("handles the dashboard example format", () => {
    expect(strip("Quiz: Os Descobrimentos · 5.º ano")).toBe("Os Descobrimentos");
    expect(strip("Plano: A fotossíntese · 3.º ano")).toBe("A fotossíntese");
  });

  it("collapses the separators left where the year was removed", () => {
    expect(strip("Teste sobre equações do 1.º grau · 7.º ano, com problemas")).toBe(
      "equações do 1.º grau, com problemas",
    );
    expect(strip("Plano de aula sobre a população, 8.º ano, aula de 50 minutos")).toBe(
      "a população, aula de 50 minutos",
    );
  });

  it("leaves no space before a comma where 'para o 7.º ano' was removed", () => {
    // Tiago's saved request read "equações do 1.º grau , com critérios".
    expect(
      strip("Teste de 45 minutos sobre equações do 1.º grau para o 7.º ano, com critérios de correção e cotações"),
    ).toBe("Teste de 45 minutos sobre equações do 1.º grau, com critérios de correção e cotações");
  });

  it("keeps ordinals that are part of the topic", () => {
    expect(strip("Ficha sobre D. Dinis e o 3.º ciclo, 5.º ano")).toBe("D. Dinis e o 3.º ciclo");
  });

  it("falls back to the original text when stripping leaves nothing", () => {
    expect(strip("Plano de aula")).toBe("Plano de aula");
  });
});

describe("buildQuickCreateUrl", () => {
  it("sends the stripped topic", () => {
    const url = buildQuickCreateUrl(parseQuickCreate("frações 5.º ano"));
    expect(new URLSearchParams(url.split("?")[1]).get("topic")).toBe("frações");
  });
});

describe("Brazil (BR) quick-create", () => {
  it("reads Brazilian subject names and their synonyms", () => {
    expect(parseQuickCreate("Prova de Matemática sobre frações do 6º ano", "BR")).toEqual({
      documentType: "test",
      topic: "Prova de Matemática sobre frações do 6º ano",
      schoolYear: 6,
      subjectId: "Matemática",
    });
    expect(parseQuickCreate("plano de aula de português 6º ano", "BR").subjectId).toBe("Língua Portuguesa");
    expect(parseQuickCreate("ficha de inglês 7º ano", "BR").subjectId).toBe("Língua Inglesa");
  });

  it("reads Ensino Médio series as years 10 to 12", () => {
    expect(parseQuickCreate("plano de aula de português 1ª série", "BR").schoolYear).toBe(10);
    expect(parseQuickCreate("plano de aula de matemática segunda série", "BR").schoolYear).toBe(11);
    expect(parseQuickCreate("teste de física 3ª série", "BR")).toMatchObject({
      documentType: "test",
      schoolYear: 12,
      subjectId: "Ciências da Natureza",
    });
  });

  it("shifts a 1º-3º ano named inside Ensino Médio", () => {
    expect(parseQuickCreate("aula sobre funções 1º ano do ensino médio", "BR").schoolYear).toBe(10);
    expect(parseQuickCreate("aula sobre funções 1º ano", "BR").schoolYear).toBe(1);
  });

  it("drops a subject that the Brazilian year does not offer", () => {
    // "Ciências" is a Ensino Fundamental subject: it is not offered in the 1ª série.
    expect(parseQuickCreate("aula de ciências 1ª série", "BR").subjectId).toBeUndefined();
  });

  it("matches Brazilian topics to Brazilian subjects", () => {
    expect(parseQuickCreate("Machado de Assis 9º ano", "BR").subjectId).toBe("Língua Portuguesa");
    expect(parseQuickCreate("Revolução Francesa 8º ano", "BR").subjectId).toBe("História");
  });

  it("strips the Brazilian type, subject and series from the topic", () => {
    const text = "Prova de Português sobre orações subordinadas 9º ano";
    expect(stripParsedTokens(text, parseQuickCreate(text, "BR"), "BR")).toBe("orações subordinadas");
    const series = "Plano de aula de física sobre óptica 2ª série";
    expect(stripParsedTokens(series, parseQuickCreate(series, "BR"), "BR")).toBe("óptica");
  });

  it("builds the Brazilian creation URL with the Brazilian subject and year", () => {
    const parse = parseQuickCreate("Prova de Matemática sobre frações do 6º ano", "BR");
    const url = new URL(buildQuickCreateUrl(parse, "BR"), "http://localhost");
    expect(url.searchParams.get("topic")).toBe("frações");
    expect(url.searchParams.get("year")).toBe("6");
    expect(url.searchParams.get("subject")).toBe("Matemática");
  });

  it("keeps the Portuguese reading when no country is given", () => {
    expect(parseQuickCreate("prova de matemática 5.º ano").subjectId).toBe("matematica");
    expect(parseQuickCreate("prova de matemática 5.º ano", "PT").subjectId).toBe("matematica");
    // "prova" is a Brazilian word only: in Portugal it is not a test.
    expect(parseQuickCreate("prova sobre frações 5.º ano").documentType).toBe("lessonPlan");
  });
});
