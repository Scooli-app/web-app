"use client";

import { DocumentCreationPage, documentTypes } from "@/components/document-creation";

export default function WorksheetPage() {
  return <DocumentCreationPage documentType={documentTypes.worksheet} />;
}
