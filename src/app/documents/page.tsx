"use client";

import { DocumentsGallery } from "@/frontend/components/ui/documents-gallery";
import { useAuthStore } from "@/frontend/stores";

export default function DocumentsPage() {
  const { user} = useAuthStore();

  return (
    <div className="w-full">
      <DocumentsGallery userId={user?.id || ""} />
    </div>
  );
}
