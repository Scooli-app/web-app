// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SubjectChoiceUpdateFn } from "@/components/document-creation/useSubjectChoice";

const sections = vi.hoisted(() => ({
  classUpdate: null as SubjectChoiceUpdateFn | null,
  subjectUpdate: null as SubjectChoiceUpdateFn | null,
  availableSubjects: undefined as string[] | undefined,
  subjectDisabled: undefined as boolean | undefined,
}));
const post = vi.hoisted(() => vi.fn());

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));
vi.mock("@/hooks/useAccountAccess", () => ({ useAccountAccess: () => ({ isLocked: false, guard: () => true }) }));
vi.mock("@/components/feature/useFeatureAccess", () => ({ useFeatureAccess: () => ({ loaded: true, enabled: true }) }));
vi.mock("@/store/hooks", () => ({
  useAppSelector: (selector: (state: unknown) => unknown) => selector({ features: { flags: {} } }),
}));
vi.mock("@/services/api/teaching-profile.service", () => ({
  teachingProfileService: { get: vi.fn().mockRejectedValue(new Error("offline")) },
}));
vi.mock("@/services/api/client", () => ({ default: { post } }));
vi.mock("@/services/api/document.service", () => ({
  DocumentStillProcessingError: class extends Error {},
  getUploadUrl: vi.fn().mockResolvedValue({ uploadUrl: "https://upload", fileKey: "key" }),
  // Never resolves: the tests stop at the import request.
  waitForDocument: vi.fn(() => new Promise(() => undefined)),
}));
vi.mock("@/components/document-creation/sections", () => ({
  NESTED_SECTION_CLASS: "",
  ClassSection: (props: { onUpdate: SubjectChoiceUpdateFn }) => {
    sections.classUpdate = props.onUpdate;
    return createElement("div", { "data-section": "class" });
  },
  SubjectSection: (props: { onUpdate: SubjectChoiceUpdateFn; availableSubjects?: string[]; disabled?: boolean }) => {
    sections.subjectUpdate = props.onUpdate;
    sections.availableSubjects = props.availableSubjects;
    sections.subjectDisabled = props.disabled;
    return createElement("div", { "data-section": "subject" });
  },
}));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { error: vi.fn(), info: vi.fn() }) }));

import { SUBJECTS_BY_GRADE } from "@/components/document-creation/constants";
import CurriculumPlanImportPage from "./page";

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  post.mockReset().mockResolvedValue({ data: { documentId: "doc-1", message: "" } });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function renderPage() {
  await act(async () => {
    root.render(createElement(CurriculumPlanImportPage));
  });
}

async function fillFileAndTitle() {
  const fileInput = container.querySelector("#file") as HTMLInputElement;
  Object.defineProperty(fileInput, "files", {
    value: [new File(["plan"], "plan.docx")],
    configurable: true,
  });
  const titleInput = container.querySelector("#title") as HTMLInputElement;
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  await act(async () => {
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    setValue?.call(titleInput, "Planificação");
    titleInput.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function update(fn: SubjectChoiceUpdateFn | null, ...changes: Parameters<SubjectChoiceUpdateFn>[]) {
  await act(async () => {
    for (const [field, value] of changes) fn?.(field, value);
  });
}

function submitButton() {
  return [...container.querySelectorAll("button")].find((b) => b.textContent === "form.submit") as HTMLButtonElement;
}

async function submit() {
  await act(async () => {
    submitButton().click();
  });
  await vi.waitFor(() => expect(post).toHaveBeenCalled());
}

describe("curriculum plan import page", () => {
  it("asks for the year before the subject and filters subjects by that year", async () => {
    await renderPage();
    const order = [...container.querySelectorAll("[data-section]")].map((el) => el.getAttribute("data-section"));
    expect(order).toEqual(["class", "subject"]);
    expect(sections.subjectDisabled).toBe(true);

    await update(sections.classUpdate, ["schoolYear", 7]);

    expect(sections.subjectDisabled).toBe(false);
    expect(sections.availableSubjects).toEqual(SUBJECTS_BY_GRADE["7"]);
  });

  it("keeps Importar disabled until a year and subject are chosen", async () => {
    await renderPage();
    await fillFileAndTitle();
    expect(submitButton().disabled).toBe(true);

    await update(sections.classUpdate, ["schoolYear", 7]);
    expect(submitButton().disabled).toBe(true);

    await update(sections.subjectUpdate, ["subject", "matematica"]);
    expect(submitButton().disabled).toBe(false);
  });

  it("sends a regular subject as its canonical value", async () => {
    await renderPage();
    await fillFileAndTitle();
    await update(sections.classUpdate, ["schoolYear", 7]);
    await update(sections.subjectUpdate, ["subject", "matematica"]);
    await submit();

    expect(post).toHaveBeenCalledWith(
      "/curriculum-plans/import",
      expect.objectContaining({ subject: "Mathematics", schoolYear: 7, vocationalUnitCode: undefined }),
    );
  });

  it("sends the course and UC of a vocational subject", async () => {
    await renderPage();
    await fillFileAndTitle();
    await update(
      sections.classUpdate,
      ["subjectMode", "vocational"],
      ["vocationalCourseCode", "COURSE-1"],
      ["schoolYear", 10],
    );
    await update(sections.subjectUpdate, ["subject", "Redes Locais"], ["vocationalUnitCode", "UC-1"]);
    await submit();

    expect(post).toHaveBeenCalledWith(
      "/curriculum-plans/import",
      expect.objectContaining({
        subject: "Redes Locais",
        schoolYear: 10,
        vocationalCourseCode: "COURSE-1",
        vocationalUnitCode: "UC-1",
      }),
    );
  });
});
