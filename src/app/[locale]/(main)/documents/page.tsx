import { DocumentsGallery } from "@/components/ui/documents-gallery";
import { Suspense } from "react";
import DocumentsLoading from "./loading";

export default function DocumentsPage() {
  return (
    <div className="w-full">
      <Suspense fallback={<DocumentsLoading />}>
        <DocumentsGallery />
      </Suspense>
    </div>
  );
}
