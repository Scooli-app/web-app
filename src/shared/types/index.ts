/**
 * Main types index - exports all shared types
 */

// Document types
export type { Document, DocumentType, DocumentMetadata } from "./document";
export { TeachingMethod } from "./document";

// Lesson Plan types
export type {
  LessonPlan,
  LessonPlanMetadata,
  LessonActivity,
} from "./lesson-plan";

// API types
export type {
  ApiResponse,
  PaginatedResponse,
  CreateDocumentParams,
  DocumentResponse,
  DocumentFilters,
  GetDocumentsParams,
  GetDocumentsResponse,
  DocumentCountsResponse,
  DocumentStatsResponse,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  DeleteDocumentRequest,
  CreateDocumentStreamResponse,
  StreamEvent,
  StreamedResponse,
  DocumentStreamCallbacks,
  BackendPaginatedResponse,
  ChatRequest,
  ChatResponse,
} from "./api";

// UI types
export type { LessonPlanForm, SearchFilters, UIState } from "./ui";

// Community types
export type {
  CommunityResource,
  CreatorProfile,
  CreatorTier,
} from "./community";

// Route types
export { Routes } from "./routes";

// Template types
export type {
  TemplateSection,
  DocumentTemplate,
  CreateTemplateParams,
  UpdateTemplateParams,
} from "./template";

// Subscription types
export type {
  SubscriptionPlan,
  CurrentSubscription,
  SubscriptionStatus,
  UsageStats,
  CheckoutRequest,
  CheckoutResponse,
  PortalResponse,
  PlanCode,
} from "./subscription";
export { PLAN_CODES, PLAN_DISPLAY_INFO } from "./subscription";
