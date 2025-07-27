export type DocumentType = "lesson_plan" | "quiz" | "presentation" | "assay";

export interface DocumentMetadata {
  initial_prompt?: string;
  [key: string]: unknown;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  document_type: DocumentType;
  metadata: DocumentMetadata;
  user_id: string;
  created_at: string;
  updated_at: string;
  downloads: number;
  rating: number;
  is_public: boolean;
  subject?: string;
  grade_level?: string;
  tags: string[];
}

export interface LessonActivity {
  title: string;
  description: string;
  duration: number;
  materials: string[];
  objectives: string[];
}

export interface LessonPlanMetadata extends DocumentMetadata {
  activities: LessonActivity[];
  totalDuration: number;
  learningObjectives: string[];
  assessmentMethods: string[];
}

export interface LessonPlan extends Document {
  document_type: "lesson_plan";
  metadata: LessonPlanMetadata;
}
