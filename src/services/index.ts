// API Services
export { AuthService } from "./api/auth.service";
export { DocumentService } from "./api/document.service";
export { LessonPlanService } from "./api/lesson-plan.service";

// API Client
export { supabase, apiClient, ApiError } from "./api/client";

// Service types
export type { AuthResponse, SignUpData, SignInData } from "./api/auth.service";

export type {
  CreateDocumentData,
  UpdateDocumentData,
  DocumentFilters,
} from "./api/document.service";

export type {
  CreateLessonPlanData,
  UpdateLessonPlanData,
  LessonPlanFilters,
} from "./api/lesson-plan.service";
