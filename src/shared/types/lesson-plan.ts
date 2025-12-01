/**
 * Lesson Plan specific types
 */

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
  documentType: "lessonPlan";
  metadata: LessonPlanMetadata;
  activities: LessonActivity[];
}
