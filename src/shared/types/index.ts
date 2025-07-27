/**
 * Main types index - exports all types from lib/types
 */

// Domain types
export type {
  Document,
  DocumentType,
  DocumentMetadata,
  LessonPlan,
  LessonPlanMetadata,
  LessonActivity,
} from "./domain/document";

// API types
export type {
  ApiResponse,
  PaginatedResponse,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  DeleteDocumentRequest,
} from "./api/document";

// Auth types
export type {
  APIProtectionConfig,
  AuthContext,
  Permission,
  PermissionCategory,
  Role,
  RouteConfig,
  User,
  UserProfile,
  UserRole,
} from "./auth";

// UI types
export type { LessonPlanForm, SearchFilters, UIState } from "./ui";

// Community types
export type {
  CommunityResource,
  CreatorProfile,
  CreatorTier,
} from "./community";
