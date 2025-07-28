"use client";

import DocumentCreationPage from "@/frontend/components/document-creation/DocumentCreationPage";
import { documentTypes } from "@/frontend/components/document-creation/documentTypes";

export default function TestPage() {
  return <DocumentCreationPage documentType={documentTypes.assay} />;
}
