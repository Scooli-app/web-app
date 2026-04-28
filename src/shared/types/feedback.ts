export enum FeedbackType {
  SUGGESTION = "SUGGESTION",
  BUG = "BUG",
}

export enum FeedbackStatus {
  SUBMITTED = "SUBMITTED",
  IN_REVIEW = "IN_REVIEW",
  IN_DEVELOPMENT = "IN_DEVELOPMENT",
  RESOLVED = "RESOLVED",
  REJECTED = "REJECTED",
}

export enum BugSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export interface FeedbackAttachment {
  id?: string;
  fileUrl: string;
  filePath: string;
  fileType?: string;
}

export interface CreateFeedbackAttachment {
  fileUrl: string;
  filePath: string;
  fileType?: string;
}

export interface FeedbackResponseMessage {
  id: string;
  adminId: string;
  content: string;
  createdAt: string;
}

export interface Feedback {
  id: string;
  userId: string;
  type: FeedbackType;
  title: string;
  description: string;
  category?: string;
  bugType?: string;
  severity?: BugSeverity;
  reproductionSteps?: string;
  status: FeedbackStatus;
  createdAt: string;
  updatedAt: string;
  attachments?: FeedbackAttachment[];
  responses?: FeedbackResponseMessage[];
}

export interface CreateFeedbackParams {
  id?: string;
  type: FeedbackType;
  title: string;
  description: string;
  category?: string;
  bugType?: string;
  severity?: BugSeverity;
  reproductionSteps?: string;
  attachments?: CreateFeedbackAttachment[];
}

export interface UploadResponse {
  fileId: string;
  filePath: string;
  fileUrl: string;
}
