// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import { SlideKonvaEditor } from "./SlideKonvaEditor";
import type { CanvasElement, CanvasImageElement, CanvasSlide } from "@/shared/types/canvas-presentation";
import messages from "../../../messages/en.json";

// Replace only the canvas renderer / geometry: the real editor, React state,
// event handlers, selection notifications and inline textarea remain under test.
type SceneProps = {
  id?: string;
  children?: React.ReactNode;
  text?: string;
  visible?: boolean;
  onClick?: (event: { cancelBubble: boolean }) => void;
  onDblClick?: (event: { cancelBubble: boolean }) => void;
  onDblTap?: (event: { cancelBubble: boolean }) => void;
};
const scene = vi.hoisted(() => new Map<string, SceneProps & { kind: string }>());
vi.mock("react-konva", async () => {
  const { createElement, forwardRef, useImperativeHandle } = await import("react");
  const node = { getAbsolutePosition: () => ({ x: 200, y: 200 }) };
  const stage = { findOne: () => node, container: () => ({ style: {} }) };
  const transformer = { nodes: vi.fn(), getLayer: () => ({ batchDraw: vi.fn() }) };
  const primitive = (kind: string) => forwardRef(function Primitive(props: SceneProps, ref) {
    useImperativeHandle(ref, () => kind === "Stage" ? stage : transformer);
    if (props.id) scene.set(props.id, { ...props, kind });
    return createElement("div", {
      "data-node": props.id,
      hidden: props.visible === false,
    }, props.children, props.text);
  });
  return Object.fromEntries(["Stage", "Layer", "Group", "Image", "Text", "Rect", "Ellipse", "Line", "Transformer"]
    .map((name) => [name, primitive(name)]));
});
vi.mock("konva", () => ({ default: { Text: class { height() { return 40; } } } }));
vi.mock("./math-render", () => ({ renderKatexToPngDataUrl: vi.fn() }));

class ControlledImage {
  static instances: ControlledImage[] = [];
  src = "";
  crossOrigin = "";
  onload = vi.fn();
  onerror = vi.fn();
  constructor() { ControlledImage.instances.push(this); }
}
const image: CanvasImageElement = {
  id: "image-1", type: "image_placeholder", x: 0.1, y: 0.1, w: 0.4, h: 0.4,
  prompt: "A private image-generation prompt", url: "https://example.test/image.png",
};
let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("Image", ControlledImage);
  vi.stubGlobal("ResizeObserver", class { observe = vi.fn(); disconnect = vi.fn(); });
  scene.clear();
  ControlledImage.instances = [];
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
function mount(elements: CanvasElement[], withImageHandler = true) {
  const onChangeImage = vi.fn();
  const onChange = vi.fn();
  const onSelectionChange = vi.fn();
  const slide: CanvasSlide = { id: "slide-1", layout: "blank", background: "#fff", elements };
  const render = () => act(() => root.render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SlideKonvaEditor slide={slide} onChange={onChange}
        onSelectionChange={onSelectionChange}
        onChangeImage={withImageHandler ? onChangeImage : undefined} />
    </NextIntlClientProvider>,
  ));
  render();
  return { onChangeImage, onChange, onSelectionChange, render };
}
function trigger(id: string, eventName: "onClick" | "onDblClick" | "onDblTap") {
  const event = { cancelBubble: false };
  const handler = scene.get(id)?.[eventName];
  if (!handler) throw new Error(`Missing ${eventName} handler for ${id}`);
  act(() => handler(event));
  return event;
}

describe("ENG-233 image editing through the actual canvas handlers", () => {
  for (const state of ["loaded", "loading", "failed", "no-url"] as const) {
    for (const gesture of ["onDblClick", "onDblTap"] as const) {
      it(`${gesture} on a ${state} image opens the picker without an inline prompt`, () => {
        const h = mount([{ ...image, url: state === "no-url" ? undefined : image.url }]);
        if (state === "loaded") act(() => ControlledImage.instances[0].onload());
        if (state === "failed") {
          act(() => ControlledImage.instances[0].onerror());
          h.render(); // cache removal is reflected on the next render
        }
        expect(scene.get(image.id)?.kind).toBe(state === "loaded" ? "Image" : "Group");
        const event = trigger(image.id, gesture);
        expect(h.onChangeImage).toHaveBeenCalledExactlyOnceWith(image.id);
        expect(h.onSelectionChange).toHaveBeenLastCalledWith(image.id);
        expect(event.cancelBubble).toBe(true);
        expect(container.querySelector("textarea")).toBeNull();
        expect(scene.get(image.id)?.visible).not.toBe(false);
        expect(h.onChange).not.toHaveBeenCalled();
      });
    }
  }

  it("the direct change-image button opens the picker, not inline editing", () => {
    const h = mount([image]);
    trigger(image.id, "onClick");
    const button = container.querySelector<HTMLButtonElement>('button[title="Change image"]');
    expect(button).not.toBeNull();
    if (!button) throw new Error("Missing change-image button");
    act(() => button.click());
    expect(h.onChangeImage).toHaveBeenCalledExactlyOnceWith(image.id);
    expect(container.querySelector("textarea")).toBeNull();
    expect(h.onChange).not.toHaveBeenCalled();
  });

  it("never falls back to editing the image prompt when no picker callback is supplied", () => {
    mount([image], false);
    trigger(image.id, "onDblClick");
    expect(container.querySelector("textarea")).toBeNull();
  });

  it("normal text still opens inline and commits edited text", () => {
    const h = mount([{
      id: "text-1", type: "text", x: 0, y: 0, w: 0.5, h: 0.1,
      text: "Original text", fontSize: 0.03, fontStyle: "normal", color: "#000", align: "left",
    }]);
    trigger("text-1", "onDblClick");
    const textarea = container.querySelector("textarea");
    if (!textarea) throw new Error("Missing inline text editor");
    expect(textarea.value).toBe("Original text");
    act(() => {
      textarea.value = "Updated text";
      textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(h.onChange).toHaveBeenCalledWith([expect.objectContaining({ id: "text-1", text: "Updated text" })]);
    expect(container.querySelector("textarea")).toBeNull();
    expect(h.onChangeImage).not.toHaveBeenCalled();
  });
});
