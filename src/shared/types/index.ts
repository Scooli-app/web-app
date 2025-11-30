/**
 * Main types index - exports all shared types
 */

// Document types
export type { Document, DocumentType, DocumentMetadata } from "./document";

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
  CreateDocumentRequest,
  UpdateDocumentRequest,
  DeleteDocumentRequest,
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
export { Routes, APIRoutes } from "./routes";
