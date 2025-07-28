"use client";

import DocumentCreationPage from "@/frontend/components/document-creation/DocumentCreationPage";
import { documentTypes } from "@/frontend/components/document-creation/documentTypes";

export default function QuizPage() {
  return <DocumentCreationPage documentType={documentTypes.quiz} />;
}
