/**
 * Main types index - exports all types from lib/types
 */

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

// Document types
export type {
  CreateDocumentRequest,
  DeleteDocumentRequest,
  Document,
  DocumentMetadata,
  DocumentType,
  LessonActivity,
  LessonPlan,
  LessonPlanMetadata,
  UpdateDocumentRequest,
} from "./documents";

// API types
export type { ApiResponse, PaginatedResponse } from "./api";

// UI types
export type { LessonPlanForm, SearchFilters, UIState } from "./ui";

// Community types
export type {
  CommunityResource,
  CreatorProfile,
  CreatorTier,
} from "./community";
