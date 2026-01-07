"use client";

import DocumentCreationPage from "@/components/document-creation/DocumentCreationPage";
import { documentTypes } from "@/components/document-creation/documentTypes";

export default function PresentationPage() {
  return <DocumentCreationPage documentType={documentTypes.presentation} />;
}
