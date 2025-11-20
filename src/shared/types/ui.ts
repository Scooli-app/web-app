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
  gradeLevel?: string;
  type?: string;
}

export interface LessonPlanForm {
  title: string;
  subject: string;
  gradeLevel: string;
  duration: number;
  objectives: string[];
  materials: string[];
  content: string;
}
