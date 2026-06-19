/**
 * BlockDocumentEditor — PowerPoint-style canvas presentation editor.
 *
 * Layout (3 columns, like Teachy):
 *   ┌────────────────────────────────────────────────────────────────────┐
 *   │  Main toolbar  (title · undo/redo · +Text · Theme · Export · …)   │
 *   │  Contextual bar (formatting / AI actions — only when el selected)  │
 *   ├──────────────┬────────────────────────────────┬────────────────────┤
 *   │  Slide       │  Main canvas (active slide)     │  AI Chat panel     │
 *   │  sidebar     │                                 │  (desktop: fixed   │
 *   │  (thumbs)    │                                 │  width; mobile:    │
 *   │              │                                 │  floating button)  │
 *   └──────────────┴────────────────────────────────┴────────────────────┘
 *
 * Features:
 *   - Slide sidebar with live Konva thumbnails + hover controls (↑ trash ↓)
 *   - Single active slide in main canvas
 *   - Contextual formatting toolbar (text: B/I/align/size/colour; image: info)
 *   - AI quick-actions inline in the contextual bar (Simplificar / Expandir)
 *   - AI Chat panel (reuses AIChatPanel + chatWithDocument thunk)
 *   - Theme picker (8 palettes)
 *   - Undo / Redo (Ctrl+Z / Ctrl+Y, max 20 steps)
 *   - Save → v2 CanvasPresentation JSON
 *   - Native PPTX export (programmatic pptxgenjs — editable in PowerPoint)
 *   - Present (fullscreen route)
 */
"use client";

import AIChatPanel from "@/components/document-editor/AIChatPanel";
import { GenerationProgress } from "@/components/blocks/GenerationProgress";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useGenerationProgress } from "@/hooks/useGenerationProgress";
import { parsePresentationDocument, slideBlockSchema } from "@/shared/types/blocks";
import type { RagSource } from "@/shared/types/document";
import {
  isCanvasPresentation,
  type CanvasElement,
  type CanvasImageElement,
  type CanvasListElement,
  type CanvasMathElement,
  type CanvasPresentation,
  type CanvasShapeElement,
  type CanvasSlide,
  type CanvasTextElement,
} from "@/shared/types/canvas-presentation";
import { getThemeById } from "@/shared/types/presentation-theme";
import { Routes } from "@/shared/types";
import { fetchDocument, updateDocument, chatWithDocument } from "@/store/documents/documentSlice";
import { regenerateDocumentImage as regenerateDocumentImageApi, generateDocumentImage as generateDocumentImageApi } from "@/services/api/document-images.service";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectIsPro } from "@/store/subscription/selectors";
import { selectEntitlementLoading } from "@/store/entitlements/selectors";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  ChevronUp,
  Circle,
  Minus,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileText,
  Image as ImageIcon,
  Italic,
  Loader2,
  MoreHorizontal,
  Play,
  Plus,
  Shapes,
  Redo2,
  Sigma,
  Sparkles,
  Square,
  Trash2,
  Underline,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { generateSlide as generateSlideApi } from "@/services/api/document.service";
import { applyTheme, clampCanvasSlide, presentationToCanvas, slideToCanvas } from "./canvas-layout";
import { ImagePickerModal, type ImageInsertResult } from "./ImagePickerModal";
import { ColorPickerPopover } from "./ColorPickerPopover";
import { FormulaModal } from "./FormulaModal";
import { SlideKonvaEditor, type SlideKonvaEditorHandle } from "./SlideKonvaEditor";
import { SlideThumbnail } from "./SlideThumbnail";
import { ThemePicker } from "./ThemePicker";
import { renderKatexToPngDataUrl } from "./math-render";

interface Props {
  documentId: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  /** Show Sim/Não image-regen offer buttons below this message */
  imageRegenOffer?: boolean;
  /** Set after user clicks Sim or Não to hide buttons */
  imageRegenResolved?: boolean;
  hasUpdate?: boolean;
}

/* --------------------------------------------------------------------------
 * Helpers
 * -------------------------------------------------------------------------- */

/** Sanitize any CSS colour to 6-char uppercase hex for pptxgenjs. */
function toHex6(color: string): string {
  if (color.startsWith("#")) {
    const h = color.slice(1);
    if (h.length === 3) return h.split("").map((c) => c + c).join("").toUpperCase();
    return h.substring(0, 6).toUpperCase();
  }
  const m = color.match(/[\d.]+/g);
  if (m && m.length >= 3) {
    return [m[0], m[1], m[2]]
      .map((n) => Math.round(parseFloat(n)).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  }
  return "FFFFFF";
}

/** Convert any CSS colour to { r, g, b } in 0–1 range for pdf-lib. */
function hexToRgb01(color: string): { r: number; g: number; b: number } {
  const hex = toHex6(color);
  return {
    r: parseInt(hex.substring(0, 2), 16) / 255,
    g: parseInt(hex.substring(2, 4), 16) / 255,
    b: parseInt(hex.substring(4, 6), 16) / 255,
  };
}

type FontStyle = CanvasTextElement["fontStyle"];
function toggleBold(s: FontStyle): FontStyle {
  if (s === "bold") return "normal";
  if (s === "bold italic") return "italic";
  if (s === "italic") return "bold italic";
  return "bold";
}
function toggleItalic(s: FontStyle): FontStyle {
  if (s === "italic") return "normal";
  if (s === "bold italic") return "bold";
  if (s === "bold") return "bold italic";
  return "italic";
}

/** Fonts available in the slide editor. CSS variable names match next/font variables in layout.tsx */
const FONT_OPTIONS = [
  { label: "Padrão",      value: "",                    cssVar: "var(--font-lexend-variable, sans-serif)" },
  { label: "Poppins",     value: "Poppins",             cssVar: "var(--font-poppins, sans-serif)" },
  { label: "Montserrat",  value: "Montserrat",          cssVar: "var(--font-montserrat, sans-serif)" },
  { label: "Raleway",     value: "Raleway",             cssVar: "var(--font-raleway, sans-serif)" },
  { label: "Lato",        value: "Lato",                cssVar: "var(--font-lato, sans-serif)" },
  { label: "Merriweather",value: "Merriweather",        cssVar: "var(--font-merriweather, serif)" },
] as const;

const DEFAULT_SHAPE_FILL = "rgba(103, 83, 255, 0.22)";
const DEFAULT_SHAPE_STROKE = "#6753FF";
const DEFAULT_SHAPE_STROKE_WIDTH = 0.004;

type PdfFontLike = {
  widthOfTextAtSize: (text: string, size: number) => number;
};

function sanitizeWinAnsiText(text: string): string {
  return text
    .replace(/\u2022/g, "-")
    .replace(/[−–—]/g, "-")
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/\u00a0/g, " ")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "");
}

function splitLongPdfWord(word: string, maxWidth: number, font: PdfFontLike, fontSize: number): string[] {
  const parts: string[] = [];
  let chunk = "";
  for (const char of word) {
    const candidate = `${chunk}${char}`;
    if (chunk && font.widthOfTextAtSize(candidate, fontSize) > maxWidth) {
      parts.push(chunk);
      chunk = char;
    } else {
      chunk = candidate;
    }
  }
  if (chunk) parts.push(chunk);
  return parts;
}

function wrapPdfText(text: string, maxWidth: number, font: PdfFontLike, fontSize: number): string[] {
  const sanitized = sanitizeWinAnsiText(text);
  const paragraphs = sanitized.split(/\r?\n/);
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }

    let currentLine = "";
    for (const word of words) {
      const wordParts =
        font.widthOfTextAtSize(word, fontSize) > maxWidth
          ? splitLongPdfWord(word, maxWidth, font, fontSize)
          : [word];

      for (const part of wordParts) {
        const candidate = currentLine ? `${currentLine} ${part}` : part;
        if (currentLine && font.widthOfTextAtSize(candidate, fontSize) > maxWidth) {
          lines.push(currentLine);
          currentLine = part;
        } else {
          currentLine = candidate;
        }
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines.length > 0 ? lines : [""];
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Falha ao converter imagem"));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("Falha ao converter imagem"));
    reader.readAsDataURL(blob);
  });
}

async function fetchImageAsset(url: string): Promise<{ bytes: Uint8Array; contentType: string; dataUrl: string } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const dataUrl = await blobToDataUrl(blob);
    return {
      bytes,
      contentType: response.headers.get("content-type") || blob.type || "",
      dataUrl,
    };
  } catch {
    return null;
  }
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}


function makeNewSlide(themeId?: string): CanvasSlide {
  const theme = getThemeById(themeId ?? "dark");
  const id = `s${Date.now().toString(36)}`;
  const titleEl: CanvasTextElement = {
    id: `${id}-title`,
    type: "text",
    x: 0.04, y: 0.071, w: 0.92, h: 0.17,
    text: "Novo Slide",
    fontSize: 0.036,
    fontStyle: "bold",
    color: theme.titleColor,
    align: "left",
    role: "title",
  };
  // Use title-content layout so the theme applies content-slide decorations
  // (not the heavy cover decorations reserved for the first slide).
  return { id, layout: "title-content", background: theme.bg, elements: [titleEl] };
}


function buildGeneratedCanvasSlide(slide: CanvasSlide, themeId?: string): CanvasSlide {
  const freshSlideId = `s${Date.now().toString(36)}`;
  let elementCounter = 0;
  const nextElementId = () => `${freshSlideId}-e${(++elementCounter).toString(36)}`;

  const dedupedSlide: CanvasSlide = {
    ...slide,
    id: freshSlideId,
    hidden: false,
    elements: slide.elements.map((el) => {
      const freshElementId = nextElementId();
      if (el.type === "bullet_list" || el.type === "ordered_list") {
        return { ...el, id: freshElementId, blockId: freshElementId };
      }
      if (el.type === "math") {
        return { ...el, id: freshElementId, blockId: freshElementId };
      }
      return { ...el, id: freshElementId };
    }),
  };

  const tid = themeId ?? "dark";
  return (
    applyTheme(
      { schemaVersion: 2, documentType: "presentation", slides: [dedupedSlide] },
      tid,
    ).slides[0] ?? dedupedSlide
  );
}

function makeShapeElement(shape: CanvasShapeElement["shape"]): CanvasShapeElement {
  const id = `shape-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const base: Pick<CanvasShapeElement, "id" | "type" | "shape" | "fill" | "stroke" | "strokeWidth" | "rotation"> = {
    id,
    type: "shape",
    shape,
    fill: DEFAULT_SHAPE_FILL,
    stroke: DEFAULT_SHAPE_STROKE,
    strokeWidth: DEFAULT_SHAPE_STROKE_WIDTH,
    rotation: 0,
  };

  if (shape === "line") {
    return {
      ...base,
      x: 0.3,
      y: 0.49,
      w: 0.4,
      h: 0.02,
    };
  }

  return {
    ...base,
    x: 0.35,
    y: 0.35,
    w: 0.3,
    h: 0.3,
  };
}

function makeMathElement(tex: string): CanvasMathElement {
  const id = `math-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  return {
    id,
    type: "math",
    x: 0.28,
    y: 0.40,
    w: 0.44,
    h: 0.14,
    tex,
    fontSize: 0.034,
    display: true,
    blockId: id,
  };
}

function PresentationEditorLoadingState() {
  return (
    <div className="flex min-h-[400px] w-full items-center justify-center">
      <div className="flex items-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-lg text-muted-foreground">A carregar apresentação...</span>
      </div>
    </div>
  );
}

function getPresentSlideIndex(slides: CanvasSlide[], activeSlideId: string | null): number {
  const visibleSlides = slides.filter((slide) => !slide.hidden);
  if (visibleSlides.length === 0) return 0;
  const directVisibleIdx = visibleSlides.findIndex((slide) => slide.id === activeSlideId);
  if (directVisibleIdx >= 0) return directVisibleIdx;

  const activeIdx = slides.findIndex((slide) => slide.id === activeSlideId);
  if (activeIdx < 0) return 0;

  for (let offset = 1; offset < slides.length; offset += 1) {
    const prev = slides[activeIdx - offset];
    if (prev && !prev.hidden) {
      return visibleSlides.findIndex((slide) => slide.id === prev.id);
    }
    const next = slides[activeIdx + offset];
    if (next && !next.hidden) {
      return visibleSlides.findIndex((slide) => slide.id === next.id);
    }
  }

  return 0;
}

/* --------------------------------------------------------------------------
 * Component
 * -------------------------------------------------------------------------- */
export function BlockDocumentEditor({ documentId }: Props) {
  const dispatch = useAppDispatch();
  const rawDocument = useAppSelector((s) => s.documents.currentDocument);
  const document = rawDocument?.id === documentId ? rawDocument : null;

  // Derive RAG sources for the "Fontes" tab — same pattern as DocumentEditor.
  const sources: RagSource[] = Array.isArray(document?.sources)
    ? (document.sources as RagSource[])
    : Array.isArray(document?.metadata?.sources)
      ? (document.metadata.sources as RagSource[])
      : [];
  const isLoading = useAppSelector((s) => s.documents.isLoading);
  const loadingDocumentId = useAppSelector((s) => s.documents.loadingDocumentId);
  const isPremium = useAppSelector(selectIsPro);
  const isEntitlementLoading = useAppSelector(selectEntitlementLoading);
  const searchParams = useSearchParams();
  const urlThemeId = searchParams.get("theme") ?? undefined;

  useEffect(() => {
    if (documentId) void dispatch(fetchDocument(documentId));
  }, [dispatch, documentId]);

  // Lock the page scroll while the editor is mounted — this is a full-viewport
  // canvas app and any body overflow causes jarring layout shifts.
  useEffect(() => {
    const html = window.document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => { html.style.overflow = prev; };
  }, []);

  /* ── Generation progress ─────────────────────────────────────────────── */
  const inProgress =
    !!document &&
    (document.status === "generating" || document.status === "processing");

  const progress = useGenerationProgress({
    documentId: inProgress ? documentId : null,
  });

  useEffect(() => {
    if (progress.isDone) void dispatch(fetchDocument(documentId));
  }, [progress.isDone, documentId, dispatch]);

  /* ── Parse document content → CanvasPresentation ────────────────────── */
  const canvasFromDoc = useMemo<CanvasPresentation | null>(() => {
    if (!document || document.contentFormat !== "json" || !document.content) return null;
    try {
      const raw: unknown = JSON.parse(document.content);
      if (isCanvasPresentation(raw)) {
        // Clamp any elements that drifted out-of-bounds in a previous session.
        return { ...raw, slides: raw.slides.map(clampCanvasSlide) };
      }
      const v1 = parsePresentationDocument(document.content);
      return presentationToCanvas(v1);
    } catch {
      return null;
    }
  }, [document]);

  /* ── Working canvas state ────────────────────────────────────────────── */
  const [canvas, setCanvas] = useState<CanvasPresentation | null>(null);
  const [activeSlideId, setActiveSlideId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Zoom ──────────────────────────────────────────────────────────────── */
  const [zoom, setZoom] = useState(1.0);
  const ZOOM_MIN = 0.25;
  const ZOOM_MAX = 2.0;

  /* ── Image toolbar state ─────────────────────────────────────────────── */
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [formulaModalOpen, setFormulaModalOpen] = useState(false);
  /** Non-null when the formula modal is editing an existing math element. */
  const [editingMathId, setEditingMathId] = useState<string | null>(null);
  /** true = replacing an existing selected image; false = inserting a new one */
  const [imageModalReplacing, setImageModalReplacing] = useState(false);
  const [addSlideMenuOpen, setAddSlideMenuOpen] = useState(false);
  const [generateSlideDialogOpen, setGenerateSlideDialogOpen] = useState(false);
  const [generateSlideTopic, setGenerateSlideTopic] = useState("");
  const [isGeneratingSlide, setIsGeneratingSlide] = useState(false);

  useEffect(() => {
    if (canvasFromDoc) {
      // Only do a full reset the very first time this document's canvas is
      // initialised (canvasRef.current is null).  When canvasRef already has
      // content the update comes from our own auto-save writing back through
      // Redux (updateDocument.fulfilled → currentDocument.content changes →
      // canvasFromDoc recomputes).  In that case we must NOT wipe the undo
      // stack — the user should still be able to Ctrl+Z after saving.
      if (canvasRef.current !== null) return;

      // If the URL carries a theme choice (set from the creation form) and the
      // presentation has no stored theme yet, apply it now so the editor opens
      // with the user's pre-selected theme.
      const initialCanvas =
        urlThemeId && !canvasFromDoc.themeId
          ? applyTheme(canvasFromDoc, urlThemeId)
          : canvasFromDoc;

      setCanvas(initialCanvas);
      setActiveSlideId((prev) => {
        if (prev && initialCanvas.slides.some((s) => s.id === prev)) return prev;
        return initialCanvas.slides[0]?.id ?? null;
      });
      setSelectedElementId(null);
      setDirty(urlThemeId !== null && !canvasFromDoc.themeId);
      undoStack.current = [];
      redoStack.current = [];
      setCanUndo(false);
      setCanRedo(false);
    }
  }, [canvasFromDoc, urlThemeId]);

  /* ── Undo / Redo ─────────────────────────────────────────────────────── */
  const canvasRef = useRef<CanvasPresentation | null>(null);
  const undoStack = useRef<CanvasPresentation[]>([]);
  const redoStack = useRef<CanvasPresentation[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => { canvasRef.current = canvas; });

  /** Kept in sync with activeSlideId state so keyboard handlers don't go stale. */
  const activeSlideIdRef = useRef(activeSlideId);
  useEffect(() => { activeSlideIdRef.current = activeSlideId; }, [activeSlideId]);
  const selectedElementIdRef = useRef(selectedElementId);
  useEffect(() => { selectedElementIdRef.current = selectedElementId; }, [selectedElementId]);
  const nudgeSessionActiveRef = useRef(false);
  const applyElementPatchRef = useRef<((patch: Partial<CanvasElement>, options?: { pushToHistory?: boolean }) => void) | null>(null);

  const pushHistory = useCallback(() => {
    const cur = canvasRef.current;
    if (!cur) return;
    undoStack.current = [...undoStack.current.slice(-19), cur];
    redoStack.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    const cur = canvasRef.current;
    if (cur) redoStack.current.unshift(cur);
    if (redoStack.current.length > 20) redoStack.current.length = 20;
    setCanvas(prev);
    setDirty(true);
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(true);
  }, []);

  const redo = useCallback(() => {
    const next = redoStack.current.shift();
    if (!next) return;
    const cur = canvasRef.current;
    if (cur) undoStack.current.push(cur);
    if (undoStack.current.length > 20) undoStack.current.shift();
    setCanvas(next);
    setDirty(true);
    setCanUndo(true);
    setCanRedo(redoStack.current.length > 0);
  }, []);

  useEffect(() => {
    const resetNudgeSession = () => {
      nudgeSessionActiveRef.current = false;
    };

    const handler = (e: KeyboardEvent) => {
      // ── Undo / Redo ──────────────────────────────────────────────────────
      const mod = e.ctrlKey || e.metaKey;
      if (mod) {
        if (e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
        if (e.key === "y" || (e.key === "z" && e.shiftKey)) { e.preventDefault(); redo(); }
        return;
      }

      // ── Arrow-key slide navigation ────────────────────────────────────────
      // Skip when typing in any text input, textarea, or contenteditable so
      // cursor movement inside text elements is not hijacked.
      const target = e.target as HTMLElement | null;
      const inTextInput =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.contentEditable === "true";
      if (inTextInput) return;

      const selectedId = selectedElementIdRef.current;
      const isArrowKey =
        e.key === "ArrowRight" ||
        e.key === "ArrowLeft" ||
        e.key === "ArrowUp" ||
        e.key === "ArrowDown";

      if (selectedId && isArrowKey) {
        const slideId = activeSlideIdRef.current;
        const slide = canvasRef.current?.slides.find((s) => s.id === slideId);
        const el = slide?.elements.find((element) => element.id === selectedId);
        if (!slideId || !el) return;

        if (!nudgeSessionActiveRef.current) {
          pushHistory();
          nudgeSessionActiveRef.current = true;
        }

        const step = e.shiftKey ? 0.02 : 0.004;

        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          const deltaX = e.key === "ArrowLeft" ? -step : step;
          const newX = Math.min(Math.max(el.x + deltaX, 0), Math.max(0, 1 - el.w));
          e.preventDefault();
          applyElementPatchRef.current?.({ x: newX }, { pushToHistory: false });
          return;
        }

        const deltaY = e.key === "ArrowUp" ? -step : step;
        const newY = Math.min(Math.max(el.y + deltaY, 0), Math.max(0, 1 - el.h));
        e.preventDefault();
        applyElementPatchRef.current?.({ y: newY }, { pushToHistory: false });
        return;
      }

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        const slides = canvasRef.current?.slides;
        if (!slides) return;
        const idx = slides.findIndex((s) => s.id === activeSlideIdRef.current);
        const next = slides[idx + 1];
        if (next) { e.preventDefault(); setActiveSlideId(next.id); setSelectedElementId(null); }
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        const slides = canvasRef.current?.slides;
        if (!slides) return;
        const idx = slides.findIndex((s) => s.id === activeSlideIdRef.current);
        const prev = slides[idx - 1];
        if (prev) { e.preventDefault(); setActiveSlideId(prev.id); setSelectedElementId(null); }
      }
    };
    window.addEventListener("keydown", handler);
    window.addEventListener("keyup", resetNudgeSession);
    window.addEventListener("blur", resetNudgeSession);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("keyup", resetNudgeSession);
      window.removeEventListener("blur", resetNudgeSession);
    };
  }, [pushHistory, undo, redo]);

  useEffect(() => {
    nudgeSessionActiveRef.current = false;
  }, [selectedElementId, activeSlideId]);

  /* ── Derived: active slide + selected element ────────────────────────── */
  const activeSlide = canvas?.slides.find((s) => s.id === activeSlideId) ?? null;
  const activeSlideIdx = canvas?.slides.findIndex((s) => s.id === activeSlideId) ?? -1;
  const presentSlideIndex = useMemo(
    () => (canvas ? getPresentSlideIndex(canvas.slides, activeSlideId) : 0),
    [canvas, activeSlideId],
  );

  const selectedElement = useMemo<CanvasElement | null>(() => {
    if (!activeSlide || !selectedElementId) return null;
    return activeSlide.elements.find((e) => e.id === selectedElementId) ?? null;
  }, [activeSlide, selectedElementId]);

  const selectedTextEl = selectedElement?.type === "text"
    ? (selectedElement as CanvasTextElement)
    : null;

  const selectedListEl =
    selectedElement?.type === "bullet_list" || selectedElement?.type === "ordered_list"
      ? (selectedElement as CanvasListElement)
      : null;

  const selectedImgEl = selectedElement?.type === "image_placeholder"
    ? selectedElement
    : null;

  const selectedShapeEl = selectedElement?.type === "shape"
    ? (selectedElement as CanvasShapeElement)
    : null;

  /* ── Editor ref (addText / removeSelected) ───────────────────────────── */
  const editorRef = useRef<SlideKonvaEditorHandle>(null);

  /* ── Slide mutations ─────────────────────────────────────────────────── */
  const updateSlide = useCallback(
    (slideId: string, elements: CanvasElement[]) => {
      pushHistory();
      setCanvas((prev) =>
        prev
          ? { ...prev, slides: prev.slides.map((s) => s.id === slideId ? { ...s, elements } : s) }
          : prev,
      );
      setDirty(true);
    },
    [pushHistory],
  );

  /** Update a single property of the currently selected element. */
  const applyElementPatch = useCallback(
    (patch: Partial<CanvasElement>, options?: { pushToHistory?: boolean }) => {
      if (!selectedElementId || !activeSlideId || !canvasRef.current) return;
      const slide = canvasRef.current.slides.find((s) => s.id === activeSlideId);
      if (!slide) return;
      if (options?.pushToHistory !== false) {
        pushHistory();
      }
      setCanvas((prev) =>
        prev
          ? {
              ...prev,
              slides: prev.slides.map((s) =>
                s.id === activeSlideId
                  ? {
                      ...s,
                      elements: s.elements.map((el) =>
                        el.id === selectedElementId ? { ...el, ...patch } as CanvasElement : el,
                      ),
                    }
                  : s,
              ),
            }
          : prev,
      );
      setDirty(true);
    },
    [selectedElementId, activeSlideId, pushHistory],
  );

  useEffect(() => {
    applyElementPatchRef.current = applyElementPatch;
  }, [applyElementPatch]);

  const insertImageElement = useCallback(
    ({ url, prompt, backendId }: ImageInsertResult) => {
      if (!activeSlideId) return;
      const newId = `img-${Date.now().toString(36)}`;
      const newEl: CanvasImageElement = {
        id: newId,
        type: "image_placeholder",
        x: 0.10,
        y: 0.20,
        w: 0.80,
        h: 0.60,
        prompt,
        url,
        imageBackendId: backendId,
      };
      pushHistory();
      setCanvas((prev) =>
        prev
          ? {
              ...prev,
              slides: prev.slides.map((s) =>
                s.id === activeSlideId
                  ? { ...s, elements: [...s.elements, newEl] }
                  : s,
              ),
            }
          : prev,
      );
      setSelectedElementId(newId);
      setDirty(true);
    },
    [activeSlideId, pushHistory],
  );

  /**
   * Unified handler for the image picker modal.
   * - Replacing mode: patches the currently selected image element.
   * - Insert mode: adds a new image_placeholder element to the active slide.
   */
  const handleImageFromModal = useCallback(
    ({ url, prompt, backendId }: ImageInsertResult) => {
      if (imageModalReplacing) {
        applyElementPatch({
          url,
          prompt,
          imageBackendId: backendId,
        } as Partial<CanvasImageElement>);
        return;
      }
      insertImageElement({ url, prompt, backendId });
    },
    [imageModalReplacing, applyElementPatch, insertImageElement],
  );

  const handleGenerateImageFromModal = useCallback(
    async (prompt: string) => {
      if (!document?.id) return;

      const loadingToastId = toast.loading("A gerar imagem...");
      try {
        const result = await generateDocumentImageApi(document.id, prompt);
        toast.dismiss(loadingToastId);

        if (!result.newUrl) {
          toast.error("A imagem ficou em processamento. Tenta novamente.");
          return;
        }

        if (imageModalReplacing) {
          applyElementPatch({
            url: result.newUrl,
            prompt,
            imageBackendId: result.id,
          } as Partial<CanvasImageElement>);
        } else {
          insertImageElement({
            url: result.newUrl,
            prompt,
            backendId: result.id,
          });
        }

        toast.success("Imagem gerada com sucesso!");
      } catch (err) {
        toast.dismiss(loadingToastId);
        toast.error(err instanceof Error ? err.message : "Erro ao gerar imagem");
      }
    },
    [document?.id, imageModalReplacing, applyElementPatch, insertImageElement],
  );

  /** Called from the floating change-image button on the Konva canvas. */
  const handleChangeImageFromCanvas = useCallback(
    (_elementId: string) => {
      setImageModalReplacing(true);
      setImageModalOpen(true);
    },
    [],
  );

  const addSlide = useCallback(() => {
    const cur = canvasRef.current;
    const themeId = cur?.themeId;
    const bare = makeNewSlide(themeId);
    // Apply the active theme so the new slide gets its decorative shapes.
    const themed =
      themeId && cur
        ? (applyTheme({ ...cur, slides: [bare] }, themeId).slides[0] ?? bare)
        : bare;
    // Inherit background from the active slide so manual bg overrides carry forward.
    const activeSlide = cur?.slides.find((s) => s.id === activeSlideId);
    const newSlide = activeSlide
      ? { ...themed, background: activeSlide.background, backgroundGradient: activeSlide.backgroundGradient }
      : themed;
    pushHistory();
    setCanvas((prev) => prev ? { ...prev, slides: [...prev.slides, newSlide] } : prev);
    setActiveSlideId(bare.id);
    setSelectedElementId(null);
    setDirty(true);
  }, [activeSlideId, pushHistory]);

  const insertGeneratedSlide = useCallback(
    (generatedSlide: CanvasSlide) => {
      const cur = canvasRef.current;
      if (!cur) return;

      const activeIdx = activeSlideId
        ? cur.slides.findIndex((slide) => slide.id === activeSlideId)
        : -1;
      const insertAt = activeIdx >= 0 ? activeIdx + 1 : cur.slides.length;

      pushHistory();
      setCanvas((prev) => {
        if (!prev) return prev;
        const slides = [...prev.slides];
        slides.splice(insertAt, 0, generatedSlide);
        return { ...prev, slides };
      });
      setActiveSlideId(generatedSlide.id);
      setSelectedElementId(null);
      setDirty(true);
    },
    [activeSlideId, pushHistory],
  );

  const insertShapeElement = useCallback(
    (shape: CanvasShapeElement["shape"]) => {
      if (!activeSlideId) return;
      const newEl = makeShapeElement(shape);
      pushHistory();
      setCanvas((prev) =>
        prev
          ? {
              ...prev,
              slides: prev.slides.map((s) =>
                s.id === activeSlideId
                  ? { ...s, elements: [...s.elements, newEl] }
                  : s,
              ),
            }
          : prev,
      );
      setSelectedElementId(newEl.id);
      setDirty(true);
    },
    [activeSlideId, pushHistory],
  );

  const insertMathElement = useCallback(
    (tex: string) => {
      if (!activeSlideId) return;
      const newEl = makeMathElement(tex);
      pushHistory();
      setCanvas((prev) =>
        prev
          ? {
              ...prev,
              slides: prev.slides.map((s) =>
                s.id === activeSlideId
                  ? { ...s, elements: [...s.elements, newEl] }
                  : s,
              ),
            }
          : prev,
      );
      setSelectedElementId(newEl.id);
      setDirty(true);
    },
    [activeSlideId, pushHistory],
  );

  /** Open the formula modal to edit an existing math element. */
  const handleEditMath = useCallback((elementId: string) => {
    setSelectedElementId(elementId);
    setEditingMathId(elementId);
    setFormulaModalOpen(true);
  }, []);

  /** Modal confirm: update the edited math element, or insert a new one. */
  const handleFormulaConfirm = useCallback(
    (tex: string) => {
      if (!editingMathId) {
        insertMathElement(tex);
        return;
      }
      const targetId = editingMathId;
      pushHistory();
      setCanvas((prev) =>
        prev
          ? {
              ...prev,
              slides: prev.slides.map((s) =>
                s.id === activeSlideId
                  ? {
                      ...s,
                      elements: s.elements.map((el) =>
                        el.id === targetId && el.type === "math"
                          ? ({ ...el, tex } as CanvasElement)
                          : el,
                      ),
                    }
                  : s,
              ),
            }
          : prev,
      );
      setDirty(true);
    },
    [editingMathId, activeSlideId, insertMathElement, pushHistory],
  );

  const handleGenerateSlide = useCallback(async () => {
    if (!document?.id || !canvas) return;

    setIsGeneratingSlide(true);
    const loadingToastId = toast.loading("A gerar slide...");

    try {
      const response = await generateSlideApi(
        document.id,
        generateSlideTopic.trim() || undefined,
        JSON.stringify(canvas),
      );
      const parsedSlide = slideBlockSchema.parse(JSON.parse(response.slide));
      const themed = buildGeneratedCanvasSlide(slideToCanvas(parsedSlide), canvas.themeId);
      // Inherit background from the active slide so manual bg overrides carry forward.
      const activeSlide = canvas.slides.find((s) => s.id === activeSlideId);
      const generatedSlide = activeSlide
        ? { ...themed, background: activeSlide.background, backgroundGradient: activeSlide.backgroundGradient }
        : themed;

      insertGeneratedSlide(generatedSlide);
      setGenerateSlideDialogOpen(false);
      setGenerateSlideTopic("");
      toast.dismiss(loadingToastId);
      toast.success("Slide gerado com sucesso!");
    } catch (err) {
      toast.dismiss(loadingToastId);
      toast.error(err instanceof Error ? err.message : "Erro ao gerar slide");
    } finally {
      setIsGeneratingSlide(false);
    }
  }, [activeSlideId, canvas, document?.id, generateSlideTopic, insertGeneratedSlide]);

  const deleteSlide = useCallback(
    (slideId: string) => {
      const cur = canvasRef.current;
      if (!cur || cur.slides.length <= 1) return;
      const idx = cur.slides.findIndex((s) => s.id === slideId);
      const neighbour = cur.slides[idx + 1] ?? cur.slides[idx - 1];
      pushHistory();
      setCanvas((prev) =>
        prev && prev.slides.length > 1
          ? { ...prev, slides: prev.slides.filter((s) => s.id !== slideId) }
          : prev,
      );
      if (slideId === activeSlideId && neighbour) setActiveSlideId(neighbour.id);
      setDirty(true);
    },
    [pushHistory, activeSlideId],
  );

  const duplicateSlide = useCallback(
    (slideId: string) => {
      const cur = canvasRef.current;
      if (!cur) return;
      const src = cur.slides.find((s) => s.id === slideId);
      if (!src) return;
      const newId = `s${Date.now().toString(36)}`;
      const newSlide: CanvasSlide = {
        ...src,
        id: newId,
        hidden: false,
        elements: src.elements.map((el) => ({
          ...el,
          id: `${el.id}-c${Date.now().toString(36)}`,
        })),
      };
      const idx = cur.slides.findIndex((s) => s.id === slideId);
      pushHistory();
      setCanvas((prev) => {
        if (!prev) return prev;
        const slides = [...prev.slides];
        slides.splice(idx + 1, 0, newSlide);
        return { ...prev, slides };
      });
      setActiveSlideId(newSlide.id);
      setDirty(true);
    },
    [pushHistory],
  );

  const toggleHideSlide = useCallback(
    (slideId: string) => {
      pushHistory();
      setCanvas((prev) =>
        prev
          ? {
              ...prev,
              slides: prev.slides.map((s) =>
                s.id === slideId ? { ...s, hidden: !s.hidden } : s,
              ),
            }
          : prev,
      );
      setDirty(true);
    },
    [pushHistory],
  );

  const patchSlideBackground = useCallback(
    (bg: string) => {
      if (!activeSlideId) return;
      pushHistory();
      setCanvas((prev) =>
        prev
          ? {
              ...prev,
              slides: prev.slides.map((s) =>
                s.id === activeSlideId
                  ? { ...s, background: bg, backgroundGradient: undefined }
                  : s,
              ),
            }
          : prev,
      );
      setDirty(true);
    },
    [activeSlideId, pushHistory],
  );

  const applyBgToAll = useCallback(
    (bg: string) => {
      if (!canvasRef.current) return;
      pushHistory();
      setCanvas((prev) =>
        prev
          ? { ...prev, slides: prev.slides.map((s) => ({ ...s, background: bg, backgroundGradient: undefined })) }
          : prev,
      );
      setDirty(true);
    },
    [pushHistory],
  );

  const moveSlide = useCallback(
    (slideId: string, direction: "up" | "down") => {
      const cur = canvasRef.current;
      if (!cur) return;
      const idx = cur.slides.findIndex((s) => s.id === slideId);
      if (idx < 0) return;
      if (direction === "up" && idx === 0) return;
      if (direction === "down" && idx >= cur.slides.length - 1) return;
      pushHistory();
      setCanvas((prev) => {
        if (!prev) return prev;
        const i = prev.slides.findIndex((s) => s.id === slideId);
        if (i < 0) return prev;
        const slides = [...prev.slides];
        const swap = direction === "up" ? i - 1 : i + 1;
        [slides[i], slides[swap]] = [slides[swap], slides[i]];
        return { ...prev, slides };
      });
      setDirty(true);
    },
    [pushHistory],
  );

  /* ── Theme ───────────────────────────────────────────────────────────── */
  const handleThemeSelect = useCallback(
    (themeId: string) => {
      if (!canvasRef.current) return;
      pushHistory();
      setCanvas(applyTheme(canvasRef.current, themeId));
      setDirty(true);
    },
    [pushHistory],
  );

  /* ── AI Chat ─────────────────────────────────────────────────────────── */
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const [chatError, setChatError] = useState("");

  /**
   * When an AI quick-action button (Simplificar / Expandir / Melhorar) is
   * clicked we record which element should receive the response so that
   * handleChatSubmit can write the answer back to the canvas.
   */
  const pendingAIActionRef = useRef<{ elementId: string; slideId: string } | null>(null);

  const handleChatSubmit = useCallback(
    async (userMessage: string) => {
      if (!document?.id) return;
      setChatHistory((prev) => [...prev, { role: "user", content: userMessage }]);
      setChatError("");
      setIsChatting(true);
      try {
        // Build a slide-aware message so the AI knows which slide the teacher is looking at.
        const slides = canvas?.slides ?? [];
        const activeIdx = slides.findIndex((s) => s.id === activeSlideId);
        const slide = activeSlideId ? slides.find((s) => s.id === activeSlideId) : null;
        let enrichedMessage = userMessage;
        if (slide && activeIdx !== -1) {
          const slideTitle = (slide.elements.find(
            (el) => el.type === "text" && (el as CanvasTextElement).role === "title",
          ) as CanvasTextElement | undefined)?.text ?? "Sem título";
          const elemSummary = slide.elements
            .map((el) => {
              if (el.type === "text") return `[texto] "${(el as CanvasTextElement).text}"`;
              if (el.type === "bullet_list" || el.type === "ordered_list")
                return `[lista] ${(el as CanvasListElement).items.join(" | ")}`;
              if (el.type === "image_placeholder") return "[imagem]";
              return `[${el.type}]`;
            })
            .join("; ");
          enrichedMessage = `Contexto: slide ${activeIdx + 1} de ${slides.length} ("${slideTitle}"). Elementos: ${elemSummary}.\n\nPedido: ${userMessage}`;
        }

        const response = await dispatch(
          chatWithDocument({ id: document.id, message: enrichedMessage, canvasState: canvas ? JSON.stringify(canvas) : undefined }),
        ).unwrap();
        if (response.chatAnswer) {
          // If this was a quick-action (Simplificar / Expandir / Melhorar),
          // apply the AI text directly to the targeted canvas element.
          const pending = pendingAIActionRef.current;
          if (pending) {
            pendingAIActionRef.current = null;
            pushHistory();
            setCanvas((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                slides: prev.slides.map((s) =>
                  s.id !== pending.slideId
                    ? s
                    : {
                        ...s,
                        elements: s.elements.map((el) => {
                          if (el.id !== pending.elementId) return el;
                          if (el.type === "text") {
                            return { ...el, text: response.chatAnswer } as CanvasTextElement;
                          }
                          if (el.type === "bullet_list" || el.type === "ordered_list") {
                            // AI returns one item per line; strip leading bullets / numbers
                            const items = response.chatAnswer
                              .split("\n")
                              .map((line) => line.trim().replace(/^(\d+[.)]\s*|[-•]\s*)/, ""))
                              .filter(Boolean);
                            return {
                              ...el,
                              items: items.length > 0 ? items : (el as CanvasListElement).items,
                            } as CanvasListElement;
                          }
                          return el;
                        }),
                      },
                ),
              };
            });
            setDirty(true);
          }
        }

        // If the backend returned updated presentation JSON, apply it to the canvas.
        // Always apply when valid — JSON.stringify key ordering can differ even for
        // identical content, so strict equality checks produce false negatives.
        let canvasWasUpdated = false;
        if (response.content && response.content.trim().startsWith("{")) {
          try {
            const raw: unknown = JSON.parse(response.content);
            if (isCanvasPresentation(raw)) {
              pushHistory();
              const activeThemeId = canvasRef.current?.themeId ?? raw.themeId;
              setCanvas(activeThemeId ? applyTheme(raw, activeThemeId) : raw);
              setDirty(false); // just synced from server
              canvasWasUpdated = true;
            }
          } catch {
            // not valid JSON — ignore, keep existing canvas
          }
        }
        if (response.chatAnswer) {
          setChatHistory((prev) => [
            ...prev,
            {
              role: "assistant",
              content: response.chatAnswer ?? (canvasWasUpdated ? "Slide atualizado! ✓" : ""),
            },
          ]);
        }
        // Proactively offer image regeneration when the AI detected a context change on a slide with an image
        if (response.suggestImageRegen) {
          setChatHistory((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "🖼️ O contexto visual do slide mudou. Queres que regenere a imagem para corresponder ao novo conteúdo?",
              imageRegenOffer: true,
            },
          ]);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro na conversa com IA.";
        setChatError(msg);
      } finally {
        setIsChatting(false);
      }
    },
    [dispatch, document?.id, pushHistory, canvas, activeSlideId],
  );

  /** Marks all pending image-regen offers as resolved in chat history */
  const resolveImageRegenOffers = useCallback(() => {
    setChatHistory(prev =>
      prev.map(msg => msg.imageRegenOffer ? { ...msg, imageRegenResolved: true } : msg)
    );
  }, []);

  /** Called when user clicks "Não" on the image-regen offer bubble */
  const handleImageRegenDismiss = useCallback(() => {
    resolveImageRegenOffers();
  }, [resolveImageRegenOffers]);

  /** Called when user clicks "Sim, regenerar" on the image-regen offer bubble */
  const handleImageRegen = useCallback(async () => {
    resolveImageRegenOffers();
    if (!document?.id || !canvas) return;
    const activeSlide = canvas.slides.find(s => s.id === activeSlideId);
    const imageEl = activeSlide?.elements.find(
      (el): el is CanvasImageElement => el.type === "image_placeholder"
    ) as CanvasImageElement | undefined;
    if (!imageEl) {
      toast.error("Não encontrei uma imagem neste slide para regenerar.");
      return;
    }
    try {
      const textContent = activeSlide?.elements
        .filter(el => el.type === "text" || el.type === "bullet_list" || el.type === "ordered_list")
        .map(el => {
          if (el.type === "text") return (el as CanvasTextElement).text;
          if (el.type === "bullet_list" || el.type === "ordered_list") return (el as CanvasListElement).items?.join(", ") ?? "";
          return "";
        })
        .filter(Boolean)
        .join(" ") ?? "";
      const prompt = imageEl.prompt
        ? `${imageEl.prompt}. Contexto: ${textContent}`
        : textContent || "ilustração educativa";
      let newUrl: string | null = null;
      if (imageEl.imageBackendId) {
        const result = await regenerateDocumentImageApi(document.id, imageEl.imageBackendId, prompt);
        newUrl = result.newUrl;
      } else {
        const result = await generateDocumentImageApi(document.id, prompt);
        newUrl = result.newUrl;
      }
      if (newUrl) {
        const finalUrl = newUrl;
        setCanvas(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            slides: prev.slides.map(slide =>
              slide.id === activeSlideId
                ? { ...slide, elements: slide.elements.map(el => el.id === imageEl.id ? { ...el, url: finalUrl } : el) }
                : slide
            ),
          };
        });
        setDirty(true);
        toast.success("Imagem regenerada com sucesso!");
      } else {
        toast.info("A imagem está a ser processada. Atualiza a página em breve.");
      }
    } catch {
      toast.error("Erro ao regenerar a imagem.");
    }
  }, [resolveImageRegenOffers, document?.id, canvas, activeSlideId]);

  /**
   * Fire a preset AI prompt for the selected element.
   * Records the element target so handleChatSubmit can write the answer back.
   */
  const sendAIAction = useCallback(
    (prompt: string) => {
      if (selectedElementId && activeSlideId) {
        const el = activeSlide?.elements.find((e) => e.id === selectedElementId);
        if (el && (el.type === "text" || el.type === "bullet_list" || el.type === "ordered_list")) {
          pendingAIActionRef.current = { elementId: selectedElementId, slideId: activeSlideId };
        }
      }
      void handleChatSubmit(prompt);
    },
    [handleChatSubmit, selectedElementId, activeSlideId, activeSlide],
  );

  /* ── Auto-save (debounced, 1.5 s after last change) ─────────────────── */
  useEffect(() => {
    // Only trigger when user has made changes (dirty=true).
    // On initial load canvasFromDoc sets dirty=false, so this won't fire.
    if (!dirty || !canvas || !document) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setSaveStatus("saving");
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        const result = await dispatch(
          updateDocument({ id: documentId, title: document.title, content: JSON.stringify(canvas) }),
        );
        if (updateDocument.fulfilled.match(result)) {
          setDirty(false);
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus((s) => s === "saved" ? "idle" : s), 2000);
        } else {
          setSaveStatus("idle");
        }
      } catch {
        setSaveStatus("idle");
      }
    }, 1500);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [canvas]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Export PPTX (native — programmatic, text editable in PowerPoint) ── */
  const handleExportPPTX = async () => {
    if (!canvas || !document) return;
    setExporting(true);
    try {
      const PptxGenJS = (await import("pptxgenjs")).default;
      const pptx = new PptxGenJS();
      pptx.layout = "LAYOUT_16x9";
      const SLIDE_W = 10;
      const SLIDE_H = 5.625;
      const FS_SCALE = 720;

      for (const cs of canvas.slides) {
        const slide = pptx.addSlide();
        slide.background = { fill: toHex6(cs.background) };

        for (const el of cs.elements) {
          const x = el.x * SLIDE_W;
          const y = el.y * SLIDE_H;
          const w = el.w * SLIDE_W;
          const h = el.h * SLIDE_H;

          if (el.type === "text") {
            const t = el as CanvasTextElement;
            slide.addText(sanitizeWinAnsiText(t.text), {
              x, y, w, h,
              fontSize: Math.max(8, Math.round(t.fontSize * FS_SCALE)),
              bold: t.fontStyle.includes("bold"),
              italic: t.fontStyle.includes("italic"),
              color: toHex6(t.color),
              align: t.align as "left" | "center" | "right",
              fontFace: "Calibri",
              valign: "top",
              wrap: true,
            });
          } else if (el.type === "bullet_list" || el.type === "ordered_list") {
            const l = el as CanvasListElement;
            const isOrdered = el.type === "ordered_list";
            const bulletItems = l.items.map((item, i) => ({
              text: isOrdered ? `${i + 1}. ${item}` : `• ${item}`,
              options: {},
            }));
            const safeBulletItems = bulletItems.map((item) => ({
              ...item,
              text: sanitizeWinAnsiText(item.text),
            }));
            slide.addText(safeBulletItems, {
              x, y, w, h,
              fontSize: Math.max(8, Math.round(l.fontSize * FS_SCALE)),
              color: toHex6(l.color),
              fontFace: "Calibri",
              valign: "top",
              wrap: true,
            });
          } else if (el.type === "image_placeholder") {
            const image = el as CanvasImageElement;
            if (!image.url) continue;
            const asset = await fetchImageAsset(image.url);
            if (!asset) continue;
            slide.addImage({
              data: asset.dataUrl,
              x,
              y,
              w,
              h,
              rotate: image.rotation ?? 0,
            });
          } else if (el.type === "math") {
            const math = el as CanvasMathElement;
            const rendered = await renderKatexToPngDataUrl(math.tex, {
              color: "#FFFFFF",
              pixelHeight: Math.max(48, Math.round(h * 96)),
            });
            slide.addImage({
              data: rendered.dataUrl,
              x,
              y,
              w,
              h,
              rotate: math.rotation ?? 0,
            });
          } else if (el.type === "shape") {
            const shape = el as CanvasShapeElement;
            const strokeColor = toHex6(shape.stroke ?? DEFAULT_SHAPE_STROKE);
            const fillColor = toHex6(shape.fill ?? DEFAULT_SHAPE_FILL);
            const lineWidth = Math.max(0.75, (shape.strokeWidth ?? DEFAULT_SHAPE_STROKE_WIDTH) * 72 * SLIDE_W);

            if (shape.shape === "rect") {
              slide.addShape(PptxGenJS.ShapeType.rect, {
                x,
                y,
                w,
                h,
                rotate: shape.rotation ?? 0,
                fill: { color: fillColor, transparency: 35 },
                line: { color: strokeColor, width: lineWidth },
              });
            } else if (shape.shape === "ellipse") {
              slide.addShape(PptxGenJS.ShapeType.ellipse, {
                x,
                y,
                w,
                h,
                rotate: shape.rotation ?? 0,
                fill: { color: fillColor, transparency: 35 },
                line: { color: strokeColor, width: lineWidth },
              });
            } else {
              slide.addShape(PptxGenJS.ShapeType.line, {
                x,
                y: y + h / 2,
                w,
                h: 0,
                rotate: shape.rotation ?? 0,
                line: { color: strokeColor, width: lineWidth, beginArrowType: "none", endArrowType: "none" },
              });
            }
          }
        }
      }

      const fileName = (document.title || "apresentacao")
        .replace(/[^a-z0-9À-ÿ\s\-]/gi, "").trim().replace(/\s+/g, "_");
      await pptx.writeFile({ fileName: `${fileName}.pptx` });
      toast.success("PPTX exportado");
    } catch (err) {
      console.error("PPTX export error:", err);
      toast.error("Erro ao exportar PPTX.");
    } finally {
      setExporting(false);
    }
  };

  /* ── Export PDF (pdf-lib, vector — text is selectable) ──────────────── */
  const handleExportPDF = async () => {
    if (!canvas || !document) return;
    setExporting(true);
    try {
      const { PDFDocument, StandardFonts, degrees, rgb } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.create();
      const PAGE_W = 960;
      const PAGE_H = 540;
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
      const fontBoldItalic = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

      for (const cs of canvas.slides) {
        const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
        const bgC = hexToRgb01(cs.background);
        // Background fill
        page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: rgb(bgC.r, bgC.g, bgC.b) });

        for (const el of cs.elements) {
          if (el.type === "text") {
            const t = el as CanvasTextElement;
            const c = hexToRgb01(t.color);
            const fontSize = Math.max(6, Math.round(t.fontSize * PAGE_W));
            const lineHeight = fontSize * 1.3;
            const font =
              t.fontStyle === "bold"
                ? fontBold
                : t.fontStyle === "italic"
                  ? fontItalic
                  : t.fontStyle === "bold italic"
                    ? fontBoldItalic
                    : fontRegular;
            const lines = wrapPdfText(t.text, el.w * PAGE_W, font, fontSize);
            const maxLines = Math.max(1, Math.floor((el.h * PAGE_H) / lineHeight));
            lines.slice(0, maxLines).forEach((line, index) => {
              const lineWidth = font.widthOfTextAtSize(line, fontSize);
              const drawX =
                t.align === "center"
                  ? el.x * PAGE_W + Math.max(0, (el.w * PAGE_W - lineWidth) / 2)
                  : t.align === "right"
                    ? el.x * PAGE_W + Math.max(0, el.w * PAGE_W - lineWidth)
                    : el.x * PAGE_W;
              page.drawText(line, {
                x: drawX,
                y: PAGE_H - el.y * PAGE_H - fontSize - index * lineHeight,
                size: fontSize,
                font,
                color: rgb(c.r, c.g, c.b),
              });
            });
          } else if (el.type === "bullet_list" || el.type === "ordered_list") {
            const l = el as CanvasListElement;
            const isOrdered = el.type === "ordered_list";
            const fontSize = Math.max(6, Math.round(l.fontSize * PAGE_W));
            const c = hexToRgb01(l.color);
            const itemH = (el.h * PAGE_H) / Math.max(1, l.items.length);
            l.items.forEach((item, i) => {
              const prefix = isOrdered ? `${i + 1}. ` : "- ";
              const [firstLine = ""] = wrapPdfText(`${prefix}${item}`, el.w * PAGE_W, fontRegular, fontSize);
              page.drawText(firstLine, {
                x: el.x * PAGE_W,
                y: PAGE_H - el.y * PAGE_H - i * itemH - fontSize * 1.3,
                size: fontSize,
                font: fontRegular,
                color: rgb(c.r, c.g, c.b),
                maxWidth: el.w * PAGE_W,
              });
            });
          } else if (el.type === "shape") {
            const shape = el as CanvasShapeElement;
            const strokeRgb = hexToRgb01(shape.stroke ?? DEFAULT_SHAPE_STROKE);
            const fillRgb = hexToRgb01(shape.fill ?? DEFAULT_SHAPE_FILL);
            const strokeWidth = Math.max(1, (shape.strokeWidth ?? DEFAULT_SHAPE_STROKE_WIDTH) * PAGE_W);
            const rotation = degrees(shape.rotation ?? 0);
            const x = el.x * PAGE_W;
            const y = PAGE_H - (el.y + el.h) * PAGE_H;
            const width = el.w * PAGE_W;
            const height = el.h * PAGE_H;

            if (shape.shape === "rect") {
              page.drawRectangle({
                x,
                y,
                width,
                height,
                rotate: rotation,
                color: rgb(fillRgb.r, fillRgb.g, fillRgb.b),
                borderColor: rgb(strokeRgb.r, strokeRgb.g, strokeRgb.b),
                borderWidth: strokeWidth,
              });
            } else if (shape.shape === "ellipse") {
              page.drawEllipse({
                x: x + width / 2,
                y: y + height / 2,
                xScale: width / 2,
                yScale: height / 2,
                rotate: rotation,
                color: rgb(fillRgb.r, fillRgb.g, fillRgb.b),
                borderColor: rgb(strokeRgb.r, strokeRgb.g, strokeRgb.b),
                borderWidth: strokeWidth,
              });
            } else {
              const centerX = x + width / 2;
              const centerY = y + height / 2;
              const angle = ((shape.rotation ?? 0) * Math.PI) / 180;
              const dx = Math.cos(angle) * (width / 2);
              const dy = Math.sin(angle) * (width / 2);
              page.drawLine({
                start: { x: centerX - dx, y: centerY - dy },
                end: { x: centerX + dx, y: centerY + dy },
                thickness: strokeWidth,
                color: rgb(strokeRgb.r, strokeRgb.g, strokeRgb.b),
              });
            }
          } else if (el.type === "image_placeholder") {
            const image = el as CanvasImageElement;
            if (!image.url) continue;
            const asset = await fetchImageAsset(image.url);
            if (!asset) continue;
            try {
              const embedded = /png/i.test(asset.contentType)
                ? await pdfDoc.embedPng(asset.bytes)
                : await pdfDoc.embedJpg(asset.bytes);
              page.drawImage(embedded, {
                x: el.x * PAGE_W,
                y: PAGE_H - (el.y + el.h) * PAGE_H,
                width: el.w * PAGE_W,
                height: el.h * PAGE_H,
                rotate: degrees(image.rotation ?? 0),
              });
            } catch {
              // Skip images pdf-lib cannot decode (e.g. webp) rather than failing the export.
            }
          } else if (el.type === "math") {
            const math = el as CanvasMathElement;
            const rendered = await renderKatexToPngDataUrl(math.tex, {
              color: "#FFFFFF",
              pixelHeight: Math.max(48, Math.round(el.h * PAGE_H)),
            });
            if (!rendered.dataUrl) continue;
            try {
              const embedded = await pdfDoc.embedPng(dataUrlToBytes(rendered.dataUrl));
              page.drawImage(embedded, {
                x: el.x * PAGE_W,
                y: PAGE_H - (el.y + el.h) * PAGE_H,
                width: el.w * PAGE_W,
                height: el.h * PAGE_H,
                rotate: degrees(math.rotation ?? 0),
              });
            } catch {
              // Ignore math that fails to rasterize.
            }
          }
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      const fileName = (document.title || "apresentacao")
        .replace(/[^a-z0-9À-ÿ\s-]/gi, "").trim().replace(/\s+/g, "_");
      a.download = `${fileName}.pdf`;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("PDF exportado");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Erro ao exportar PDF.");
    } finally {
      setExporting(false);
    }
  };

  /* ── Render branches ─────────────────────────────────────────────────── */
  const isFetchingThisDoc = loadingDocumentId === documentId;
  if (!document && (isFetchingThisDoc || isLoading)) {
    return <PresentationEditorLoadingState />;
  }
  if (!document) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        Documento não encontrado.
      </div>
    );
  }
  if (inProgress) {
    return (
      <GenerationProgress
        phase={progress.phase}
        imageProgress={progress.imageProgress}
        error={progress.error}
      />
    );
  }
  if (document.status === "failed") {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h2 className="text-lg font-semibold text-foreground">A geração falhou</h2>
        <p className="mt-2 text-sm text-muted-foreground">Tenta criar a apresentação outra vez.</p>
      </div>
    );
  }
  if (!canvas) {
    if (isFetchingThisDoc || isLoading) {
      return <PresentationEditorLoadingState />;
    }
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h2 className="text-lg font-semibold text-foreground">
          Não foi possível carregar a apresentação
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          O conteúdo não está em formato válido. Recarrega a página ou cria a apresentação novamente.
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-1 min-h-0 flex-col overflow-hidden">

      {/* ── Main toolbar ───────────────────────────────────────────────── */}
      <div className="flex flex-shrink-0 flex-wrap items-center gap-1.5 border-b border-border bg-background px-3 py-2">
        {/* Title + auto-save status */}
        <div className="mr-2 min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{document.title}</p>
          <p className="text-[10px] text-muted-foreground">
            {canvas.slides.length} slide{canvas.slides.length !== 1 ? "s" : ""}
            {saveStatus === "saving" && " · A guardar…"}
            {saveStatus === "saved" && " · Guardado ✓"}
            {saveStatus === "idle" && dirty && " · Por guardar"}
          </p>
        </div>

        {/* Undo / Redo */}
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!canUndo} onClick={undo} title="Desfazer (Ctrl+Z)">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!canRedo} onClick={redo} title="Refazer (Ctrl+Y)">
          <Redo2 className="h-4 w-4" />
        </Button>

        <div className="h-5 w-px bg-border" />

        {/* Add text */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => editorRef.current?.addText()}
          disabled={!activeSlide}
          title="Adicionar caixa de texto"
        >
          <Plus className="h-3.5 w-3.5" />
          Texto
        </Button>

        {/* Add image — opens the image picker modal */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          disabled={!activeSlide}
          title="Adicionar imagem"
          onClick={() => { setImageModalReplacing(false); setImageModalOpen(true); }}
        >
          <ImageIcon className="h-3.5 w-3.5" />
          Imagem
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              disabled={!activeSlide}
              title="Adicionar forma"
            >
              <Shapes className="h-3.5 w-3.5" />
              Formas
              <ChevronDown className="h-3 w-3 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            <DropdownMenuItem onClick={() => insertShapeElement("rect")} className="cursor-pointer gap-2">
              <Square className="h-4 w-4" />
              Retângulo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertShapeElement("ellipse")} className="cursor-pointer gap-2">
              <Circle className="h-4 w-4" />
              Círculo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertShapeElement("line")} className="cursor-pointer gap-2">
              <Minus className="h-4 w-4" />
              Linha
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Add math formula — opens the formula builder modal */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          disabled={!activeSlide}
          title="Adicionar fórmula"
          onClick={() => { setEditingMathId(null); setFormulaModalOpen(true); }}
        >
          <Sigma className="h-3.5 w-3.5" />
          Fórmula
        </Button>

        <div className="h-5 w-px bg-border" />

        <ThemePicker currentThemeId={canvas.themeId} onSelect={handleThemeSelect} />

        {/* ── Right side: Export dropdown + Present ──────────────────── */}
        <div className="ml-auto flex items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1" disabled={exporting}>
                {exporting
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Download className="h-3.5 w-3.5" />}
                Exportar
                <ChevronDown className="h-3 w-3 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                onClick={handleExportPPTX}
                disabled={exporting}
                className="cursor-pointer gap-2"
              >
                <FileText className="h-4 w-4 text-blue-500" />
                Exportar como PPTX
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleExportPDF}
                disabled={exporting}
                className="cursor-pointer gap-2"
              >
                <FileText className="h-4 w-4 text-red-500" />
                Exportar como PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link href={`${Routes.PRESENTATION_EDITOR.replace(":id", documentId)}/present?slide=${presentSlideIndex}`}>
            <Button variant="default" size="sm" className="h-8">
              <Play className="mr-1.5 h-3.5 w-3.5" />
              Apresentar
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Contextual toolbar — always rendered to prevent layout shift.
           Fixed h-9, no wrapping, horizontal scroll if needed.          */}
      <div className={`flex flex-shrink-0 items-center gap-1 border-b border-border px-3 h-11 overflow-x-auto${selectedElement ? " bg-muted/30" : ""}`}>
      {selectedElement && (
        <>

          {/* TEXT formatting */}
          {selectedTextEl && (
            <>
              <Button
                variant={selectedTextEl.fontStyle.includes("bold") ? "secondary" : "ghost"}
                size="sm" className="h-7 w-7 p-0" title="Negrito (B)"
                onClick={() => applyElementPatch({ fontStyle: toggleBold(selectedTextEl.fontStyle) })}
              >
                <Bold className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={selectedTextEl.fontStyle.includes("italic") ? "secondary" : "ghost"}
                size="sm" className="h-7 w-7 p-0" title="Itálico (I)"
                onClick={() => applyElementPatch({ fontStyle: toggleItalic(selectedTextEl.fontStyle) })}
              >
                <Italic className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={selectedTextEl.underline ? "secondary" : "ghost"}
                size="sm" className="h-7 w-7 p-0" title="Sublinhado (U)"
                onClick={() => applyElementPatch({ underline: !selectedTextEl.underline })}
              >
                <Underline className="h-3.5 w-3.5" />
              </Button>

              <div className="mx-1 h-5 w-px bg-border" />

              {(["left", "center", "right"] as const).map((align) => {
                const Icon = align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight;
                return (
                  <Button
                    key={align}
                    variant={selectedTextEl.align === align ? "secondary" : "ghost"}
                    size="sm" className="h-7 w-7 p-0"
                    title={align === "left" ? "Alinhar à esquerda" : align === "center" ? "Centrar" : "Alinhar à direita"}
                    onClick={() => applyElementPatch({ align })}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </Button>
                );
              })}

              <div className="mx-1 h-5 w-px bg-border" />

              {/* Font size */}
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 font-bold" title="Diminuir tamanho"
                onClick={() => applyElementPatch({ fontSize: Math.max(0.012, selectedTextEl.fontSize - 0.004) })}>−</Button>
              <span className="w-6 select-none text-center text-xs tabular-nums text-muted-foreground">
                {Math.round(selectedTextEl.fontSize * 900)}
              </span>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 font-bold" title="Aumentar tamanho"
                onClick={() => applyElementPatch({ fontSize: Math.min(0.10, selectedTextEl.fontSize + 0.004) })}>+</Button>

              <div className="mx-1 h-5 w-px bg-border" />

              {/* Font family selector */}
              <select
                className="h-7 rounded border border-border bg-background px-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                value={selectedTextEl.fontFamily ?? ""}
                onChange={(e) => applyElementPatch({ fontFamily: e.target.value || undefined })}
                title="Tipo de letra"
                style={{ fontFamily: selectedTextEl.fontFamily || "inherit", maxWidth: 110 }}
              >
                {FONT_OPTIONS.map(({ label, value }) => (
                  <option key={value} value={value} style={{ fontFamily: value || "inherit" }}>
                    {label}
                  </option>
                ))}
              </select>

              <div className="mx-1 h-5 w-px bg-border" />

              {/* Full colour picker */}
              <ColorPickerPopover
                color={selectedTextEl.color || "#ffffff"}
                onChange={(color) => applyElementPatch({ color })}
              >
                <button
                  title="Cor do texto"
                  className="flex h-7 w-7 flex-col items-center justify-center rounded hover:bg-muted"
                >
                  <span className="text-xs font-bold leading-none text-foreground">A</span>
                  <span
                    className="mt-0.5 h-1 w-5 rounded-sm border border-border/40"
                    style={{ background: selectedTextEl.color || "#ffffff" }}
                  />
                </button>
              </ColorPickerPopover>

              <div className="mx-1 h-5 w-px bg-border" />

              {/* AI quick-actions */}
              <Button
                variant="ghost" size="sm" className="h-7 gap-1 text-xs text-primary"
                title="Pede à IA para simplificar este texto"
                onClick={() => sendAIAction(`Simplifica este texto de slide (responde só com o texto simplificado, sem introdução): "${selectedTextEl.text}"?`)}
              >
                <Sparkles className="h-3 w-3" />
                Simplificar
              </Button>
              <Button
                variant="ghost" size="sm" className="h-7 gap-1 text-xs text-primary"
                title="Pede à IA para expandir este texto"
                onClick={() => sendAIAction(`Expande este texto de slide com mais detalhes (responde só com o texto expandido, sem introdução): "${selectedTextEl.text}"?`)}
              >
                <Sparkles className="h-3 w-3" />
                Expandir
              </Button>
            </>
          )}

          {/* LIST formatting */}
          {selectedListEl && (
            <>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 font-bold" title="Diminuir tamanho"
                onClick={() => applyElementPatch({ fontSize: Math.max(0.012, selectedListEl.fontSize - 0.004) })}>−</Button>
              <span className="w-6 select-none text-center text-xs tabular-nums text-muted-foreground">
                {Math.round(selectedListEl.fontSize * 900)}
              </span>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 font-bold" title="Aumentar tamanho"
                onClick={() => applyElementPatch({ fontSize: Math.min(0.10, selectedListEl.fontSize + 0.004) })}>+</Button>

              <div className="mx-1 h-5 w-px bg-border" />

              {/* List colour picker */}
              <ColorPickerPopover
                color={selectedListEl.color || "#e5e7eb"}
                onChange={(color) => applyElementPatch({ color })}
              >
                <button
                  title="Cor do texto"
                  className="flex h-7 w-7 flex-col items-center justify-center rounded hover:bg-muted"
                >
                  <span className="text-xs font-bold leading-none text-foreground">A</span>
                  <span className="mt-0.5 h-1 w-5 rounded-sm border border-border/40" style={{ background: selectedListEl.color || "#e5e7eb" }} />
                </button>
              </ColorPickerPopover>

              <div className="mx-1 h-5 w-px bg-border" />

              <Button
                variant="ghost" size="sm" className="h-7 gap-1 text-xs text-primary"
                title="Pede à IA para melhorar esta lista"
                onClick={() => sendAIAction(`Melhora estes itens de lista para apresentação (responde só com os itens melhorados, um por linha, sem introdução): ${selectedListEl.items.join(" | ")}?`)}
              >
                <Sparkles className="h-3 w-3" />
                Melhorar lista
              </Button>
            </>
          )}

          {selectedShapeEl && (
            <>
              <span className="text-xs text-muted-foreground">Preenchimento:</span>
              <ColorPickerPopover
                color={selectedShapeEl.fill || DEFAULT_SHAPE_FILL}
                onChange={(fill) => applyElementPatch({ fill } as Partial<CanvasShapeElement>)}
              >
                <button
                  title="Cor de preenchimento"
                  className="flex h-7 w-9 items-center justify-center rounded border border-border hover:bg-muted"
                >
                  <span
                    className="h-4 w-6 rounded-sm border border-border/40"
                    style={{ background: selectedShapeEl.fill || DEFAULT_SHAPE_FILL }}
                  />
                </button>
              </ColorPickerPopover>

              <div className="mx-1 h-5 w-px bg-border" />

              <span className="text-xs text-muted-foreground">Contorno:</span>
              <ColorPickerPopover
                color={selectedShapeEl.stroke || DEFAULT_SHAPE_STROKE}
                onChange={(stroke) => applyElementPatch({ stroke } as Partial<CanvasShapeElement>)}
              >
                <button
                  title="Cor do contorno"
                  className="flex h-7 w-9 items-center justify-center rounded border border-border hover:bg-muted"
                >
                  <span
                    className="h-4 w-6 rounded-sm border border-border/40"
                    style={{ background: selectedShapeEl.stroke || DEFAULT_SHAPE_STROKE }}
                  />
                </button>
              </ColorPickerPopover>

              <div className="mx-1 h-5 w-px bg-border" />

              <span className="text-xs text-muted-foreground">Espessura:</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 font-bold"
                title="Diminuir espessura"
                onClick={() =>
                  applyElementPatch({
                    strokeWidth: Math.max(0.001, (selectedShapeEl.strokeWidth ?? DEFAULT_SHAPE_STROKE_WIDTH) - 0.001),
                  } as Partial<CanvasShapeElement>)
                }
              >
                −
              </Button>
              <span className="w-8 select-none text-center text-xs tabular-nums text-muted-foreground">
                {Math.round((selectedShapeEl.strokeWidth ?? DEFAULT_SHAPE_STROKE_WIDTH) * 900)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 font-bold"
                title="Aumentar espessura"
                onClick={() =>
                  applyElementPatch({
                    strokeWidth: Math.min(0.05, (selectedShapeEl.strokeWidth ?? DEFAULT_SHAPE_STROKE_WIDTH) + 0.001),
                  } as Partial<CanvasShapeElement>)
                }
              >
                +
              </Button>
            </>
          )}

          {/* IMAGE actions — single button that opens the picker modal */}
          {selectedImgEl && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              title="Trocar imagem"
              onClick={() => { setImageModalReplacing(true); setImageModalOpen(true); }}
            >
              <ImageIcon className="h-3.5 w-3.5" />
              Trocar imagem
            </Button>
          )}

          {/* Delete selected element */}
          <div className="ml-auto flex items-center">
            <Button
              variant="ghost" size="sm"
              className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
              onClick={() => {
                editorRef.current?.removeSelected();
                setSelectedElementId(null);
              }}
            >
              <Trash2 className="h-3 w-3" />
              Apagar
            </Button>
          </div>
        </>
      )}

      {/* Per-slide background picker — shown when nothing is selected */}
      {!selectedElement && activeSlide && (
        <>
          <span className="text-xs text-muted-foreground">Fundo:</span>
          <ColorPickerPopover
            color={activeSlide.background}
            onChange={patchSlideBackground}
          >
            <button
              title="Cor de fundo do slide"
              className="flex h-7 w-9 items-center justify-center rounded border border-border hover:bg-muted"
            >
              <span
                className="h-4 w-6 rounded-sm border border-border/40"
                style={{ background: activeSlide.background }}
              />
            </button>
          </ColorPickerPopover>
          <Button
            variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground"
            title="Aplicar esta cor de fundo a todos os slides"
            onClick={() => applyBgToAll(activeSlide.background)}
          >
            Aplicar a todos
          </Button>
        </>
      )}
      </div>

      {/* ── Editor body: slide sidebar | canvas | AI chat ─────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Slide sidebar */}
        <aside className="flex w-44 flex-shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r border-border bg-muted/20">
          <div className="flex flex-col items-center gap-3 p-3">
            {canvas.slides.map((cs, idx) => (
              <SlideItem
                key={cs.id}
                slide={cs}
                index={idx}
                isActive={cs.id === activeSlideId}
                isFirst={idx === 0}
                isLast={idx === canvas.slides.length - 1}
                isOnly={canvas.slides.length <= 1}
                onClick={() => { setActiveSlideId(cs.id); setSelectedElementId(null); }}
                onMoveUp={() => moveSlide(cs.id, "up")}
                onMoveDown={() => moveSlide(cs.id, "down")}
                onDelete={() => deleteSlide(cs.id)}
                onDuplicate={() => duplicateSlide(cs.id)}
                onToggleHide={() => toggleHideSlide(cs.id)}
              />
            ))}
          </div>
          <div className="sticky bottom-0 mt-auto p-3 pt-0">
            <DropdownMenu open={addSlideMenuOpen} onOpenChange={setAddSlideMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-full border-dashed text-xs">
                  + Slide
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-48">
                <DropdownMenuItem
                  onSelect={() => {
                    setAddSlideMenuOpen(false);
                    addSlide();
                  }}
                >
                  Slide em branco
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    setAddSlideMenuOpen(false);
                    setGenerateSlideDialogOpen(true);
                  }}
                >
                  Gerar com IA
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        {/* Main canvas */}
        <main className="flex flex-1 min-h-0 flex-col items-center overflow-hidden bg-neutral-100 dark:bg-zinc-900">
          {activeSlide ? (
            <div className="relative flex w-full flex-1 min-h-0 flex-col items-center justify-center">
              <p className="mb-1 shrink-0 text-center text-xs text-muted-foreground">
                Slide {activeSlideIdx + 1} / {canvas.slides.length}
                {selectedElement ? ` · ${selectedElement.type}` : ""}
                {activeSlide.hidden ? " · oculto" : ""}
              </p>
              {/* Canvas with padding so the slide has breathing room */}
              <div className="flex w-full flex-1 min-h-0 items-center justify-center overflow-hidden p-4">
                <div
                  style={{
                    width: "100%",
                    height: zoom <= 1 ? `${zoom * 100}%` : "100%",
                    maxWidth: "100%",
                    maxHeight: "100%",
                    transform: zoom > 1 ? `scale(${zoom})` : undefined,
                    transformOrigin: "center center",
                  }}
                >
                  <SlideKonvaEditor
                    ref={editorRef}
                    slide={activeSlide}
                    onChange={(elements) => updateSlide(activeSlide.id, elements)}
                    onSelectionChange={setSelectedElementId}
                    onChangeImage={handleChangeImageFromCanvas}
                    onEditMath={handleEditMath}
                  />
                </div>
              </div>

              {/* Zoom — bottom-right overlay, like Teachy */}
              <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg border border-border bg-background/90 px-2 py-1 shadow-sm backdrop-blur-sm">
                <button
                  type="button"
                  title="Diminuir zoom"
                  onClick={() => setZoom((z) => Math.max(ZOOM_MIN, parseFloat((z - 0.1).toFixed(2))))}
                  className="flex h-5 w-5 items-center justify-center rounded hover:bg-muted text-muted-foreground"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <input
                  type="range"
                  min={ZOOM_MIN * 100}
                  max={ZOOM_MAX * 100}
                  step={5}
                  value={Math.round(zoom * 100)}
                  onChange={(e) => setZoom(parseFloat((Number(e.target.value) / 100).toFixed(2)))}
                  className="w-20 accent-primary cursor-pointer"
                  title="Zoom"
                />
                <button
                  type="button"
                  title="Aumentar zoom"
                  onClick={() => setZoom((z) => Math.min(ZOOM_MAX, parseFloat((z + 0.1).toFixed(2))))}
                  className="flex h-5 w-5 items-center justify-center rounded hover:bg-muted text-muted-foreground"
                >
                  <Plus className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1.0)}
                  title="Repor zoom"
                  className="min-w-[2.5rem] text-center text-[11px] tabular-nums text-muted-foreground hover:text-foreground"
                >
                  {Math.round(zoom * 100)}%
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum slide selecionado</p>
          )}
        </main>

        {/* AI Chat panel — desktop: fixed right column; mobile: floating button */}
        <aside className="hidden lg:flex w-80 flex-shrink-0 flex-col border-l border-border bg-background overflow-hidden">
          <AIChatPanel
            onChatSubmit={handleChatSubmit}
            chatHistory={chatHistory}
            isStreaming={isChatting}
            error={chatError}
            placeholder="Pede ajuda para melhorar a apresentação..."
            title="Assistente de IA"
            showGenerationHint={!isEntitlementLoading && !isPremium}
            sources={sources}
            onImageRegen={handleImageRegen}
            onDismissImageRegen={handleImageRegenDismiss}
          />
        </aside>
      </div>

      {/* Image picker modal */}
      {document && (
        <ImagePickerModal
          open={imageModalOpen}
          documentId={document.id}
          onClose={() => setImageModalOpen(false)}
          onInsert={handleImageFromModal}
          onGenerate={handleGenerateImageFromModal}
        />
      )}

      {/* Formula builder modal — insert new, or edit an existing math element */}
      <FormulaModal
        open={formulaModalOpen}
        initialTex={
          editingMathId
            ? (activeSlide?.elements.find(
                (e): e is CanvasMathElement => e.id === editingMathId && e.type === "math",
              )?.tex ?? undefined)
            : undefined
        }
        onClose={() => { setFormulaModalOpen(false); setEditingMathId(null); }}
        onInsert={handleFormulaConfirm}
      />

      <Dialog
        open={generateSlideDialogOpen}
        onOpenChange={(open) => {
          if (!isGeneratingSlide) {
            setGenerateSlideDialogOpen(open);
            if (!open) {
              setGenerateSlideTopic("");
            }
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar com IA</DialogTitle>
            <DialogDescription>
              Indica um tema opcional. Se deixares em branco, a IA continua a apresentação de forma lógica.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6">
            <Input
              value={generateSlideTopic}
              onChange={(event) => setGenerateSlideTopic(event.target.value)}
              placeholder="Tema do slide"
              disabled={isGeneratingSlide}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setGenerateSlideDialogOpen(false);
                setGenerateSlideTopic("");
              }}
              disabled={isGeneratingSlide}
            >
              Cancelar
            </Button>
            <Button onClick={() => void handleGenerateSlide()} disabled={isGeneratingSlide}>
              {isGeneratingSlide ? "A gerar..." : "Gerar slide"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * SlideItem — sidebar thumbnail with hover controls
 * -------------------------------------------------------------------------- */
interface SlideItemProps {
  slide: CanvasSlide;
  index: number;
  isActive: boolean;
  isFirst: boolean;
  isLast: boolean;
  isOnly: boolean;
  onClick: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleHide: () => void;
}

function SlideItem({
  slide, index, isActive, isFirst, isLast, isOnly,
  onClick, onMoveUp, onMoveDown, onDelete, onDuplicate, onToggleHide,
}: SlideItemProps) {
  return (
    <div className="group relative cursor-pointer" onClick={onClick}>
      <SlideThumbnail slide={slide} index={index} isActive={isActive} onClick={onClick} />

      {/* ⋯ actions dropdown — top-right, fades in on hover */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="absolute right-1 top-1 rounded bg-black/50 p-0.5 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
            title="Ações do slide"
          >
            <MoreHorizontal className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-44">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
            <Copy className="mr-2 h-3.5 w-3.5" />
            Duplicar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleHide(); }}>
            {slide.hidden
              ? <><Eye className="mr-2 h-3.5 w-3.5" />Mostrar na apresentação</>
              : <><EyeOff className="mr-2 h-3.5 w-3.5" />Ocultar da apresentação</>}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isFirst}
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
          >
            <ChevronUp className="mr-2 h-3.5 w-3.5" />
            Mover para cima
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isLast}
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
          >
            <ChevronDown className="mr-2 h-3.5 w-3.5" />
            Mover para baixo
          </DropdownMenuItem>
          {!isOnly && (
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Eliminar slide
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Passive hidden indicator — centre overlay, not a button */}
      {slide.hidden && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded bg-black/40">
          <EyeOff className="h-4 w-4 text-white/70" />
        </div>
      )}
    </div>
  );
}
