/**
 * Services Index
 * Central export for all API services
 */

export { default as apiClient } from "./client";

// Document service
export * from "./document.service";
export * from "./document-images.service";

// Template service
export * from "./template.service";

// Subscription service
export * from "./subscription.service";

// Assistant service
export * from "./assistant.service";

// Health service
export * from "./health.service";

// Community Library service
export * from "./community.service";

// Feature Flags service
export * from "./features.service";

// Feedback survey service
export * from "./feedback-survey.service";

// User service
export * from "./user.service";

// Workspace / organization service
export * from "./workspace.service";
