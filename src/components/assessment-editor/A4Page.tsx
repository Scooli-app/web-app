"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAssessmentEditor } from "./context";

const A4_RATIO = 297 / 210;

/**
 * A paper sheet at A4 proportions with page-break guides and "página x de N". Like the files, a page ends before an
 * exercise ([data-page-item]) that would not fit, instead of cutting through it.
 * shortcut: page height and spacing are approximated from the screen, not the PDF's fonts; upgrade if they drift.
 */
export function A4Page({ children }: { children: ReactNode }) {
  return useAssessmentEditor().phone ? (
    <div className="w-full rounded-md border border-neutral-200 bg-white px-3 pb-6 pt-3 font-serif text-[15px] text-neutral-900 shadow-[0_2px_10px_rgba(0,0,0,0.06)] dark:border-neutral-700">{children}</div>
  ) : (
    <PaperSheet>{children}</PaperSheet>
  );
}

/**
 * Where each page ends (y from the sheet's top): before the first item that would cross the page's end, unless that
 * item starts the page (taller than a page: it is cut, as in the files).
 */
export function pageBreaks(items: { top: number; bottom: number }[], contentBottom: number, pageHeight: number): number[] {
  const breaks: number[] = [];
  let start = 0;
  while (contentBottom > start + pageHeight && breaks.length < 200) {
    const end = start + pageHeight;
    const crossing = items.find((it) => it.top < end && it.bottom > end);
    const at = crossing && crossing.top > start + 1 ? crossing.top : end;
    breaks.push(at);
    start = at;
  }
  return breaks;
}

function PaperSheet({ children }: { children: ReactNode }) {
  const t = useTranslations("assessmentEditor");
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({ pageHeight: 794 * A4_RATIO, breaks: [] as number[] });

  useEffect(() => {
    const sheet = sheetRef.current;
    const content = contentRef.current;
    if (!sheet || !content) return;
    const measure = () => {
      const pageHeight = sheet.offsetWidth * A4_RATIO;
      const items = Array.from(content.querySelectorAll<HTMLElement>("[data-page-item]")).map((el) => {
        const top = el.getBoundingClientRect().top - sheet.getBoundingClientRect().top;
        return { top, bottom: top + el.offsetHeight };
      });
      setLayout({ pageHeight, breaks: pageBreaks(items, content.offsetTop + content.offsetHeight, pageHeight) });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(sheet);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  const { pageHeight, breaks } = layout;
  const pages = breaks.length + 1;

  return (
    <div
      ref={sheetRef}
      className="relative mx-auto w-full max-w-[794px] rounded-md border border-neutral-200 bg-white font-serif text-[14px] text-neutral-900 shadow-[0_2px_10px_rgba(0,0,0,0.06)] dark:border-neutral-700"
      style={{ minHeight: (breaks.at(-1) ?? 0) + pageHeight }}
    >
      <div ref={contentRef} className="relative z-[1] px-6 pb-14 pt-8 sm:px-12">
        {children}
      </div>
      {Array.from({ length: pages }, (_, i) => (
        <div key={i} aria-hidden className="pointer-events-none absolute inset-x-0" style={{ top: (breaks[i] ?? (breaks.at(-1) ?? 0) + pageHeight) - 28 }}>
          <p className="pr-6 text-right font-sans text-[11px] font-semibold text-neutral-400">{t("page", { page: i + 1, total: pages })}</p>
          {i < pages - 1 && <div className="mt-2 border-t-2 border-dashed border-neutral-200" />}
        </div>
      ))}
    </div>
  );
}
