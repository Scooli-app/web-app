"use client";

import { DocumentsGallery } from "@/components/ui/documents-gallery";

export default function DocumentsPage() {
  // TODO: Get userId from context or props when auth is re-implemented
  // For now, using a mock userId - replace with actual user ID from auth context
  const userId = "mock-user-id";

  return (
    <div className="w-full">
      <DocumentsGallery userId={userId} />
    </div>
  );
}
