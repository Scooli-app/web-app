import { describe, expect, it, vi } from "vitest";
import type {
  CanvasElement,
  CanvasImageElement,
  CanvasMathElement,
  CanvasTextElement,
} from "@/shared/types/canvas-presentation";
import {
  dispatchElementEdit,
  getImagePickerTitleKey,
} from "@/components/document-editor-v2/slide-element-edit";
import en from "../../../messages/en.json";
import ptPT from "../../../messages/pt-PT.json";

const imageElement = (overrides: Partial<CanvasImageElement> = {}): CanvasImageElement => ({
  id: "img-1",
  type: "image_placeholder",
  x: 0.1,
  y: 0.1,
  w: 0.4,
  h: 0.4,
  prompt: "a red apple",
  url: "https://cdn.example.com/apple.png",
  ...overrides,
} as CanvasImageElement);

const textElement: CanvasTextElement = {
  id: "txt-1",
  type: "text",
  x: 0,
  y: 0,
  w: 0.5,
  h: 0.1,
  text: "Hello",
  fontSize: 0.03,
  fontStyle: "normal",
  color: "#000",
  align: "left",
} as CanvasTextElement;

const mathElement: CanvasMathElement = {
  id: "math-1",
  type: "math",
  x: 0,
  y: 0,
  w: 0.2,
  h: 0.1,
  tex: "x^2",
  fontSize: 0.03,
} as CanvasMathElement;

function spyHandlers(opts: { withImage?: boolean; withMath?: boolean } = {}) {
  return {
    onChangeImage: opts.withImage === false ? undefined : vi.fn<(id: string) => void>(),
    onEditMath: opts.withMath === false ? undefined : vi.fn<(id: string) => void>(),
    startInlineEdit: vi.fn<(id: string) => void>(),
  };
}

describe("dispatchElementEdit — image elements never enter inline text editing", () => {
  it("double-click on a loaded image opens the image modal, not the prompt overlay", () => {
    const h = spyHandlers();
    dispatchElementEdit(imageElement(), h);
    expect(h.onChangeImage).toHaveBeenCalledTimes(1);
    expect(h.onChangeImage).toHaveBeenCalledWith("img-1");
    expect(h.startInlineEdit).not.toHaveBeenCalled();
  });

  it("double-click on an image still loading opens the image modal", () => {
    const h = spyHandlers();
    dispatchElementEdit(imageElement({ url: "https://cdn.example.com/slow.png" }), h);
    expect(h.onChangeImage).toHaveBeenCalledWith("img-1");
    expect(h.startInlineEdit).not.toHaveBeenCalled();
  });

  it("double-click on an image placeholder without url (fallback) opens the image modal", () => {
    const h = spyHandlers();
    dispatchElementEdit(imageElement({ url: undefined, prompt: "" }), h);
    expect(h.onChangeImage).toHaveBeenCalledWith("img-1");
    expect(h.startInlineEdit).not.toHaveBeenCalled();
  });

  it("image without a change-image handler does nothing and never shows the prompt as text", () => {
    const h = spyHandlers({ withImage: false });
    dispatchElementEdit(imageElement(), h);
    expect(h.startInlineEdit).not.toHaveBeenCalled();
  });
});

describe("dispatchElementEdit — other elements keep their behavior", () => {
  it("double-click on a text element starts inline text editing", () => {
    const h = spyHandlers();
    dispatchElementEdit(textElement, h);
    expect(h.startInlineEdit).toHaveBeenCalledWith("txt-1");
    expect(h.onChangeImage).not.toHaveBeenCalled();
  });

  it("double-click on a math element opens the formula modal when available", () => {
    const h = spyHandlers();
    dispatchElementEdit(mathElement, h);
    expect(h.onEditMath).toHaveBeenCalledWith("math-1");
    expect(h.startInlineEdit).not.toHaveBeenCalled();
  });

  it("double-click on a math element falls back to inline editing without a formula handler", () => {
    const h = spyHandlers({ withMath: false });
    dispatchElementEdit(mathElement, h);
    expect(h.startInlineEdit).toHaveBeenCalledWith("math-1");
  });
});

describe("getImagePickerTitleKey — modal title reflects the action", () => {
  it("uses the add title when inserting a new image", () => {
    expect(getImagePickerTitleKey(false)).toBe("dialogTitle");
  });

  it("uses the change title when replacing an existing image", () => {
    expect(getImagePickerTitleKey(true)).toBe("replaceDialogTitle");
  });

  it("both locales define a distinct replace title", () => {
    const enTitle = en.editor.imagePickerModal.replaceDialogTitle;
    const ptTitle = ptPT.editor.imagePickerModal.replaceDialogTitle;
    expect(enTitle).toBeTruthy();
    expect(ptTitle).toBeTruthy();
    expect(enTitle).not.toBe(en.editor.imagePickerModal.dialogTitle);
    expect(ptTitle).not.toBe(ptPT.editor.imagePickerModal.dialogTitle);
  });
});

// Type-level guard: the dispatcher accepts any canvas element.
const _anyElement: CanvasElement[] = [imageElement(), textElement, mathElement];
void _anyElement;
