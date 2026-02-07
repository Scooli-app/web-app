import type { UIState } from "@/shared/types";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ThemeMode = "light" | "dark" | "system";

interface UIStoreState extends UIState {
  theme: ThemeMode;
  sidebarCollapsed: boolean;
  sidebarOpen: boolean;
  loading: boolean;
  error: string | null;
  isUpgradeModalOpen: boolean;
}

const initialState: UIStoreState = {
  theme: "system",
  sidebarCollapsed: false,
  sidebarOpen: false,
  loading: false,
  error: null,
  isUpgradeModalOpen: false,
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
    setUpgradeModalOpen(state, action: PayloadAction<boolean>) {
      state.isUpgradeModalOpen = action.payload;
    },
    toggleTheme(state) {
      if (state.theme === "light") {
        state.theme = "dark";
      } else if (state.theme === "dark") {
        state.theme = "system";
      } else {
        state.theme = "light";
      }
    },
    setTheme(state, action: PayloadAction<ThemeMode>) {
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
  setUpgradeModalOpen,
} = uiSlice.actions;

export default uiSlice.reducer;
