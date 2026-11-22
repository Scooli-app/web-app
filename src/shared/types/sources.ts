export type SourceStatus =
  | "uploaded"
  | "parsing"
  | "chunking"
  | "embedding"
  | "summarising"
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
}

export interface SourceQuota {
  filesUsed: number;
  filesMax: number;
  bytesUsed: number;
  bytesMax: number;
  maxFileBytes: number;
}

export type SourceDefaultKind = "ae" | "regulatory" | "personal" | "organization";
export type SchoolSourceType = "regra" | "apoio";

/** One source a teacher can switch on or off as a default (GET /sources/defaults). */
export interface SourceDefault {
  sourceRef: string;
  kind: SourceDefaultKind;
  type: SchoolSourceType | null;
  name: string;
  effectiveDefault: boolean;
  startingState: boolean;
  status: SourceStatus | null;
  subjects: string[];
  schoolYears: number[];
  organizationId: string | null;
  organizationName: string | null;
  uploadedByName: string | null;
  summary: string | null;
  externalUrl: string | null;
  chunkCount: number;
}

export interface SchoolSource {
  id: string;
  name: string;
  type: SchoolSourceType;
  subjects: string[];
  schoolYears: number[];
  defaultEnabled: boolean;
  status: SourceStatus;
  chunkCount: number;
  fileSizeBytes: number;
  fileKind: string;
  uploadedByName: string | null;
  createdAt: string;
  lastError: string | null;
  hasSummary: boolean;
}

export type SchoolSourceQuota = SourceQuota;

export interface UploadSchoolSourceParams {
  file: File;
  name: string;
  type: SchoolSourceType;
  subjects: string[];
  schoolYears: number[];
  defaultEnabled: boolean;
}

export type SchoolSourcePatch = Partial<
  Pick<SchoolSource, "name" | "type" | "subjects" | "schoolYears" | "defaultEnabled">
>;
