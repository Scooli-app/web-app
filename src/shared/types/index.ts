/**
 * Main types index - exports all shared types
 */

// Document types
export { TeachingMethod } from "./document";
export type { Document, DocumentType, WorksheetVariant } from "./document";

// Lesson Plan types


// API types
export type { BackendPaginatedResponse, ChatResponse, CreateDocumentParams, CreateDocumentStreamResponse, DocumentFilters, DocumentStatsResponse, DocumentStreamCallbacks, GetDocumentsParams, GetDocumentsResponse, StreamEvent, StreamedResponse } from "./api";

// UI types
export type { UIState } from "./ui";

// Community types


// Route types
export { Routes } from "./routes";

// Template types
export type { CreateTemplateParams, DocumentTemplate, TemplateSection } from "./template";

// Subscription types


// Feedback types



// Feedback survey types



// User types


// Workspace / organization types
export type {
    CurrentOrganization,
    OrganizationDashboard,
    OrganizationMember,
    WorkspaceContext,
    WorkspaceType
} from "./workspace";

