/**
 * Main types index - exports all shared types
 */

// Document types
export { TeachingMethod } from "./document";
export type { Document, DocumentMetadata, DocumentType } from "./document";

// Lesson Plan types
export type {
    LessonActivity, LessonPlan,
    LessonPlanMetadata
} from "./lesson-plan";

// API types
export type {
    ApiResponse, BackendPaginatedResponse,
    ChatRequest,
    ChatResponse, CreateDocumentParams, CreateDocumentRequest, CreateDocumentStreamResponse, DeleteDocumentRequest, DocumentCountsResponse, DocumentFilters, DocumentResponse, DocumentStatsResponse, DocumentStreamCallbacks, GetDocumentsParams,
    GetDocumentsResponse, PaginatedResponse, StreamEvent,
    StreamedResponse, UpdateDocumentRequest
} from "./api";

// UI types
export type { LessonPlanForm, SearchFilters, UIState } from "./ui";

// Community types
export type {
    CommunityResource,
    CreatorProfile,
    CreatorTier
} from "./community";

// Route types
export { Routes } from "./routes";

// Template types
export type {
    CreateTemplateParams, DocumentTemplate, TemplateSection, UpdateTemplateParams
} from "./template";

// Subscription types
export { PLAN_CODES, PLAN_DISPLAY_INFO } from "./subscription";
export type {
    CheckoutRequest,
    CheckoutResponse, CurrentSubscription, PlanCode, PortalResponse, SubscriptionPlan, SubscriptionStatus,
    UsageStats
} from "./subscription";
// Feedback types
export { BugSeverity, FeedbackStatus, FeedbackType } from "./feedback";
export type {
    CreateFeedbackParams, Feedback,
    FeedbackAttachment, UploadResponse
} from "./feedback";

