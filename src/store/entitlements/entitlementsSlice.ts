import { getCurrentEntitlement } from "@/services/api";
import type { CurrentEntitlement } from "@/shared/types/entitlement";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

export const fetchEntitlements = createAsyncThunk(
  "entitlements/fetchEntitlements",
  async (_, { rejectWithValue }) => {
    try {
      return await getCurrentEntitlement();
    } catch {
      return rejectWithValue("Não foi possível carregar os acessos da conta");
    }
  },
);

interface EntitlementsState {
  entitlement: CurrentEntitlement | null;
  loading: boolean;
  ready: boolean;
  error: string | null;
  lastUpdated: number | null;
}

const initialState: EntitlementsState = {
  entitlement: null,
  loading: false,
  ready: false,
  error: null,
  lastUpdated: null,
};

const entitlementsSlice = createSlice({
  name: "entitlements",
  initialState,
  reducers: {
    resetEntitlementsState(state) {
      state.entitlement = null;
      state.loading = false;
      state.ready = false;
      state.error = null;
      state.lastUpdated = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEntitlements.pending, (state) => {
        state.loading = true;
        state.ready = false;
        state.error = null;
      })
      .addCase(fetchEntitlements.fulfilled, (state, action) => {
        state.loading = false;
        state.ready = true;
        state.entitlement = action.payload;
        state.lastUpdated = Date.now();
      })
      .addCase(fetchEntitlements.rejected, (state, action) => {
        state.loading = false;
        state.ready = true;
        state.error = action.payload as string;
      });
  },
});

export const { resetEntitlementsState } = entitlementsSlice.actions;

export default entitlementsSlice.reducer;
