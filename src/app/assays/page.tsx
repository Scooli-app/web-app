"use client";

import { DocumentCreationPage, documentTypes } from "@/components/document-creation";

export default function TestPage() {
  return <DocumentCreationPage documentType={documentTypes.assay} />;
}
