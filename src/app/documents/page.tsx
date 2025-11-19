"use client";

import { DocumentsGallery } from "@/frontend/components/ui/documents-gallery";

export default function DocumentsPage() {
  // TODO: Get userId from context or props when auth is re-implemented
  const userId = "";

  return (
    <div className="w-full">
      <DocumentsGallery userId={userId} />
    </div>
  );
}
