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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGenerationProgress } from "@/hooks/useGenerationProgress";
import { parsePresentationDocument } from "@/shared/types/blocks";
import {
  isCanvasPresentation,
  type CanvasElement,
  type CanvasImageElement,
  type CanvasListElement,
  type CanvasPresentation,
  type CanvasSlide,
  type CanvasTextElement,
} from "@/shared/types/canvas-presentation";
import { getThemeById } from "@/shared/types/presentation-theme";
import { Routes } from "@/shared/types";
import { fetchDocument, updateDocument, chatWithDocument } from "@/store/documents/documentSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  generateDocumentImage,
  regenerateDocumentImage as regenerateDocumentImageService,
  uploadDocumentImage,
} from "@/services/api";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileText,
  ImageIcon,
  Italic,
  Link2,
  Loader2,
  MoreHorizontal,
  Play,
  Plus,
  Redo2,
  Sparkles,
  Trash2,
  Underline,
  Undo2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { applyTheme, presentationToCanvas } from "./canvas-layout";
import { ColorPickerPopover } from "./ColorPickerPopover";
import { SlideKonvaEditor, type SlideKonvaEditorHandle } from "./SlideKonvaEditor";
import { SlideThumbnail } from "./SlideThumbnail";
import { ThemePicker } from "./ThemePicker";

interface Props {
  documentId: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  hasUpdate?: boolean;
}

type ImgMode = "none" | "url" | "generate";

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

const COLOR_PRESETS = [
  { color: "#ffffff", label: "Branco" },
  { color: "#9ca3af", label: "Cinzento" },
  { color: "#1e293b", label: "Azul-escuro" },
  { color: "#6753FF", label: "Violeta" },
  { color: "#3b82f6", label: "Azul" },
  { color: "#06b6d4", label: "Ciano" },
  { color: "#4ade80", label: "Verde" },
  { color: "#fbbf24", label: "Âmbar" },
  { color: "#f97316", label: "Laranja" },
  { color: "#f43f5e", label: "Vermelho" },
  { color: "#ec4899", label: "Rosa" },
  { color: "#a855f7", label: "Roxo" },
];

function makeNewSlide(themeId?: string): CanvasSlide {
  const theme = getThemeById(themeId ?? "dark");
  const id = `s${Date.now().toString(36)}`;
  const titleEl: CanvasTextElement = {
    id: `${id}-title`,
    type: "text",
    x: 0.04, y: 0.28, w: 0.92, h: 0.22,
    text: "Novo Slide",
    fontSize: 0.036,
    fontStyle: "bold",
    color: theme.titleColor,
    align: "center",
    role: "title",
  };
  const subtitleEl: CanvasTextElement = {
    id: `${id}-sub`,
    type: "text",
    x: 0.10, y: 0.55, w: 0.80, h: 0.14,
    text: "Clica duas vezes para editar",
    fontSize: 0.021,
    fontStyle: "normal",
    color: theme.mutedColor,
    align: "center",
    role: "subtitle",
  };
  return { id, layout: "title", background: theme.bg, elements: [titleEl, subtitleEl] };
}

/* --------------------------------------------------------------------------
 * Component
 * -------------------------------------------------------------------------- */
export function BlockDocumentEditor({ documentId }: Props) {
  const dispatch = useAppDispatch();
  const rawDocument = useAppSelector((s) => s.documents.currentDocument);
  const document = rawDocument?.id === documentId ? rawDocument : null;
  const isLoading = useAppSelector((s) => s.documents.isLoading);
  const loadingDocumentId = useAppSelector((s) => s.documents.loadingDocumentId);

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
      if (isCanvasPresentation(raw)) return raw;
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
  const ZOOM_MIN = 0.25; // 25 %
  const ZOOM_MAX = 2.0;  // 200 %

  /* ── Image toolbar state ─────────────────────────────────────────────── */
  const [imgMode, setImgMode] = useState<ImgMode>("none");
  const [imgUrlDraft, setImgUrlDraft] = useState("");
  const [imgPromptDraft, setImgPromptDraft] = useState("");
  const [isUploadingImg, setIsUploadingImg] = useState(false);
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (canvasFromDoc) {
      // Only do a full reset the very first time this document's canvas is
      // initialised (canvasRef.current is null).  When canvasRef already has
      // content the update comes from our own auto-save writing back through
      // Redux (updateDocument.fulfilled → currentDocument.content changes →
      // canvasFromDoc recomputes).  In that case we must NOT wipe the undo
      // stack — the user should still be able to Ctrl+Z after saving.
      if (canvasRef.current !== null) return;

      setCanvas(canvasFromDoc);
      setActiveSlideId((prev) => {
        if (prev && canvasFromDoc.slides.some((s) => s.id === prev)) return prev;
        return canvasFromDoc.slides[0]?.id ?? null;
      });
      setSelectedElementId(null);
      setDirty(false);
      undoStack.current = [];
      redoStack.current = [];
      setCanUndo(false);
      setCanRedo(false);
    }
  }, [canvasFromDoc]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Undo / Redo ─────────────────────────────────────────────────────── */
  const canvasRef = useRef<CanvasPresentation | null>(null);
  const undoStack = useRef<CanvasPresentation[]>([]);
  const redoStack = useRef<CanvasPresentation[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => { canvasRef.current = canvas; });

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
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if (e.key === "y" || (e.key === "z" && e.shiftKey)) { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  /* ── Derived: active slide + selected element ────────────────────────── */
  const activeSlide = canvas?.slides.find((s) => s.id === activeSlideId) ?? null;
  const activeSlideIdx = canvas?.slides.findIndex((s) => s.id === activeSlideId) ?? -1;

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
    (patch: Partial<CanvasElement>) => {
      if (!selectedElementId || !activeSlideId || !canvasRef.current) return;
      const slide = canvasRef.current.slides.find((s) => s.id === activeSlideId);
      if (!slide) return;
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

  const addSlide = useCallback(() => {
    const newSlide = makeNewSlide(canvasRef.current?.themeId);
    pushHistory();
    setCanvas((prev) => prev ? { ...prev, slides: [...prev.slides, newSlide] } : prev);
    setActiveSlideId(newSlide.id);
    setDirty(true);
  }, [pushHistory]);

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
                s.id === activeSlideId ? { ...s, background: bg } : s,
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
          ? { ...prev, slides: prev.slides.map((s) => ({ ...s, background: bg })) }
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
        const response = await dispatch(
          chatWithDocument({ id: document.id, message: userMessage }),
        ).unwrap();
        if (response.chatAnswer) {
          setChatHistory((prev) => [
            ...prev,
            { role: "assistant", content: response.chatAnswer },
          ]);

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
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro na conversa com IA.";
        setChatError(msg);
      } finally {
        setIsChatting(false);
      }
    },
    [dispatch, document?.id, pushHistory], // eslint-disable-line react-hooks/exhaustive-deps
  );

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

  /* ── Reset image toolbar when selection changes ────────────────────────── */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setImgMode("none"); }, [selectedElementId]);

  /* ── Image toolbar handlers ──────────────────────────────────────────── */

  const handleImageFileUpload = useCallback(
    async (file: File) => {
      if (!document?.id) return;
      setIsUploadingImg(true);
      try {
        const result = await uploadDocumentImage(
          document.id,
          file,
          (selectedImgEl as CanvasImageElement)?.prompt ?? "",
        );
        applyElementPatch({
          url: result.image.url ?? undefined,
          imageBackendId: result.image.id,
        } as Partial<CanvasImageElement>);
        toast.success("Imagem carregada com sucesso");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao carregar imagem";
        toast.error(msg);
      } finally {
        setIsUploadingImg(false);
        // Reset the input so the same file can be re-selected
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [document?.id, selectedImgEl, applyElementPatch],
  );

  const handleGenerateImage = useCallback(
    async (prompt: string) => {
      if (!document?.id) return;
      setIsGeneratingImg(true);
      try {
        const imgEl = selectedImgEl as CanvasImageElement;
        const result = imgEl.imageBackendId
          ? await regenerateDocumentImageService(document.id, imgEl.imageBackendId, prompt)
          : await generateDocumentImage(document.id, prompt);
        if (result.newUrl) {
          applyElementPatch({
            url: result.newUrl,
            prompt,
            imageBackendId: result.id,
          } as Partial<CanvasImageElement>);
          toast.success("Imagem gerada com sucesso");
          setImgMode("none");
        } else {
          toast.error("A imagem ficou em processamento. Tenta novamente em breve.");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao gerar imagem";
        toast.error(msg);
      } finally {
        setIsGeneratingImg(false);
      }
    },
    [document?.id, selectedImgEl, applyElementPatch],
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
            slide.addText(t.text, {
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
            slide.addText(bulletItems, {
              x, y, w, h,
              fontSize: Math.max(8, Math.round(l.fontSize * FS_SCALE)),
              color: toHex6(l.color),
              fontFace: "Calibri",
              valign: "top",
              wrap: true,
            });
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
      const { PDFDocument, rgb } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.create();
      const PAGE_W = 960;
      const PAGE_H = 540;

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
            // pdf-lib y origin is bottom-left; flip from top-left
            page.drawText(t.text, {
              x: el.x * PAGE_W,
              y: PAGE_H - el.y * PAGE_H - fontSize * 1.3,
              size: fontSize,
              color: rgb(c.r, c.g, c.b),
              maxWidth: el.w * PAGE_W,
              lineHeight: fontSize * 1.3,
            });
          } else if (el.type === "bullet_list" || el.type === "ordered_list") {
            const l = el as CanvasListElement;
            const isOrdered = el.type === "ordered_list";
            const fontSize = Math.max(6, Math.round(l.fontSize * PAGE_W));
            const c = hexToRgb01(l.color);
            const itemH = (el.h * PAGE_H) / Math.max(1, l.items.length);
            l.items.forEach((item, i) => {
              const text = isOrdered ? `${i + 1}. ${item}` : `• ${item}`;
              page.drawText(text, {
                x: el.x * PAGE_W,
                y: PAGE_H - el.y * PAGE_H - i * itemH - fontSize * 1.3,
                size: fontSize,
                color: rgb(c.r, c.g, c.b),
                maxWidth: el.w * PAGE_W,
              });
            });
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
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
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

          <Link href={`${Routes.PRESENTATION_EDITOR.replace(":id", documentId)}/present`}>
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

          {/* IMAGE actions */}
          {selectedImgEl && (
            <>
              {/* Hidden file input — triggered by "Carregar da PC" button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImageFileUpload(file);
                }}
              />

              {imgMode === "url" ? (
                /* ── URL paste input ── */
                <div className="flex items-center gap-1">
                  <input
                    type="url"
                    value={imgUrlDraft}
                    autoFocus
                    onChange={(e) => setImgUrlDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && imgUrlDraft.trim()) {
                        applyElementPatch({ url: imgUrlDraft.trim() } as Partial<CanvasImageElement>);
                        setImgMode("none"); setImgUrlDraft("");
                      }
                      if (e.key === "Escape") { setImgMode("none"); setImgUrlDraft(""); }
                    }}
                    placeholder="https://..."
                    className="h-7 w-52 rounded border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <Button size="sm" className="h-7 text-xs"
                    onClick={() => {
                      if (imgUrlDraft.trim()) applyElementPatch({ url: imgUrlDraft.trim() } as Partial<CanvasImageElement>);
                      setImgMode("none"); setImgUrlDraft("");
                    }}>OK</Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs"
                    onClick={() => { setImgMode("none"); setImgUrlDraft(""); }}>Cancelar</Button>
                </div>
              ) : imgMode === "generate" ? (
                /* ── AI generation panel ── */
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={imgPromptDraft}
                    autoFocus
                    onChange={(e) => setImgPromptDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && imgPromptDraft.trim() && !isGeneratingImg) {
                        void handleGenerateImage(imgPromptDraft.trim());
                      }
                      if (e.key === "Escape") setImgMode("none");
                    }}
                    placeholder="Descreve a imagem a gerar..."
                    className="h-7 w-64 rounded border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    disabled={isGeneratingImg}
                  />
                  <Button size="sm" className="h-7 gap-1 text-xs"
                    disabled={!imgPromptDraft.trim() || isGeneratingImg}
                    onClick={() => void handleGenerateImage(imgPromptDraft.trim())}
                  >
                    {isGeneratingImg ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    {isGeneratingImg ? "A gerar…" : "Gerar"}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs"
                    onClick={() => setImgMode("none")} disabled={isGeneratingImg}>Cancelar</Button>
                </div>
              ) : (
                /* ── Normal: Trocar / Gerar buttons ── */
                <>
                  <Button
                    variant="ghost" size="sm" className="h-7 gap-1 text-xs"
                    title="Carregar imagem do computador"
                    disabled={isUploadingImg}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {isUploadingImg
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <Upload className="h-3 w-3" />}
                    {isUploadingImg ? "A carregar…" : "Carregar da PC"}
                  </Button>
                  <Button
                    variant="ghost" size="sm" className="h-7 gap-1 text-xs"
                    title="Colar URL de imagem"
                    onClick={() => {
                      setImgUrlDraft((selectedImgEl as CanvasImageElement).url ?? "");
                      setImgMode("url");
                    }}
                  >
                    <Link2 className="h-3 w-3" />
                    Por URL
                  </Button>
                  <div className="mx-1 h-5 w-px bg-border" />
                  <Button
                    variant="ghost" size="sm" className="h-7 gap-1 text-xs text-primary"
                    title="Gera uma nova imagem com IA a partir de um prompt"
                    onClick={() => {
                      setImgPromptDraft((selectedImgEl as CanvasImageElement).prompt ?? "");
                      setImgMode("generate");
                    }}
                  >
                    <Sparkles className="h-3 w-3" />
                    Gerar imagem
                  </Button>
                </>
              )}
            </>
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
        <aside className="flex w-44 flex-shrink-0 flex-col overflow-y-auto border-r border-border bg-muted/20">
          <div className="flex flex-col gap-3 p-3">
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
            <Button variant="outline" size="sm" className="w-full border-dashed text-xs" onClick={addSlide}>
              + Slide
            </Button>
          </div>
        </aside>

        {/* Main canvas — flex-1 so it fills remaining height; overflow-hidden
             so the slide never causes scrolling (SlideKonvaEditor computes
             stage size to fit within available h/w).                        */}
        <main className="flex flex-1 min-h-0 flex-col items-center overflow-hidden bg-neutral-100 dark:bg-zinc-900">
          {activeSlide ? (
            <div className="flex w-full flex-1 min-h-0 flex-col items-center justify-center">
              <p className="mb-1 shrink-0 text-center text-xs text-muted-foreground">
                Slide {activeSlideIdx + 1} / {canvas.slides.length}
                {selectedElement ? ` · ${selectedElement.type}` : ""}
                {activeSlide.hidden ? " · oculto" : ""}
              </p>
              {/* Canvas wrapper — flex-1 takes all remaining height.
                   zoom ≤ 1 : shrink the inner div height so the ResizeObserver inside
                              SlideKonvaEditor sees a smaller container and renders the
                              Konva stage at a proportionally smaller pixel size.
                   zoom > 1 : keep the inner div at 100 % and apply a CSS scale
                              transform so the stage renders at native resolution and
                              visually enlarges (edges clip at the overflow boundary). */}
              <div className="flex w-full flex-1 min-h-0 items-center justify-center overflow-hidden">
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
                  />
                </div>
              </div>

              {/* Zoom slider */}
              <div className="flex shrink-0 items-center gap-2 pb-1.5">
                <input
                  type="range"
                  min={ZOOM_MIN * 100}
                  max={ZOOM_MAX * 100}
                  step={5}
                  value={Math.round(zoom * 100)}
                  onChange={(e) =>
                    setZoom(parseFloat((Number(e.target.value) / 100).toFixed(2)))
                  }
                  className="w-24 accent-primary cursor-pointer"
                  title="Zoom"
                />
                <button
                  type="button"
                  onClick={() => setZoom(1.0)}
                  className="min-w-[3rem] rounded border border-border bg-background px-2 py-0.5 text-center text-[11px] text-muted-foreground hover:bg-muted"
                  title="Repor zoom para 100%"
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
            showGenerationHint
          />
        </aside>
      </div>
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
