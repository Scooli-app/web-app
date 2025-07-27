// Auth services
export { AuthService } from "./auth/auth.service";
export { AuthInitService } from "./auth/auth-init.service";

// User services
export { UserProfileService } from "./users/user-profile.service";

// Document services
export { DocumentService } from "./documents/document.service";
export { LessonPlanService } from "./documents/lesson-plan.service";

// Credit service
export { CreditService } from "./credit.service";

// API Client
export { supabase, apiClient, ApiError } from "./client";

// Types
export type { AuthResponse, SignUpData, SignInData } from "./auth/auth.service";
export type { UserProfile } from "./users/user-profile.service";
export type {
  CreditCheckResult,
  CreditDeductionResult,
  CreditStatus,
} from "./credit.service";
