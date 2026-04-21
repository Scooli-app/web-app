/**
 * FeatureFlag Enum
 * Centralises all feature flag keys as strongly-typed constants.
 * Use this enum wherever feature flags are checked instead of plain strings.
 *
 * Always add new flags here before using them in Slices, components, or services.
 */
export enum FeatureFlag {
  /** Controls access to the Community Library and the Share button in the editor. */
  COMMUNITY_LIBRARY = "community_library",

  /** Controls whether users can create presentation documents. */
  PRESENTATION_CREATION = "presentation_creation",

  /** Controls whether users can create worksheet documents. */
  WORKSHEET_CREATION = "worksheet_creation",

  /** Controls whether users can upload a document and convert it into a custom template. */
  TEMPLATE_FROM_DOCUMENT = "template_from_document",
  
  /** When ON: shared documents await admin review. When OFF: auto-approved on submit. */
  DOCUMENT_REVIEW = "document_review",

  /** Controls AI image generation and inclusion in documents. */
  DOCUMENT_IMAGES = "document_images",

  /** Controls the timed in-app feedback survey shown after first login. */
  APP_FEEDBACK_SURVEY = "app_feedback_survey",
}
