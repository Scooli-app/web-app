import { ApiRequestError } from "@/services/api/client";
import { listSourceDefaults, setSourceDefault } from "@/services/api/sources.service";
import type { SourceDefault } from "@/shared/types/sources";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { RootState } from "../store";

interface SourceDefaultsState {
  entries: SourceDefault[];
  status: "idle" | "loading" | "loaded" | "failed";
}

const initialState: SourceDefaultsState = { entries: [], status: "idle" };

export const fetchSourceDefaults = createAsyncThunk("sourceDefaults/fetch", () =>
  listSourceDefaults()
);

export const toggleSourceDefault = createAsyncThunk(
  "sourceDefaults/toggle",
  async ({ sourceRef, enabled }: { sourceRef: string; enabled: boolean }, { rejectWithValue }) => {
    try {
      return await setSourceDefault(sourceRef, enabled);
    } catch (e) {
      // A 4xx message is already in the teacher's language; an empty one or anything else gets the generic toast.
      if (e instanceof ApiRequestError && e.status >= 400 && e.status < 500 && e.message) return rejectWithValue(e.message);
      throw e;
    }
  }
);

const setEnabled = (state: SourceDefaultsState, sourceRef: string, enabled: boolean) => {
  const entry = state.entries.find((e) => e.sourceRef === sourceRef);
  if (entry) entry.effectiveDefault = enabled;
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
        state.entries = action.payload;
        state.status = "loaded";
      })
      .addCase(fetchSourceDefaults.rejected, (state) => {
        state.status = "failed";
      })
      .addCase(toggleSourceDefault.pending, (state, action) => {
        setEnabled(state, action.meta.arg.sourceRef, action.meta.arg.enabled);
      })
      .addCase(toggleSourceDefault.fulfilled, (state, action) => {
        const i = state.entries.findIndex((e) => e.sourceRef === action.payload.sourceRef);
        if (i >= 0) state.entries[i] = action.payload;
      })
      .addCase(toggleSourceDefault.rejected, (state, action) => {
        setEnabled(state, action.meta.arg.sourceRef, !action.meta.arg.enabled);
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
