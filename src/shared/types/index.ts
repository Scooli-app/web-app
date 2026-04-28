/**
 * Main types index - exports all shared types
 */

// Document types
export { TeachingMethod } from "./document";
export type { Document, DocumentType, WorksheetVariant } from "./document";

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
