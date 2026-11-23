// @vitest-environment jsdom
import { NextIntlClientProvider } from "next-intl";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import en from "../../../../messages/en.json";
import pt from "../../../../messages/pt-PT.json";
import { ApiRequestError } from "@/services/api/client";
import { LONG_NAME } from "@/shared/test/longContent";
import { SOURCE_NAME_MAX } from "@/shared/types/sources";
import { SchoolSourceDialog } from "./SchoolSourceDialog";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
// Radix checkboxes observe their size; jsdom does not implement ResizeObserver.
globalThis.ResizeObserver ??= class {
  observe = () => undefined;
  unobserve = () => undefined;
  disconnect = () => undefined;
} as unknown as typeof ResizeObserver;

const api = vi.hoisted(() => ({ uploadSchoolSource: vi.fn(), updateSchoolSource: vi.fn() }));
vi.mock("@/services/api/school-sources.service", () => api);

const MB = 2 ** 20;

function mount(locale: "pt-PT" | "en") {
  const messages = locale === "en" ? en : pt;
  const container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    createRoot(container).render(
      <NextIntlClientProvider locale={locale} messages={messages}>
        <SchoolSourceDialog mode="create" maxFileBytes={25 * MB} onDone={vi.fn()} />
      </NextIntlClientProvider>,
    );
  });
  return messages.schoolSources;
}

function pick(size: number, fileName = "Regulamento.pdf") {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("no file input");
  const file = new File(["x"], fileName, { type: "application/pdf" });
  Object.defineProperty(file, "size", { value: size });
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  act(() => input.dispatchEvent(new Event("change", { bubbles: true })));
}

const submit = async () => {
  await act(async () => document.querySelector<HTMLButtonElement>('button[type="submit"]')?.click());
};
const alertText = () => document.querySelector('[role="alert"]')?.textContent;

afterEach(() => {
  document.body.innerHTML = "";
  vi.resetAllMocks();
});

describe("SchoolSourceDialog errors", () => {
  it("refuses a file over the per-file limit on pick, without uploading (en)", async () => {
    const copy = mount("en");
    pick(30 * MB);
    expect(alertText()).toBe(copy.errors.fileTooBig.replace("{max}", "25 MB"));
    await submit();
    expect(api.uploadSchoolSource).not.toHaveBeenCalled();
  });

  it("falls back to the generic message when the server refuses with an empty body (pt-PT)", async () => {
    const copy = mount("pt-PT");
    api.uploadSchoolSource.mockRejectedValueOnce(new ApiRequestError("", 400, null));
    pick(MB);
    await submit();
    expect(api.uploadSchoolSource).toHaveBeenCalledOnce();
    expect(alertText()).toBe(copy.errors.generic);
  });

  it("shows the server's own message when it has one", async () => {
    mount("pt-PT");
    api.uploadSchoolSource.mockRejectedValueOnce(new ApiRequestError("Limite de 50 ficheiros atingido.", 400, null));
    pick(MB);
    await submit();
    expect(alertText()).toBe("Limite de 50 ficheiros atingido.");
  });

  it("says a duplicate in the admin's language, not the server's teacher-worded Portuguese", async () => {
    const copy = mount("en");
    api.uploadSchoolSource.mockRejectedValueOnce(new ApiRequestError("Já carregaste este ficheiro.", 409, "duplicate_source"));
    pick(MB);
    await submit();
    expect(alertText()).toBe(copy.errors.duplicate);
  });
});

const nameInput = () => document.querySelector<HTMLInputElement>("input[maxlength]");

describe("SchoolSourceDialog fields", () => {
  it("names the source after each picked file until the admin types a name", () => {
    mount("pt-PT");
    pick(MB, "Regulamento.pdf");
    expect(nameInput()?.value).toBe("Regulamento");
    pick(MB, "Critérios 2026.docx");
    expect(nameInput()?.value).toBe("Critérios 2026");
  });

  it("caps the name at the API limit and shows the count, even from a very long file name", () => {
    mount("pt-PT");
    pick(MB, `${LONG_NAME}${LONG_NAME}.pdf`);
    expect(nameInput()?.maxLength).toBe(SOURCE_NAME_MAX);
    expect(nameInput()?.value).toHaveLength(SOURCE_NAME_MAX);
    expect(document.body.textContent).toContain(`${SOURCE_NAME_MAX}/${SOURCE_NAME_MAX}`);
    // the chosen file's full name stays reachable on the truncated label
    expect(document.querySelector(`[title="${LONG_NAME}${LONG_NAME}.pdf"]`)?.className).toContain("truncate");
  });

  it("labels the year options as years in English", () => {
    mount("en");
    expect(document.body.textContent).toContain("Year 7");
  });
});
