// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React, { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import { ImagePickerModal } from "./ImagePickerModal";
import en from "../../../messages/en.json";
import ptPT from "../../../messages/pt-PT.json";

vi.mock("@/services/api", () => ({ uploadDocumentImage: vi.fn() }));
// Keep the modal's real content and translation lookup; omit portal/focus traps.
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) => open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <header>{children}</header>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));
let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe("ENG-233 localized image picker title", () => {
  it.each([
    { locale: "en", messages: en, replacing: false, title: "Add image" },
    { locale: "en", messages: en, replacing: true, title: "Change image" },
    { locale: "pt-PT", messages: ptPT, replacing: false, title: "Adicionar imagem" },
    { locale: "pt-PT", messages: ptPT, replacing: true, title: "Trocar imagem" },
  ])("$locale replacing=$replacing renders '$title'", ({ locale, messages, replacing, title }) => {
    act(() => root.render(
      <NextIntlClientProvider locale={locale} messages={messages}>
        <ImagePickerModal open documentId="doc-1" {...{ replacing }}
          onClose={vi.fn()} onInsert={vi.fn()} onGenerate={vi.fn()} />
      </NextIntlClientProvider>,
    ));
    expect(container.querySelector('[role="dialog"] h2')?.textContent).toBe(title);
  });
});
