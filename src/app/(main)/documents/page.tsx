"use client";

import dynamic from "next/dynamic";

// Dynamic import for DocumentsGallery - loading state handled by loading.tsx
const DocumentsGallery = dynamic(
  () =>
    import("@/components/ui/documents-gallery").then((mod) => ({
      default: mod.DocumentsGallery,
    })),
  {
    ssr: false,
  }
);

export default function DocumentsPage() {
  return (
    <div className="w-full">
      <DocumentsGallery />
    </div>
  );
}
