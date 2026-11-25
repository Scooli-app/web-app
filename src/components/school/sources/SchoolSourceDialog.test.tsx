// @vitest-environment jsdom
import { NextIntlClientProvider } from "next-intl";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import en from "../../../../messages/en.json";
import pt from "../../../../messages/pt-PT.json";
import { ApiRequestError } from "@/services/api/client";
import { LONG_NAME } from "@/shared/test/longContent";
import { SOURCE_NAME_MAX, nameLength, type SchoolSource } from "@/shared/types/sources";
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

function mount(locale: "pt-PT" | "en", source?: SchoolSource) {
  const messages = locale === "en" ? en : pt;
  const container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    createRoot(container).render(
      <NextIntlClientProvider locale={locale} messages={messages}>
        <SchoolSourceDialog mode={source ? "edit" : "create"} source={source} maxFileBytes={25 * MB} onDone={vi.fn()} />
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
    expect(alertText()).toBe(copy.errors.fileTooBig.replace("{max}", "25\u00a0MB"));
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

/** Checkboxes of the nth pick list (0 subjects, 1 years); the first is its "all" row. */
const boxes = (n: number) => [...document.querySelectorAll("fieldset")[n].querySelectorAll<HTMLButtonElement>('button[role="checkbox"]')];
const checked = (b: HTMLButtonElement) => b.getAttribute("aria-checked") === "true";

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
    expect(nameLength(nameInput()?.value ?? "")).toBe(SOURCE_NAME_MAX);
    expect(document.body.textContent).toContain(`${SOURCE_NAME_MAX}/${SOURCE_NAME_MAX}`);
    // the chosen file's full name stays reachable on the truncated label
    expect(document.querySelector(`[title="${LONG_NAME}${LONG_NAME}.pdf"]`)?.className).toContain("truncate");
  });

  it("labels the year options as years in English", () => {
    mount("en");
    expect(document.body.textContent).toContain("Year 7");
  });

  it("accepts a 200-character name with emoji, counting like the server, and cuts what goes past it", () => {
    mount("pt-PT");
    const input = nameInput();
    if (!input) throw new Error("no name input");
    const typed = `${"📚".repeat(SOURCE_NAME_MAX)}x`;
    expect(input.maxLength).toBeGreaterThanOrEqual(typed.length - 1); // the native cap lets 200 emoji in
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    act(() => {
      setter?.call(input, typed);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(input.value).toBe("📚".repeat(SOURCE_NAME_MAX));
    expect(document.body.textContent).toContain(`${SOURCE_NAME_MAX}/${SOURCE_NAME_MAX}`);
  });

  it("opens with every subject and year ticked and saves that as all (empty tags)", async () => {
    mount("pt-PT");
    expect(boxes(0).every(checked)).toBe(true);
    expect(boxes(1).every(checked)).toBe(true);
    pick(MB);
    await submit();
    expect(api.uploadSchoolSource).toHaveBeenCalledWith(expect.objectContaining({ subjects: [], schoolYears: [] }));
  });

  it("clears with the all row, blocks saving with a hint, and takes more than 20 subjects", async () => {
    const copy = mount("pt-PT");
    act(() => boxes(0)[0].click()); // untick "Todas as disciplinas"
    expect(boxes(0).some(checked)).toBe(false);
    expect(document.body.textContent).toContain(copy.form.pickSubject);
    pick(MB);
    expect(document.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
    for (const box of boxes(0).slice(1, 26)) act(() => box.click());
    expect(document.body.textContent).not.toContain(copy.form.pickSubject);
    await submit();
    const sent = api.uploadSchoolSource.mock.calls[0][0] as { subjects: string[] };
    expect(sent.subjects).toHaveLength(25);
  });

  it("opens an existing untagged source with everything ticked", () => {
    mount("en", {
      id: "s1", name: "Rules", type: "regra", subjects: [], schoolYears: [7, 8], defaultEnabled: true, status: "indexed",
      chunkCount: 1, fileSizeBytes: MB, fileKind: "pdf", uploadedByName: null, createdAt: "2026-11-22T10:00:00Z",
      lastError: null, hasSummary: false,
    });
    expect(boxes(0).every(checked)).toBe(true);
    expect(checked(boxes(1)[0])).toBe(false); // not every year
    expect(boxes(1).filter(checked)).toHaveLength(2);
  });
});
