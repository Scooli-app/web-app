"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAssessmentEditor } from "./context";

const A4_RATIO = 297 / 210;

/**
 * A paper sheet at A4 proportions with page-break guides and "página x de N".
 * shortcut: breaks fall every A4 height, not where the exporter actually paginates; upgrade if teachers rely on them.
 */
export function A4Page({ children }: { children: ReactNode }) {
  return useAssessmentEditor().phone ? (
    <div className="w-full rounded-md border border-neutral-200 bg-white px-3 pb-6 pt-3 font-serif text-[15px] text-neutral-900 shadow-[0_2px_10px_rgba(0,0,0,0.06)] dark:border-neutral-700">{children}</div>
  ) : (
    <PaperSheet>{children}</PaperSheet>
  );
}

function PaperSheet({ children }: { children: ReactNode }) {
  const t = useTranslations("assessmentEditor");
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 794, content: 0 });

  useEffect(() => {
    const sheet = sheetRef.current;
    const content = contentRef.current;
    if (!sheet || !content) return;
    const observer = new ResizeObserver(() => setSize({ width: sheet.offsetWidth, content: content.offsetHeight }));
    observer.observe(sheet);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  const pageHeight = size.width * A4_RATIO;
  const pages = Math.max(1, Math.ceil(size.content / pageHeight));

  return (
    <div
      ref={sheetRef}
      className="relative mx-auto w-full max-w-[794px] rounded-md border border-neutral-200 bg-white font-serif text-[14px] text-neutral-900 shadow-[0_2px_10px_rgba(0,0,0,0.06)] dark:border-neutral-700"
      style={{ minHeight: pages * pageHeight }}
    >
      <div ref={contentRef} className="relative z-[1] px-6 pb-14 pt-8 sm:px-12">
        {children}
      </div>
      {Array.from({ length: pages }, (_, i) => (
        <div key={i} aria-hidden className="pointer-events-none absolute inset-x-0" style={{ top: (i + 1) * pageHeight - 28 }}>
          <p className="pr-6 text-right font-sans text-[11px] font-semibold text-neutral-400">{t("page", { page: i + 1, total: pages })}</p>
          {i < pages - 1 && <div className="mt-2 border-t-2 border-dashed border-neutral-200" />}
        </div>
      ))}
    </div>
  );
}
