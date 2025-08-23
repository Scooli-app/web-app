"use client";

import { DocumentsGallery } from "@/frontend/components/ui/documents-gallery";
import { useAppSelector } from "@/store/hooks";

export default function DocumentsPage() {
  const { user } = useAppSelector((state) => state.auth);

  return (
    <div className="w-full">
      <DocumentsGallery userId={user?.id || ""} />
    </div>
  );
}
