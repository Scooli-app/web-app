"use client";

import DocumentCreationPage from "@/components/document-creation/DocumentCreationPage";
import { documentTypes } from "@/components/document-creation/documentTypes";

export default function QuizPage() {
  return <DocumentCreationPage documentType={documentTypes.quiz} />;
}
