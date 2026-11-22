import { configureStore } from "@reduxjs/toolkit";
import { beforeEach, describe, expect, it, vi } from "vitest";
import rootReducer from "../rootReducer";
import type { RootState } from "../store";
import type { SourceDefault, SourceDefaultKind, SourceStatus } from "@/shared/types/sources";
import {
  selectDefaultFormSelection,
  selectSourceDefaults,
  toggleSourceDefault,
} from "./sourceDefaultsSlice";

const api = vi.hoisted(() => ({ listSourceDefaults: vi.fn(), setSourceDefault: vi.fn() }));
vi.mock("@/services/api/sources.service", () => api);

function row(
  sourceRef: string,
  kind: SourceDefaultKind,
  effectiveDefault: boolean,
  status: SourceStatus | null = "indexed"
): SourceDefault {
  return {
    sourceRef,
    kind,
    type: null,
    name: sourceRef,
    effectiveDefault,
    startingState: effectiveDefault,
    status,
    subjects: [],
    schoolYears: [],
    organizationId: null,
    organizationName: null,
    uploadedByName: null,
    summary: null,
    externalUrl: null,
    chunkCount: 0,
  };
}

const initialRootState = () => rootReducer(undefined, { type: "@@init" });
const loaded = (entries: SourceDefault[]): RootState =>
  ({
    ...initialRootState(),
    sourceDefaults: { entries, status: "loaded" },
  }) as RootState;
const makeStore = (entries: SourceDefault[]) =>
  configureStore({ reducer: rootReducer, preloadedState: loaded(entries) });

describe("sourceDefaults", () => {
  beforeEach(() => vi.resetAllMocks());

  it("toggles optimistically and rolls back when the server refuses", async () => {
    api.setSourceDefault.mockRejectedValueOnce(new Error("404"));
    const store = makeStore([row("ae", "ae", true)]);
    const p = store.dispatch(toggleSourceDefault({ sourceRef: "ae", enabled: false }));
    expect(selectSourceDefaults(store.getState() as RootState)[0].effectiveDefault).toBe(false);
    await p;
    expect(selectSourceDefaults(store.getState() as RootState)[0].effectiveDefault).toBe(true);
  });

  it("rejects without a message when the server's refusal has an empty body", async () => {
    const { ApiRequestError } = await import("@/services/api/client");
    api.setSourceDefault.mockRejectedValueOnce(new ApiRequestError("", 404, null));
    const store = makeStore([row("o1", "organization", true)]);
    const result = await store.dispatch(toggleSourceDefault({ sourceRef: "o1", enabled: false }));
    expect(toggleSourceDefault.rejected.match(result)).toBe(true);
    expect(result.payload).toBeUndefined();
  });

  it("builds the full form's starting selection from the defaults", () => {
    const state = loaded([
      row("ae", "ae", false),
      row("reg1", "regulatory", true),
      row("reg2", "regulatory", false),
      row("p1", "personal", true),
      row("p2", "personal", false),
      row("p3", "personal", true, "embedding"),
      row("o1", "organization", true),
      row("o2", "organization", false),
    ]);
    expect(selectDefaultFormSelection(state)).toEqual({
      includeAe: false,
      sourceIds: ["p1", "o1"],
      regulatorySourceIds: ["reg1"],
    });
  });

  it("has no starting selection before the defaults load", () => {
    expect(selectDefaultFormSelection(initialRootState() as RootState)).toBeUndefined();
  });
});
