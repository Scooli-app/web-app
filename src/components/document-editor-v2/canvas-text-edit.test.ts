import { describe, expect, it } from "vitest";
import type { CanvasListElement, CanvasTextElement } from "@/shared/types/canvas-presentation";
import { applyTheme, presentationToCanvas } from "./canvas-layout";
import { parsePresentationDocument } from "@/shared/types/blocks";
import {
  getListEditValue,
  getTextEditStyle,
  parseListEditValue,
} from "./canvas-text-edit";

function bulletEl(overrides: Partial<CanvasListElement> = {}): CanvasListElement {
  return {
    id: "b1",
    type: "bullet_list",
    x: 0.04,
    y: 0.3,
    w: 0.9,
    h: 0.3,
    items: ["Alfa", "Beta"],
    fontSize: 0.021,
    color: "#c9b97a",
    blockId: "b1",
    ...overrides,
  };
}

function orderedEl(): CanvasListElement {
  return { ...bulletEl(), id: "o1", type: "ordered_list", blockId: "o1", items: ["Um", "Dois"] };
}

describe("list text-edit overlay keeps the list semantics while editing", () => {
  it("shows the bullet marker for each item, as on the slide", () => {
    expect(getListEditValue(bulletEl())).toBe("• Alfa\n• Beta");
  });

  it("shows the number marker for ordered lists", () => {
    expect(getListEditValue(orderedEl())).toBe("1. Um\n2. Dois");
  });

  it("an unchanged edit commit keeps the items exactly (no markers leak in)", () => {
    expect(parseListEditValue(getListEditValue(bulletEl()), false)).toEqual(["Alfa", "Beta"]);
    expect(parseListEditValue(getListEditValue(orderedEl()), true)).toEqual(["Um", "Dois"]);
  });

  it("does not double the marker when the user types one back in", () => {
    expect(parseListEditValue("• Alfa\n• Gama", false)).toEqual(["Alfa", "Gama"]);
    expect(parseListEditValue("1. Um\n2. Três", true)).toEqual(["Um", "Três"]);
  });

  it("keeps a new line typed without a marker as a plain item", () => {
    expect(parseListEditValue("• Alfa\nGama", false)).toEqual(["Alfa", "Gama"]);
  });
});

describe("text-edit overlay keeps the element styling while editing", () => {
  it("a list keeps its theme body color, not the muted placeholder color", () => {
    const cp = applyTheme(
      presentationToCanvas(
        parsePresentationDocument(
          JSON.stringify({
            schemaVersion: 1,
            documentType: "presentation",
            blocks: [
              { id: "s1", type: "slide", layout: "title-content", title: "T", content: [
                { id: "b1", type: "bullet_list", items: ["Alfa", "Beta"] },
              ] },
              { id: "s2", type: "slide", layout: "title-content", title: "T2" },
              { id: "s3", type: "slide", layout: "title-content", title: "T3" },
            ],
          }),
        ),
      ),
      "dark",
    );
    const list = cp.slides[0].elements.find((e) => e.type === "bullet_list") as CanvasListElement;
    expect(list.color).toBe("#c9b97a");
    expect(getTextEditStyle(list).color).toBe("#c9b97a");
  });

  it("a text keeps its color, font, underline and alignment while editing", () => {
    const text: CanvasTextElement = {
      id: "t1",
      type: "text",
      x: 0,
      y: 0,
      w: 0.5,
      h: 0.1,
      text: "Olá",
      fontSize: 0.03,
      fontStyle: "bold italic",
      fontFamily: "Lexend",
      color: "#ff0000",
      align: "center",
      underline: true,
    };
    expect(getTextEditStyle(text)).toEqual({
      color: "#ff0000",
      fontFamily: "Lexend",
      fontStyle: "bold italic",
      underline: true,
      align: "center",
    });
  });
});
