export type DocumentType = "lesson_plan" | "quiz" | "presentation" | "assay";

export interface DocumentMetadata {
  initialPrompt?: string;
  [key: string]: unknown;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  documentType: DocumentType;
  metadata: DocumentMetadata;
  userId: string;
  createdAt: string;
  updatedAt: string;
  downloads: number;
  rating?: number;
  isPublic: boolean;
  subject?: string;
  gradeLevel?: string;
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
  documentType: "lesson_plan";
  metadata: LessonPlanMetadata;
}
