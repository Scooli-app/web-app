/**
 * Main types index - exports all shared types
 */

// Document types
export { TeachingMethod } from "./document";
export type { CurriculumPlanningType, Document, DocumentType, WorksheetVariant } from "./document";

// API types
export type { BackendPaginatedResponse, ChatResponse, CreateDocumentParams, CreateDocumentStreamResponse, DocumentFilters, DocumentStatsResponse, DocumentStreamCallbacks, GetDocumentsParams, GetDocumentsResponse, StreamEvent, StreamedResponse } from "./api";

// UI types
export type { UIState } from "./ui";

// Route types
export { Routes } from "./routes";

// Template types
export type { CreateTemplateParams, DocumentTemplate, TemplateSection } from "./template";

// Subscription types
export type { CurrentEntitlement, EntitlementSource } from "./entitlement";

// Workspace / organization types
export type {
    CurrentOrganization,
    OrganizationActivityPoint,
    OrganizationDashboard,
    OrganizationDocumentTypeBreakdown,
    OrganizationMember,
    OrganizationMemberActivity,
    WorkspaceContext,
    WorkspaceType
} from "./workspace";

// Sources types
export type { UserSource, UploadSourceParams, SourceStatus, SourceScope, SourceFileKind } from "./sources";

// Timetable types (Feature 2)
export type {
  TimetableSession,
  TimetableSlot,
  LessonSlot,
  LessonSlotDocument,
  LessonContextSummary,
  CreateSessionRequest,
  UpdateSessionRequest,
  CreateSlotRequest,
  UpdateSlotRequest,
  UpdateLessonRequest,
  GenerateLessonRequest,
  GenerateLessonResponse,
  GenerateTopicsResponse,
} from "./timetable";
export type { TimetableSessionStatus, LessonSlotStatus, LessonType } from "./timetable";

// Feature flags
export { FeatureFlag } from "./featureFlags";
