/**
 * Read-only renderer for a full {@link PresentationDocument}. Used for the
 * share view + dashboard preview (live, not as a still image). The editor uses
 * its own component that wraps the same SlideRenderer with edit affordances.
 */
"use client";

import type { PresentationDocument } from "@/shared/types/blocks";
import { SlideRenderer } from "./SlideRenderer";

export function BlockDocumentRenderer({
  document,
  className,
}: {
  document: PresentationDocument;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-6 ${className ?? ""}`}>
      {document.blocks.map((slide) => (
        <SlideRenderer key={slide.id} slide={slide} />
      ))}
    </div>
  );
}
