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
