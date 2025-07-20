// User Types
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  role: "teacher" | "admin";
  credits: number;
  created_at: string;
  updated_at: string;
}

// Document Types
export interface Document {
  id: string;
  title: string;
  content: string;
  type: "lesson_plan" | "presentation" | "test" | "quiz" | "activity";
  subject?: string;
  grade_level?: string;
  tags: string[];
  is_public: boolean;
  downloads: number;
  rating: number;
  user_id: string;
  created_at: string;
  updated_at: string;
}

// Lesson Plan Types
export interface LessonPlan {
  id: string;
  title: string;
  content: string;
  subject: string;
  grade_level: string;
  duration: number; // in minutes
  objectives: string[];
  materials: string[];
  activities: LessonActivity[];
  assessment: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface LessonActivity {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
  type: "individual" | "group" | "whole_class";
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Form Types
export interface LessonPlanForm {
  title: string;
  subject: string;
  grade_level: string;
  duration: number;
  objectives: string[];
  materials: string[];
  content: string;
}

// UI State Types
export interface UIState {
  sidebarCollapsed: boolean;
  sidebarOpen: boolean;
  loading: boolean;
  error: string | null;
}

// Search and Filter Types
export interface SearchFilters {
  query: string;
  subject?: string;
  grade_level?: string;
  type?: string;
  tags?: string[];
}

// Community Types
export interface CommunityResource {
  id: string;
  title: string;
  description: string;
  type: "lesson_plan" | "presentation" | "test" | "quiz" | "activity";
  subject: string;
  grade_level: string;
  downloads: number;
  rating: number;
  user: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  created_at: string;
}

// Creator Tiers
export type CreatorTier = "iniciante" | "bronze" | "prata" | "ouro" | "platina";

export interface CreatorProfile {
  id: string;
  user_id: string;
  tier: CreatorTier;
  xp: number;
  resources_shared: number;
  total_downloads: number;
  is_curator: boolean;
}
