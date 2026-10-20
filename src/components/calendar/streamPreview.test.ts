import { describe, expect, it } from "vitest";
import { streamPreviewTail } from "./streamPreview";

describe("streamPreviewTail", () => {
  it("turns doubly escaped line breaks and quotes back into text", () => {
    const stream = String.raw`**Erros comuns:**\\n- Exemplo: \\\"O que podemos aprender?\\\"\\n\\n### 5.3 Prática Guiada`;
    expect(streamPreviewTail(stream)).toBe('Erros comuns:\n- Exemplo: "O que podemos aprender?"\n\n5.3 Prática Guiada');
  });

  it("drops the JSON key the stream starts with", () => {
    expect(streamPreviewTail(String.raw`{"content": "# Plano\nIntrodução`)).toBe("Plano\nIntrodução");
  });

  it("keeps only the end, cut at a word", () => {
    const tail = streamPreviewTail("um dois três quatro cinco seis", 12);
    expect(tail).toBe("…cinco seis");
  });
});
