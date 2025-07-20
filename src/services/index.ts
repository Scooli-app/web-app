// API Services
export { AuthService } from "./api/auth.service";
export { AuthInitService } from "./api/auth-init.service";
export { UserProfileService } from "./api/user-profile.service";
export { DocumentService } from "./api/document.service";
export { LessonPlanService } from "./api/lesson-plan.service";
export { CreditService } from "./api/credit.service";

// API Client
export { supabase, apiClient, ApiError } from "./api/client";

// Types
export type { AuthResponse, SignUpData, SignInData } from "./api/auth.service";
export type { UserProfile } from "./api/user-profile.service";
export type {
  CreditCheckResult,
  CreditDeductionResult,
  CreditStatus,
} from "./api/credit.service";
