import type { Document, DocumentMetadata } from "./document";

export interface LessonActivity {
  id: string;
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
  [key: string]: unknown | LessonActivity[] | number | string[];
}

export interface LessonPlan extends Document {
  documentType: "lesson_plan";
  metadata: LessonPlanMetadata;
  activities: LessonActivity[]; // Direct access for convenience
}
