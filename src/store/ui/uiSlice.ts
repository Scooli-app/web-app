import type { UIState } from "@/shared/types";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface UIStoreState extends UIState {
  theme: "light" | "dark";
  sidebarCollapsed: boolean;
  sidebarOpen: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: UIStoreState = {
  theme: "light",
  sidebarCollapsed: false,
  sidebarOpen: false,
  loading: false,
  error: null,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarCollapsed(state, action: PayloadAction<boolean>) {
      state.sidebarCollapsed = action.payload;
    },
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
    toggleTheme(state) {
      state.theme = state.theme === "light" ? "dark" : "light";
    },
    setTheme(state, action: PayloadAction<"light" | "dark">) {
      state.theme = action.payload;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarCollapsed,
  setSidebarOpen,
  setLoading,
  setError,
  clearError,
  toggleTheme,
  setTheme,
} = uiSlice.actions;

export default uiSlice.reducer;
