/**
 * Document types and interfaces
 */

export interface Document {
  id: string;
  user_id: string;
  title: string;
  content: string;
  document_type: DocumentType;
  metadata: Record<string, unknown>;
  // Community features
  is_public: boolean;
  downloads: number;
  rating: number;
  tags: string[];
  // Timestamps
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export type DocumentType =
  | "lesson_plan"
  | "assessment"
  | "activity"
  | "curriculum_analysis";

export interface CreateDocumentRequest {
  title: string;
  document_type: DocumentType;
  content?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateDocumentRequest {
  title?: string;
  content?: string;
  metadata?: Record<string, unknown>;
}

export interface DeleteDocumentRequest {
  ids: string[];
}

export interface DocumentMetadata {
  subject?: string;
  grade?: string;
  topic?: string;
  objectives?: string[];
  duration?: string;
  materials?: string[];
  [key: string]: unknown;
}

export interface LessonPlanMetadata extends DocumentMetadata {
  subject: string;
  grade: string;
  topic: string;
  objectives: string[];
  duration: string;
  materials: string[];
  assessment_methods?: string[];
  differentiation_strategies?: string[];
}

// Lesson Plan Types
export interface LessonPlan {
  id: string;
  title: string;
  content: string;
  subject: string;
  grade_level: string;
  duration: number; // in minutes
  objectives: string[];
  materials: string[];
  activities: LessonActivity[];
  assessment: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface LessonActivity {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
  type: "individual" | "group" | "whole_class";
}
