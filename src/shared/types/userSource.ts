export type UserSourceStatus =
  | "uploaded"
  | "parsing"
  | "chunking"
  | "embedding"
  | "indexed"
  | "failed";

export type UserSourceFileKind = "pdf" | "docx" | "md";

export interface UserSource {
  id: string;
  name: string;
  subject?: string | null;
  schoolYear?: number | null;
  fileKind: UserSourceFileKind;
  fileSizeBytes: number;
  status: UserSourceStatus;
  chunkCount: number;
  indexedAt?: string | null;
  lastError?: string | null;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UploadSourceParams {
  file: File;
  name: string;
  subject?: string;
  schoolYear?: number;
}
