/**
 * UI state and form types
 */

export interface UIState {
  sidebarCollapsed: boolean;
  sidebarOpen: boolean;
  loading: boolean;
  error: string | null;
}

export interface SearchFilters {
  query: string;
  subject?: string;
  schoolYear?: number;
  type?: string;
}

export interface LessonPlanForm {
  title: string;
  subject: string;
  schoolYear: number;
  duration: number;
  objectives: string[];
  materials: string[];
  content: string;
}
