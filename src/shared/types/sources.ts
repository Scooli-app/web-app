export type SourceStatus =
  | "uploaded"
  | "parsing"
  | "chunking"
  | "embedding"
  | "indexed"
  | "failed";

export type SourceScope = "personal" | "organization";
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
}

export interface UploadSourceParams {
  file: File;
  name: string;
  subject?: string;
  schoolYear?: number;
  scope?: SourceScope;
}
