/**
 * PresentView — fullscreen classroom presenter for a JSON document.
 *
 * SCOOL-132 v1 implementation. Custom (not Reveal.js): the architecture page
 * commits to Reveal.js for the long-term renderer to get presenter view,
 * transitions, fragments, and the print stylesheet for free. This v1 ships a
 * lighter dependency-free viewer that covers the immediate classroom needs:
 *
 *   - Fullscreen on mount (release on unmount / Esc)
 *   - Arrow Right / Space / PageDown / click → next slide
 *   - Arrow Left / PageUp → previous
 *   - Home / End → first / last
 *   - Esc → exit fullscreen + navigate back
 *   - Slide counter ("3 / 10") in the bottom corner, auto-hides after 2s
 *   - "Imprimir / PDF" via {@code window.print()} on a hidden print stylesheet
 *
 * Swap to Reveal.js when richer features land — same component contract.
 */
"use client";

import { parsePresentationDocument, type PresentationDocument } from "@/shared/types/blocks";
import { CanvasSlideView } from "@/components/document-editor-v2/CanvasSlideView";
import { isCanvasPresentation, type CanvasPresentation } from "@/shared/types/canvas-presentation";
import { fetchDocument } from "@/store/documents/documentSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { ChevronLeft, ChevronRight, Loader2, Printer, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SlideRenderer } from "./SlideRenderer";

interface Props {
  documentId: string;
}

export function PresentView({ documentId }: Props) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const document = useAppSelector((s) => s.documents.currentDocument);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [hudVisible, setHudVisible] = useState(true);
  const hudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch the document.
  useEffect(() => {
    if (documentId) void dispatch(fetchDocument(documentId));
  }, [dispatch, documentId]);

  // Parse to typed model (memoized). Handles both v1 (layout-based) and
  // v2 (canvas/position-based) content formats.
  //
  // v2 canvas presentations are stored as-is so CanvasSlideView can render
  // them with the correct background, colours, fonts and element positions.
  // v1 presentations fall through to the legacy SlideRenderer.
  const { canvasPresentation, parsed } = useMemo<{
    canvasPresentation: CanvasPresentation | null;
    parsed: PresentationDocument | null;
  }>(() => {
    if (!document || document.contentFormat !== "json" || !document.content) {
      return { canvasPresentation: null, parsed: null };
    }
    try {
      const raw: unknown = JSON.parse(document.content);
      if (isCanvasPresentation(raw)) {
        // v2 canvas format — render directly via CanvasSlideView
        return { canvasPresentation: raw, parsed: null };
      }
      return { canvasPresentation: null, parsed: parsePresentationDocument(document.content) };
    } catch {
      return { canvasPresentation: null, parsed: null };
    }
  }, [document]);

  // For canvas presentations, filter out hidden slides for the presentation view.
  const visibleCanvasSlides = canvasPresentation
    ? canvasPresentation.slides.filter((s) => !s.hidden)
    : null;

  const total = visibleCanvasSlides
    ? visibleCanvasSlides.length
    : (parsed?.blocks.length ?? 0);

  /* Navigation handlers ------------------------------------------------- */

  const next = useCallback(() => {
    setCurrentIdx((i) => Math.min(total - 1, i + 1));
  }, [total]);
  const prev = useCallback(() => {
    setCurrentIdx((i) => Math.max(0, i - 1));
  }, []);
  const first = useCallback(() => setCurrentIdx(0), []);
  const last = useCallback(() => setCurrentIdx(total - 1), [total]);

  // Guard against double-navigation (keydown handler + fullscreenchange can both fire).
  const hasExitedRef = useRef(false);
  const exit = useCallback(() => {
    if (hasExitedRef.current) return;
    hasExitedRef.current = true;
    if (window.document.fullscreenElement) {
      void window.document.exitFullscreen().catch(() => undefined);
    }
    router.back();
  }, [router]);

  /* Fullscreen on mount, release on unmount ----------------------------- */

  useEffect(() => {
    const el = window.document.documentElement;
    el.requestFullscreen?.().catch(() => undefined);
    return () => {
      if (window.document.fullscreenElement) {
        void window.document.exitFullscreen().catch(() => undefined);
      }
    };
  }, []);

  // Navigate back whenever the user exits fullscreen (e.g. by pressing Esc in
  // browsers that swallow the keydown event for fullscreen exit).
  useEffect(() => {
    const onFullscreenChange = () => {
      if (!window.document.fullscreenElement) exit();
    };
    window.document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => window.document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [exit]);

  /* Keyboard nav -------------------------------------------------------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
        case " ":
        case "PageDown":
          e.preventDefault();
          next();
          break;
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          prev();
          break;
        case "Home":
          e.preventDefault();
          first();
          break;
        case "End":
          e.preventDefault();
          last();
          break;
        case "Escape":
          // Browser will release fullscreen on its own; we navigate back too.
          // Defer briefly so the fullscreen exit settles first.
          window.setTimeout(exit, 0);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, first, last, exit]);

  /* Auto-hiding HUD ----------------------------------------------------- */

  const showHud = useCallback(() => {
    setHudVisible(true);
    if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    hudTimerRef.current = setTimeout(() => setHudVisible(false), 5000);
  }, []);

  useEffect(() => {
    showHud();
    return () => {
      if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    };
  }, [showHud]);

  /* Render branches ----------------------------------------------------- */

  if (!canvasPresentation && !parsed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black text-white">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Resolve current slide for either format (canvas uses the filtered visible list)
  const currentCanvasSlide = visibleCanvasSlides?.[currentIdx] ?? null;
  const currentV1Slide = parsed?.blocks[currentIdx] ?? null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black"
      onClick={next}
      onMouseMove={showHud}
    >
      {/* Slide — clicked area = next slide. Stop propagation in nested links/buttons. */}
      <div
        className="w-[min(96vw,calc(96vh*16/9))] max-h-[96vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {currentCanvasSlide ? (
          /* v2 canvas presentation — rendered with exact background + styling */
          <CanvasSlideView slide={currentCanvasSlide} />
        ) : currentV1Slide ? (
          /* v1 layout-based presentation */
          <SlideRenderer slide={currentV1Slide} />
        ) : null}
      </div>

      {/* HUD: counter + controls. Shown for 5s after any mouse move, stays
          visible while the cursor is over it so teachers can click the buttons. */}
      <div
        className={`pointer-events-none fixed inset-x-0 bottom-0 flex items-end justify-between p-4 transition-opacity duration-300 ${
          hudVisible ? "opacity-100" : "opacity-0"
        }`}
        onMouseEnter={showHud}
      >
        {/* Left: slide counter */}
        <div className="pointer-events-auto rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
          {currentIdx + 1} / {total}
        </div>

        {/* Centre: ← → navigation arrows */}
        <div className="pointer-events-auto flex gap-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            disabled={currentIdx === 0}
            className="rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Slide anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next(); }}
            disabled={currentIdx === total - 1}
            className="rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Próximo slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Right: print + exit */}
        <div className="pointer-events-auto flex gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              window.print();
            }}
            className="rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            aria-label="Imprimir ou exportar PDF"
          >
            <Printer className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              exit();
            }}
            className="rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            aria-label="Sair da apresentação"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Print stylesheet: one slide per page, no HUD, full bleed. */}
      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 0;
          }
          body * {
            visibility: hidden;
          }
          .scooli-print-deck,
          .scooli-print-deck * {
            visibility: visible;
          }
          .scooli-print-deck {
            position: absolute;
            inset: 0;
            background: white;
          }
        }
      `}</style>

      {/* Hidden print-only deck: render every slide so window.print() captures
          all of them, one per page. The on-screen viewer above is hidden by the
          print stylesheet. */}
      <div className="scooli-print-deck hidden print:block">
        {visibleCanvasSlides
          ? visibleCanvasSlides.map((slide) => (
              <div key={slide.id} className="break-after-page" style={{ width: "100vw", height: "100vh" }}>
                <CanvasSlideView slide={slide} />
              </div>
            ))
          : parsed?.blocks.map((slide) => (
              <div key={slide.id} className="break-after-page" style={{ width: "100vw", height: "100vh" }}>
                <SlideRenderer slide={slide} />
              </div>
            ))}
      </div>
    </div>
  );
}
