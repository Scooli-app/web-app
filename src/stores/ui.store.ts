import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { UIState } from "@/types";

interface UIStoreState extends UIState {
  // Additional UI state
  theme: "light" | "dark";
  sidebarCollapsed: boolean;
  sidebarOpen: boolean;
  loading: boolean;
  error: string | null;

  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  toggleTheme: () => void;
  setTheme: (theme: "light" | "dark") => void;
}

export const useUIStore = create<UIStoreState>()(
  subscribeWithSelector((set) => ({
    // Initial state
    theme: "light",
    sidebarCollapsed: false,
    sidebarOpen: false,
    loading: false,
    error: null,

    // Actions
    toggleSidebar: () => {
      set((state) => ({ sidebarOpen: !state.sidebarOpen }));
    },

    setSidebarCollapsed: (collapsed: boolean) => {
      set({ sidebarCollapsed: collapsed });
    },

    setSidebarOpen: (open: boolean) => {
      set({ sidebarOpen: open });
    },

    setLoading: (loading: boolean) => {
      set({ loading });
    },

    setError: (error: string | null) => {
      set({ error });
    },

    clearError: () => {
      set({ error: null });
    },

    toggleTheme: () => {
      set((state) => ({ theme: state.theme === "light" ? "dark" : "light" }));
    },

    setTheme: (theme: "light" | "dark") => {
      set({ theme });
    },
  }))
);
