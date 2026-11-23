import { ApiRequestError } from "@/services/api/client";
import { listSourceDefaults, setSourceDefault } from "@/services/api/sources.service";
import type { SourceDefault } from "@/shared/types/sources";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { RootState } from "../store";

interface SourceDefaultsState {
  entries: SourceDefault[];
  status: "idle" | "loading" | "loaded" | "failed";
  /** Toggles still in flight per source: how many, and the last value the server confirmed. */
  pending: Record<string, { count: number; confirmed: boolean }>;
  /** Ticks once per toggle; `toggledAt[ref]` is the tick of that source's last toggle. */
  clock: number;
  toggledAt: Record<string, number>;
}

const initialState: SourceDefaultsState = { entries: [], status: "idle", pending: {}, clock: 0, toggledAt: {} };

export const fetchSourceDefaults = createAsyncThunk("sourceDefaults/fetch", async (_: void, { getState }) => {
  // A source toggled after this tick was read before its PUT landed: the read must not overwrite it.
  const startedAt = (getState() as RootState).sourceDefaults.clock;
  return { entries: await listSourceDefaults(), startedAt };
});

export const toggleSourceDefault = createAsyncThunk(
  "sourceDefaults/toggle",
  async ({ sourceRef, enabled }: { sourceRef: string; enabled: boolean }, { rejectWithValue, dispatch }) => {
    try {
      return await setSourceDefault(sourceRef, enabled);
    } catch (e) {
      // Deleted meanwhile (an admin removed a school source): refetch so the row goes away.
      if (e instanceof ApiRequestError && e.status === 404) void dispatch(fetchSourceDefaults());
      // A 4xx message is already in the teacher's language; an empty one or anything else gets the generic toast.
      if (e instanceof ApiRequestError && e.status >= 400 && e.status < 500 && e.message) return rejectWithValue(e.message);
      throw e;
    }
  }
);

// The switch shows the latest click while toggles are in flight; once the last settles, the last value the server confirmed.
const settle = (state: SourceDefaultsState, sourceRef: string) => {
  const p = state.pending[sourceRef];
  if (!p) return;
  p.count -= 1;
  if (p.count > 0) return;
  const entry = state.entries.find((e) => e.sourceRef === sourceRef);
  if (entry) entry.effectiveDefault = p.confirmed;
  delete state.pending[sourceRef];
};

const slice = createSlice({
  name: "sourceDefaults",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSourceDefaults.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchSourceDefaults.fulfilled, (state, action) => {
        // A read that started before a toggle landed (in flight or already settled) must not flip that switch back.
        const { entries, startedAt } = action.payload;
        const optimistic = new Map(state.entries.map((e) => [e.sourceRef, e.effectiveDefault]));
        const toggledSince = (ref: string) => state.pending[ref] || (state.toggledAt[ref] ?? 0) > startedAt;
        state.entries = entries.map((e) =>
          toggledSince(e.sourceRef) && optimistic.has(e.sourceRef)
            ? { ...e, effectiveDefault: optimistic.get(e.sourceRef) as boolean }
            : e
        );
        state.status = "loaded";
      })
      .addCase(fetchSourceDefaults.rejected, (state) => {
        state.status = "failed";
      })
      .addCase(toggleSourceDefault.pending, (state, action) => {
        const { sourceRef, enabled } = action.meta.arg;
        const entry = state.entries.find((e) => e.sourceRef === sourceRef);
        if (!entry) return;
        const p = state.pending[sourceRef];
        if (p) p.count += 1;
        else state.pending[sourceRef] = { count: 1, confirmed: entry.effectiveDefault };
        state.clock += 1;
        state.toggledAt[sourceRef] = state.clock;
        entry.effectiveDefault = enabled;
      })
      .addCase(toggleSourceDefault.fulfilled, (state, action) => {
        const { sourceRef } = action.meta.arg;
        const p = state.pending[sourceRef];
        if (p) p.confirmed = action.payload.effectiveDefault;
        // An unknown ref was dropped by a refetch (deleted meanwhile): it is not brought back.
        const i = state.entries.findIndex((e) => e.sourceRef === sourceRef);
        if (i >= 0) state.entries[i] = { ...action.payload, effectiveDefault: state.entries[i].effectiveDefault };
        settle(state, sourceRef);
      })
      .addCase(toggleSourceDefault.rejected, (state, action) => {
        settle(state, action.meta.arg.sourceRef);
      });
  },
});

export default slice.reducer;

export const selectSourceDefaults = (state: RootState) => state.sourceDefaults.entries;
export const selectSourceDefaultsStatus = (state: RootState) => state.sourceDefaults.status;

/** The full form's starting ticks; undefined until the defaults have loaded. */
export function selectDefaultFormSelection(
  state: RootState
): { includeAe: boolean; sourceIds: string[]; regulatorySourceIds: string[] } | undefined {
  if (state.sourceDefaults.status !== "loaded") return undefined;
  const entries = state.sourceDefaults.entries;
  const ids = (kind: SourceDefault["kind"], indexedOnly: boolean) =>
    entries
      .filter(
        (e) => e.kind === kind && e.effectiveDefault && (!indexedOnly || e.status === "indexed")
      )
      .map((e) => e.sourceRef);
  return {
    includeAe: entries.find((e) => e.kind === "ae")?.effectiveDefault ?? true,
    sourceIds: [...ids("personal", true), ...ids("organization", true)],
    regulatorySourceIds: ids("regulatory", false),
  };
}
