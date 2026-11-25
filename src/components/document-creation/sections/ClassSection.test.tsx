// @vitest-environment jsdom
import type { TeachingProfile } from "@/shared/types/teaching-profile";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const state = vi.hoisted(() => ({
  saved: [] as unknown[],
  profile: { courses: ["TUR"], educationType: "vocational" } as unknown as TeachingProfile,
}));

// Translation keys stand in for the copy, so the test reads the same in any locale.
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "pt-PT",
}));
vi.mock("@/hooks/useCountryCatalog", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/useCountryCatalog")>("@/hooks/useCountryCatalog");
  return { ...actual, useCountryCatalog: () => actual.buildCountryCatalogView("PT") };
});
vi.mock("@/components/teaching-profile/course-search", () => {
  const qualification = (code: string, title: string) => ({
    code,
    title,
    versionId: null,
    level: 4,
    cnaefCode: null,
    cnaefLabel: null,
    referentialFormat: "RA",
  });
  const catalog = [qualification("TUR", "Técnico de Turismo"), qualification("INF", "Técnico de Informática")];
  return {
    useCourseSearch: () => ({
      catalog,
      catalogError: null,
      catalogLoaded: true,
      retryCatalog: vi.fn(),
      term: "técnico",
      setTerm: vi.fn(),
      results: catalog,
      partialMatch: false,
    }),
  };
});
vi.mock("@/services/api/teaching-profile.service", () => ({
  teachingProfileService: {
    get: vi.fn(async () => state.profile),
    save: vi.fn(async (profile: TeachingProfile) => {
      state.saved.push(profile);
      return profile;
    }),
  },
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import { ClassSection } from "./ClassSection";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  state.saved = [];
});

function renderWithOneCourse() {
  const handlers = {
    onModeChange: vi.fn(),
    onUpdate: vi.fn(),
    onCourseChange: vi.fn(),
    onVocationalCourseAdded: vi.fn(),
  };
  container = document.createElement("div");
  document.body.appendChild(container);
  const created = createRoot(container);
  root = created;
  act(() =>
    created.render(
      createElement(ClassSection, {
        mode: "vocational",
        schoolYear: 10,
        preferredSchoolYears: [10],
        vocationalCourses: [{ code: "TUR", title: "Técnico de Turismo", units: [] }],
        vocationalCourseCode: "TUR",
        isVocationalFeatureEnabled: true,
        ...handlers,
      }),
    ),
  );
  return handlers;
}

function buttonWithText(text: string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll("button")).find((button) =>
    button.textContent?.includes(text),
  ) as HTMLButtonElement | undefined;
}

describe("ClassSection with a single saved curso profissional", () => {
  it("offers a way to add another course", () => {
    renderWithOneCourse();
    expect(container?.textContent).toContain("Técnico de Turismo");
    expect(buttonWithText("addCourse")).toBeDefined();
  });

  it("adds the picked course to the profile and selects it", async () => {
    const handlers = renderWithOneCourse();

    act(() => buttonWithText("addCourse")?.click());
    expect(document.body.textContent).toContain("quickAddTitle");

    // The course already on the profile is shown as added and cannot be picked again.
    expect(buttonWithText("Técnico de Turismo")?.disabled).toBe(true);

    await act(async () => buttonWithText("Técnico de Informática")?.click());

    expect(state.saved).toHaveLength(1);
    expect((state.saved[0] as TeachingProfile).courses).toEqual(["TUR", "INF"]);
    expect(handlers.onVocationalCourseAdded).toHaveBeenCalledTimes(1);
    expect(handlers.onCourseChange).toHaveBeenCalledWith("INF");
    expect(handlers.onModeChange).toHaveBeenCalledWith("vocational");
  });
});
