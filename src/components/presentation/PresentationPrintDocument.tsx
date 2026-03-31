import type { CSSProperties } from "react";
import type { PresentationExportPayload } from "@/shared/types/presentation";
import { PresentationSlideRenderer } from "./PresentationSlideRenderer";

interface PresentationPrintDocumentProps {
  presentation: PresentationExportPayload;
}

const slidePageStyle: CSSProperties = {
  width: "13.333in",
  margin: "0 auto",
};

export function PresentationPrintDocument({
  presentation,
}: PresentationPrintDocumentProps) {
  return (
    <main
      style={{
        padding: "0.24in 0",
        display: "grid",
        gap: "0.24in",
        background: "#eef2f7",
      }}
    >
      {presentation.content.slides.map((slide, index) => (
        <section
          key={slide.id}
          style={{
            ...slidePageStyle,
            breakAfter:
              index === presentation.content.slides.length - 1 ? "auto" : "page",
            pageBreakAfter:
              index === presentation.content.slides.length - 1 ? "auto" : "always",
          }}
        >
          <PresentationSlideRenderer
            slide={slide}
            themeId={presentation.themeId}
            assets={presentation.assets}
            readOnly
          />
        </section>
      ))}
    </main>
  );
}
