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
 *   - Swipe left / right on a phone → next / previous
 *   - Home / End → first / last
 *   - Esc → exit fullscreen + navigate back
 *   - Slide counter ("3 / 10") in the bottom corner, auto-hides after 2s
 *   - "Imprimir / PDF" via {@code window.print()} on a hidden print stylesheet
 *
 * Swap to Reveal.js when richer features land — same component contract.
 */
"use client";

import { isPresentationDoc } from "@/lib/documents/kind";
import { parsePresentationDocument, type PresentationDocument } from "@/shared/types/blocks";
import { CanvasSlideView } from "@/components/document-editor-v2/CanvasSlideView";
import { presentationToCanvas } from "@/components/document-editor-v2/canvas-layout";
import { isCanvasPresentation, type CanvasPresentation } from "@/shared/types/canvas-presentation";
import { fetchDocument } from "@/store/documents/documentSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { SlideRenderer } from "./SlideRenderer";

interface Props {
  documentId: string;
}

export function PresentView({ documentId }: Props) {
  const t = useTranslations("blocks.presentView");
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const document = useAppSelector((s) => s.documents.currentDocument);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [hudVisible, setHudVisible] = useState(true);
  const hudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  // Fetch the document.
  useEffect(() => {
    if (documentId) void dispatch(fetchDocument(documentId));
  }, [dispatch, documentId]);

  // Parse to typed model (memoized). Both v1 (layout-based) and v2
  // (canvas/position-based) content are rendered through CanvasSlideView so the
  // presenter is pixel-identical to the editor (same dark background, colours,
  // fonts and element positions). v1 content is converted with the exact same
  // `presentationToCanvas` the editor uses on load — without this, an un-resaved
  // (still-v1) deck rendered via the light SlideRenderer and looked white in
  // fullscreen while the editor showed it dark.
  const { canvasPresentation, parsed } = useMemo<{
    canvasPresentation: CanvasPresentation | null;
    parsed: PresentationDocument | null;
  }>(() => {
    if (!document || !isPresentationDoc(document) || !document.content) {
      return { canvasPresentation: null, parsed: null };
    }
    try {
      const raw: unknown = JSON.parse(document.content);
      if (isCanvasPresentation(raw)) {
        // v2 canvas format — render directly via CanvasSlideView
        return { canvasPresentation: raw, parsed: null };
      }
      // v1 layout format — convert to canvas so it matches the editor exactly.
      return { canvasPresentation: presentationToCanvas(parsePresentationDocument(document.content)), parsed: null };
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
  const requestedSlideParam = searchParams.get("slide");
  const requestedSlide = requestedSlideParam === null
    ? 0
    : Number.parseInt(requestedSlideParam, 10);

  useEffect(() => {
    if (total <= 0) {
      setCurrentIdx(0);
      return;
    }
    const safeIdx = Number.isFinite(requestedSlide) ? requestedSlide : 0;
    setCurrentIdx(Math.min(Math.max(safeIdx, 0), total - 1));
  }, [requestedSlide, total]);

  /* Navigation handlers ------------------------------------------------- */

  const next = useCallback(() => {
    setCurrentIdx((i) => Math.min(Math.max(total - 1, 0), i + 1));
  }, [total]);
  const prev = useCallback(() => {
    setCurrentIdx((i) => Math.max(0, i - 1));
  }, []);
  const first = useCallback(() => setCurrentIdx(0), []);
  const last = useCallback(() => setCurrentIdx(Math.max(total - 1, 0)), [total]);

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

  // Warm the browser cache with the next slide's images so moving on doesn't show empty boxes.
  useEffect(() => {
    const upcoming = canvasPresentation?.slides.filter((sl) => !sl.hidden)[currentIdx + 1];
    for (const el of upcoming?.elements ?? []) {
      if (el.type !== "image_placeholder" || !el.url) continue;
      const img = new window.Image();
      img.crossOrigin = "anonymous"; // same mode as CanvasSlideView, so the cached copy is reused
      img.src = el.url;
    }
  }, [canvasPresentation, currentIdx]);

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

  // Tap or click: left third goes back, the rest goes forward (the usual presenter convention).
  const onSurfaceClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    showHud();
    if (e.clientX < window.innerWidth / 3) prev();
    else next();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex select-none flex-col items-center justify-center bg-black"
      onClick={onSurfaceClick}
      onMouseMove={showHud}
      onTouchStart={(e) => {
        touchStartXRef.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchStartXRef.current;
        const end = e.changedTouches[0]?.clientX;
        touchStartXRef.current = null;
        if (start === null || end === undefined || Math.abs(end - start) < 50) return;
        // A swipe: don't let the synthetic click that may follow navigate a second time.
        e.preventDefault();
        showHud();
        if (end < start) next();
        else prev();
      }}
    >
      {/* Slide: full width on a phone held upright, otherwise the largest 16:9 box that fits. */}
      <div className="w-[min(96vw,calc(96dvh*16/9))] portrait:w-screen">
        {currentCanvasSlide ? (
          /* v2 canvas presentation — rendered with exact background + styling */
          <CanvasSlideView slide={currentCanvasSlide} />
        ) : currentV1Slide ? (
          /* v1 layout-based presentation */
          <SlideRenderer slide={currentV1Slide} />
        ) : null}
      </div>

      {/* Phone held upright: the slide is small, suggest turning it. */}
      <p className="pointer-events-none mt-6 hidden rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/80 pointer-coarse:portrait:block">
        {t("rotateHint")}
      </p>

      {/* Exit: top-right, where people look for it. Fades with the rest of the HUD. */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          exit();
        }}
        className={`fixed right-[max(1rem,env(safe-area-inset-right))] top-[max(1rem,env(safe-area-inset-top))] rounded-full bg-white/10 p-2.5 text-white backdrop-blur-sm transition-[opacity,background-color] duration-300 hover:bg-white/20 ${
          hudVisible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-label={t("exitAriaLabel")}
      >
        <X className="h-5 w-5" />
      </button>

      {/* HUD: counter + arrows. Shown for 5s after any mouse move or tap. */}
      <div
        className={`pointer-events-none fixed inset-x-0 bottom-0 flex items-center justify-center gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] transition-opacity duration-300 ${
          hudVisible ? "opacity-100" : "opacity-0"
        }`}
        onMouseEnter={showHud}
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); prev(); showHud(); }}
          disabled={currentIdx === 0}
          className={`${hudVisible ? "pointer-events-auto" : ""} rounded-full bg-white/10 p-2.5 text-white backdrop-blur-sm transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30`}
          aria-label={t("prevSlideAriaLabel")}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="min-w-16 rounded-full bg-white/10 px-3 py-1.5 text-center text-xs font-semibold tabular-nums text-white backdrop-blur-sm">
          {currentIdx + 1} / {total}
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); next(); showHud(); }}
          disabled={currentIdx === total - 1}
          className={`${hudVisible ? "pointer-events-auto" : ""} rounded-full bg-white/10 p-2.5 text-white backdrop-blur-sm transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30`}
          aria-label={t("nextSlideAriaLabel")}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Progress: always there, faint, so the class sees how far along the lesson is. */}
      <div aria-hidden className="pointer-events-none fixed inset-x-0 bottom-0 h-0.5 bg-white/10">
        <div
          className="h-full bg-white/50 transition-[width] duration-300"
          style={{ width: `${total > 0 ? ((currentIdx + 1) / total) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
}
