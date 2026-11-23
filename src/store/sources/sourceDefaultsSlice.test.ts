import { configureStore } from "@reduxjs/toolkit";
import { beforeEach, describe, expect, it, vi } from "vitest";
import rootReducer from "../rootReducer";
import type { RootState } from "../store";
import type { SourceDefault, SourceDefaultKind, SourceStatus } from "@/shared/types/sources";
import {
  fetchSourceDefaults,
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
    sourceDefaults: { entries, status: "loaded", pending: {}, clock: 0, toggledAt: {} },
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

  it("rejects with the status and an empty message when the server's refusal has no body", async () => {
    const { ApiRequestError } = await import("@/services/api/client");
    api.setSourceDefault.mockRejectedValueOnce(new ApiRequestError("", 404, null));
    api.listSourceDefaults.mockResolvedValueOnce([]);
    const store = makeStore([row("o1", "organization", true)]);
    const result = await store.dispatch(toggleSourceDefault({ sourceRef: "o1", enabled: false }));
    expect(toggleSourceDefault.rejected.match(result)).toBe(true);
    expect(result.payload).toEqual({ status: 404, message: "" });
  });

  it("refetches after a 404, so a source deleted meanwhile leaves the list", async () => {
    const { ApiRequestError } = await import("@/services/api/client");
    api.setSourceDefault.mockRejectedValueOnce(new ApiRequestError("Fonte não encontrada.", 404, null));
    api.listSourceDefaults.mockResolvedValueOnce([row("ae", "ae", true)]);
    const store = makeStore([row("ae", "ae", true), row("o1", "organization", true)]);
    const result = await store.dispatch(toggleSourceDefault({ sourceRef: "o1", enabled: false }));
    expect(result.payload).toEqual({ status: 404, message: "Fonte não encontrada." });
    await vi.waitFor(() => expect(selectSourceDefaults(store.getState() as RootState).map((e) => e.sourceRef)).toEqual(["ae"]));
  });

  it("keeps the list on screen during a quiet refetch, and when it fails", async () => {
    let rejectFetch: (e: Error) => void = () => undefined;
    api.listSourceDefaults.mockReturnValueOnce(new Promise((_, reject) => (rejectFetch = reject)));
    const store = makeStore([row("ae", "ae", true)]);
    const status = () => (store.getState() as RootState).sourceDefaults.status;
    const fetching = store.dispatch(fetchSourceDefaults({ quiet: true }));
    expect(status()).toBe("loaded"); // no skeleton over a list the teacher is using
    rejectFetch(new Error("503"));
    await fetching;
    expect(status()).toBe("loaded");
    expect(selectSourceDefaults(store.getState() as RootState)).toHaveLength(1);
  });

  it("goes back to loading on a normal refetch, so a page waiting for fresh defaults can tell", async () => {
    api.listSourceDefaults.mockReturnValueOnce(new Promise(() => undefined));
    const store = makeStore([row("ae", "ae", true)]);
    void store.dispatch(fetchSourceDefaults());
    expect((store.getState() as RootState).sourceDefaults.status).toBe("loading");
  });

  it("shows loading, then failed, on a first load with nothing to show", async () => {
    let rejectFetch: (e: Error) => void = () => undefined;
    api.listSourceDefaults.mockReturnValueOnce(new Promise((_, reject) => (rejectFetch = reject)));
    const store = configureStore({ reducer: rootReducer });
    const fetching = store.dispatch(fetchSourceDefaults());
    expect((store.getState() as RootState).sourceDefaults.status).toBe("loading");
    rejectFetch(new Error("503"));
    await fetching;
    expect((store.getState() as RootState).sourceDefaults.status).toBe("failed");
  });

  it("does not refetch on other refusals", async () => {
    const { ApiRequestError } = await import("@/services/api/client");
    api.setSourceDefault.mockRejectedValueOnce(new ApiRequestError("Sem acesso", 403, null));
    const store = makeStore([row("o1", "organization", true)]);
    await store.dispatch(toggleSourceDefault({ sourceRef: "o1", enabled: false }));
    expect(api.listSourceDefaults).not.toHaveBeenCalled();
  });

  it("ignores a defaults read that resolves after a toggle it started before has already settled", async () => {
    let resolveFetch: (v: SourceDefault[]) => void = () => undefined;
    api.listSourceDefaults.mockReturnValueOnce(new Promise((r) => (resolveFetch = r)));
    api.setSourceDefault.mockResolvedValueOnce(row("p1", "personal", false));
    const store = makeStore([row("p1", "personal", true)]);
    const fetching = store.dispatch(fetchSourceDefaults());
    await store.dispatch(toggleSourceDefault({ sourceRef: "p1", enabled: false })); // PUT lands and settles first
    resolveFetch([row("p1", "personal", true), row("p2", "personal", true)]); // read before the PUT
    await fetching;
    const entries = selectSourceDefaults(store.getState() as RootState);
    expect(entries.find((e) => e.sourceRef === "p1")?.effectiveDefault).toBe(false);
    expect(entries.map((e) => e.sourceRef)).toEqual(["p1", "p2"]); // the rest of the read still applies
  });

  it("takes a read that started after the toggle as the truth", async () => {
    api.setSourceDefault.mockResolvedValueOnce(row("p1", "personal", false));
    const store = makeStore([row("p1", "personal", true)]);
    await store.dispatch(toggleSourceDefault({ sourceRef: "p1", enabled: false }));
    api.listSourceDefaults.mockResolvedValueOnce([row("p1", "personal", true)]); // changed elsewhere since
    await store.dispatch(fetchSourceDefaults());
    expect(selectSourceDefaults(store.getState() as RootState)[0].effectiveDefault).toBe(true);
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

  it("starts with AE on when the defaults have no AE row", () => {
    expect(selectDefaultFormSelection(loaded([row("p1", "personal", true)]))?.includeAe).toBe(true);
  });

  it("keeps a toggle in flight when an older defaults fetch resolves after it", async () => {
    let resolveFetch: (v: SourceDefault[]) => void = () => undefined;
    api.listSourceDefaults.mockReturnValueOnce(new Promise((r) => (resolveFetch = r)));
    let resolvePut: (v: SourceDefault) => void = () => undefined;
    api.setSourceDefault.mockReturnValueOnce(new Promise((r) => (resolvePut = r)));
    const store = makeStore([row("p1", "personal", true)]);
    const fetching = store.dispatch(fetchSourceDefaults());
    const toggling = store.dispatch(toggleSourceDefault({ sourceRef: "p1", enabled: false }));
    resolveFetch([row("p1", "personal", true)]); // read before the PUT landed
    await fetching;
    expect(selectSourceDefaults(store.getState() as RootState)[0].effectiveDefault).toBe(false);
    resolvePut(row("p1", "personal", false));
    await toggling;
    expect(selectSourceDefaults(store.getState() as RootState)[0].effectiveDefault).toBe(false);
  });

  it("settles overlapping toggles on the last value the server confirmed", async () => {
    const puts: { resolve: (v: SourceDefault) => void; reject: (e: Error) => void }[] = [];
    api.setSourceDefault.mockImplementation(() => new Promise((resolve, reject) => puts.push({ resolve, reject })));
    const store = makeStore([row("p1", "personal", true)]);
    const value = () => selectSourceDefaults(store.getState() as RootState)[0].effectiveDefault;

    const off = store.dispatch(toggleSourceDefault({ sourceRef: "p1", enabled: false }));
    const on = store.dispatch(toggleSourceDefault({ sourceRef: "p1", enabled: true }));
    puts[0].reject(new Error("503"));
    await off;
    expect(value()).toBe(true); // the second click still shows while it is in flight
    puts[1].resolve(row("p1", "personal", true));
    await on;
    expect(value()).toBe(true);

    const off2 = store.dispatch(toggleSourceDefault({ sourceRef: "p1", enabled: false }));
    const on2 = store.dispatch(toggleSourceDefault({ sourceRef: "p1", enabled: true }));
    puts[2].resolve(row("p1", "personal", false));
    await off2;
    expect(value()).toBe(true); // the older answer doesn't flip the switch under a newer click
    puts[3].reject(new Error("503"));
    await on2;
    expect(value()).toBe(false); // the server saved "off"; the failed "on" doesn't pretend otherwise
  });

  it("does not bring back a source that a refetch dropped while its toggle was in flight", async () => {
    let resolvePut: (v: SourceDefault) => void = () => undefined;
    api.setSourceDefault.mockReturnValueOnce(new Promise((r) => (resolvePut = r)));
    api.listSourceDefaults.mockResolvedValueOnce([]);
    const store = makeStore([row("o1", "organization", true)]);
    const toggling = store.dispatch(toggleSourceDefault({ sourceRef: "o1", enabled: false }));
    await store.dispatch(fetchSourceDefaults()); // an admin deleted it meanwhile
    resolvePut(row("o1", "organization", false));
    await toggling;
    expect(selectSourceDefaults(store.getState() as RootState)).toEqual([]);
  });

  it("has no starting selection before the defaults load", () => {
    expect(selectDefaultFormSelection(initialRootState() as RootState)).toBeUndefined();
  });
});
