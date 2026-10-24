import type { Document } from "@/shared/types/document";

type Kindable = { documentType?: Document["documentType"]; contentFormat?: Document["contentFormat"] } | null | undefined;

/** Any block-JSON document (presentation or assessment); false for markdown docs. */
export const isJsonDoc = (doc: Kindable) => doc?.contentFormat === "json";

export const isPresentationDoc = (doc: Kindable) =>
  isJsonDoc(doc) && doc?.documentType === "presentation";

export const isAssessmentDoc = (doc: Kindable) =>
  isJsonDoc(doc) &&
  (doc?.documentType === "test" || doc?.documentType === "worksheet" || doc?.documentType === "quiz");
