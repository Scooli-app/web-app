export type SourceStatus =
  | "uploaded"
  | "parsing"
  | "chunking"
  | "embedding"
  | "indexed"
  | "failed";

export type SourceScope = "personal" | "organization" | "scooli";
export type SourceFileKind = "pdf" | "docx" | "md";

export interface UserSource {
  id: string;
  name: string;
  scope: SourceScope;
  status: SourceStatus;
  subject?: string | null;
  schoolYear?: number | null;
  fileKind: SourceFileKind;
  fileSizeBytes: number;
  chunkCount: number;
  retryCount: number;
  lastError?: string | null;
  indexedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  /** Canonical external URL (e.g. official publication for regulatory sources). */
  externalUrl?: string | null;
  /**
   * Set when the ingestion worker stripped a references/bibliography section
   * from the document before chunking. {@code null} when nothing was stripped.
   */
  strippedBackMatter?: {
    charsRemoved: number;
    matchedHeading: string | null;
  } | null;
}

export interface UploadSourceParams {
  file: File;
  name: string;
  subject?: string;
  schoolYear?: number;
  scope?: SourceScope;
}

export interface SourceQuota {
  filesUsed: number;
  filesMax: number;
  bytesUsed: number;
  bytesMax: number;
  maxFileBytes: number;
}
