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

  /** When ON: shared documents await admin review. When OFF: auto-approved on submit. */
  DOCUMENT_REVIEW = "document_review",
}
