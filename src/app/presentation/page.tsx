"use client";

import DocumentCreationPage from "@/frontend/components/document-creation/DocumentCreationPage";
import { documentTypes } from "@/frontend/components/document-creation/documentTypes";

export default function PresentationPage() {
  return <DocumentCreationPage documentType={documentTypes.presentation} />;
}
