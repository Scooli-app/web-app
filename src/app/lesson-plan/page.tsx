"use client";

import DocumentCreationPage from "@/components/document-creation/DocumentCreationPage";
import { documentTypes } from "@/components/document-creation/documentTypes";

export default function LessonPlanPage() {
  return <DocumentCreationPage documentType={documentTypes.lesson_plan} />;
}
