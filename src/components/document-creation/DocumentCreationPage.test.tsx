// @vitest-environment jsdom
import { configureStore, createAsyncThunk } from "@reduxjs/toolkit";
import { NextIntlClientProvider, createTranslator } from "next-intl";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import pt from "../../../messages/pt-PT.json";
import { registerTranslator } from "@/i18n/translate";
import { FeatureFlag } from "@/shared/types/featureFlags";
import type { SourceDefault } from "@/shared/types/sources";
import rootReducer from "@/store/rootReducer";
import DocumentCreationPage from "./DocumentCreationPage";
import { documentTypes } from "./documentTypes";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  created: [] as Record<string, unknown>[],
  listSourceDefaults: vi.fn(),
  // The latest props the page gave the (stubbed) picker and lesson picker.
  picker: null as null | { sourceIds: string[]; onUpdate: (field: string, value: unknown) => void },
  lesson: null as null | { onChange: (choice: unknown) => void },
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("posthog-js", () => ({ default: { capture: vi.fn(), captureException: vi.fn() } }));
vi.mock("@/hooks/useAccountAccess", () => ({
  useAccountAccess: () => ({ isLocked: false, guard: () => true, hasCredits: false }),
}));
vi.mock("@/services/api/sources.service", () => ({ listSourceDefaults: mocks.listSourceDefaults }));
// Records the request instead of streaming a document.
vi.mock("@/store/documents/documentSlice", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  createDocument: createAsyncThunk("test/createDocument", async (args: Record<string, unknown>) => {
    mocks.created.push(args);
    return { id: "doc-1" };
  }),
}));
// Sections that fetch on their own are out of this test's scope.
vi.mock("./sections", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  LessonSection: (props: { onChange: (choice: unknown) => void }) => {
    mocks.lesson = props;
    return null;
  },
  SourcePickerSection: (props: { sourceIds: string[]; onUpdate: (field: string, value: unknown) => void }) => {
    mocks.picker = props;
    return null;
  },
}));
vi.mock("@/components/document-editor-v2/ThemePicker", () => ({ ThemeGallery: () => null }));
vi.mock("./useSubjectChoice", () => ({
  useSubjectChoice: () => ({
    teachingMode: "regular",
    vocationalCourseOptions: [],
    selectedVocationalCourse: undefined,
    preferredSchoolYears: [],
    preferredSubjectIds: [],
    handleTeachingModeChange: vi.fn(),
    handleVocationalCourseChange: vi.fn(),
    onVocationalCourseAdded: vi.fn(),
    isVocationalFeatureEnabled: false,
  }),
}));

const aeOff: SourceDefault = {
  sourceRef: "ae", kind: "ae", type: null, name: "Aprendizagens Essenciais", effectiveDefault: false, startingState: true,
  status: null, subjects: [], schoolYears: [], organizationId: null, organizationName: null, uploadedByName: null,
  summary: null, externalUrl: null, chunkCount: 0,
};

async function mountPage(defaults: Promise<SourceDefault[]>) {
  mocks.listSourceDefaults.mockReturnValue(defaults);
  // Arrives pre-filled from the dashboard box, so "Criar" is enabled straight away.
  window.history.replaceState({}, "", "/presentation?topic=Frações&year=7&subject=matematica");
  const store = configureStore({
    reducer: rootReducer,
    preloadedState: {
      features: { flags: { [FeatureFlag.USER_SOURCES]: true }, loading: false, loaded: true, error: null },
    } as never,
  });
  const container = document.createElement("div");
  document.body.appendChild(container);
  await act(async () => {
    createRoot(container).render(
      <Provider store={store}>
        <NextIntlClientProvider locale="pt-PT" messages={pt}>
          <DocumentCreationPage documentType={documentTypes.presentation} />
        </NextIntlClientProvider>
      </Provider>,
    );
  });
  return container;
}

async function submit(container: HTMLElement) {
  const create = container.querySelector<HTMLButtonElement>('button[aria-label^="Criar"]');
  expect(create?.disabled).toBe(false);
  await act(async () => create?.click());
  expect(mocks.created).toHaveLength(1);
  return mocks.created[0];
}

const createWithDefaults = async (defaults: Promise<SourceDefault[]>) => submit(await mountPage(defaults));

const schoolRule = (sourceRef: string, subjects: string[]): SourceDefault => ({
  ...aeOff, sourceRef, kind: "organization", type: "regra", name: sourceRef, effectiveDefault: true, status: "indexed",
  subjects, schoolYears: [7], organizationId: "org", organizationName: "Escola",
});

beforeEach(() => {
  registerTranslator(createTranslator({ locale: "pt-PT", messages: pt }) as never);
  mocks.created.length = 0;
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("DocumentCreationPage source fields", () => {
  it("sends no source fields while the defaults are still loading, so the server applies the teacher's own", async () => {
    const request = await createWithDefaults(new Promise(() => undefined));
    expect(request).not.toHaveProperty("sourceIds");
    expect(request).not.toHaveProperty("includeAe");
    expect(request).not.toHaveProperty("regulatorySourceIds");
  });

  it("sends no source fields when the defaults failed to load", async () => {
    const request = await createWithDefaults(Promise.reject(new Error("503")));
    expect(request).not.toHaveProperty("sourceIds");
    expect(request).not.toHaveProperty("includeAe");
  });

  it("sends the teacher's defaults once they are in the form, AE off included", async () => {
    const request = await createWithDefaults(Promise.resolve([aeOff]));
    expect(request).toMatchObject({ includeAe: false, sourceIds: [], regulatorySourceIds: [] });
  });

  it("keeps what the teacher picked before the defaults arrived, and sends it", async () => {
    let resolve: (v: SourceDefault[]) => void = () => undefined;
    const container = await mountPage(new Promise((r) => (resolve = r)));
    await act(async () => mocks.picker?.onUpdate("includeAe", false));
    await act(async () => resolve([{ ...aeOff, effectiveDefault: true }, schoolRule("o1", ["Mathematics"])]));
    expect(mocks.picker?.sourceIds).toEqual([]); // the defaults did not overwrite the teacher's pick
    expect(await submit(container)).toMatchObject({ includeAe: false, sourceIds: [] });
  });

  it("re-decides untouched school rules when the subject changes, keeping the ones the teacher touched", async () => {
    const container = await mountPage(
      Promise.resolve([schoolRule("math", ["Mathematics"]), schoolRule("pt", ["Portuguese"]), schoolRule("all", [])]),
    );
    expect(mocks.picker?.sourceIds).toEqual(["math", "all"]);
    await act(async () => mocks.picker?.onUpdate("sourceIds", ["math"])); // unticks "all" for this document
    await act(async () =>
      mocks.lesson?.onChange({ timetableId: "t", lessonId: "l", slotDate: "2026-11-23", topicTitle: "", klass: {}, gradeLevel: 7, subjectId: "portugues", disabled: false }),
    );
    expect([...(mocks.picker?.sourceIds ?? [])].sort()).toEqual(["pt"]);
    expect(await submit(container)).toMatchObject({ sourceIds: ["pt"] });
  });
});
