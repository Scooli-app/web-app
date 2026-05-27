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
import { useGenerationProgress } from "@/hooks/useGenerationProgress";
import { parsePresentationDocument } from "@/shared/types/blocks";
import type {
  CanvasElement,
  CanvasListElement,
  CanvasPresentation,
  CanvasSlide,
  CanvasTextElement,
} from "@/shared/types/canvas-presentation";
import { isCanvasPresentation } from "@/shared/types/canvas-presentation";
import { getThemeById } from "@/shared/types/presentation-theme";
import { Routes } from "@/shared/types";
import { fetchDocument, updateDocument, chatWithDocument } from "@/store/documents/documentSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  ChevronUp,
  Download,
  Italic,
  Loader2,
  Play,
  Plus,
  Redo2,
  Save,
  Sparkles,
  Trash2,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { applyTheme, presentationToCanvas } from "./canvas-layout";
import type { SlideKonvaEditorHandle } from "./SlideKonvaEditor";
import { SlideKonvaEditor } from "./SlideKonvaEditor";
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
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (canvasFromDoc) {
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
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro na conversa com IA.";
        setChatError(msg);
      } finally {
        setIsChatting(false);
      }
    },
    [dispatch, document?.id],
  );

  /** Convenience: fire a preset AI prompt pre-filled with element context. */
  const sendAIAction = useCallback(
    (prompt: string) => {
      void handleChatSubmit(prompt);
    },
    [handleChatSubmit],
  );

  /* ── Save ────────────────────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!canvas || !document) return;
    setSaving(true);
    try {
      const result = await dispatch(
        updateDocument({ id: documentId, title: document.title, content: JSON.stringify(canvas) }),
      );
      if (updateDocument.fulfilled.match(result)) {
        toast.success("Apresentação guardada");
        setDirty(false);
      } else {
        toast.error("Não foi possível guardar.");
      }
    } catch {
      toast.error("Erro ao guardar.");
    } finally {
      setSaving(false);
    }
  };

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
        {/* Title */}
        <div className="mr-2 min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{document.title}</p>
          <p className="text-[10px] text-muted-foreground">
            {canvas.slides.length} slide{canvas.slides.length !== 1 ? "s" : ""}
            {dirty ? " · por guardar" : ""}
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

        <Button variant="outline" size="sm" className="h-8" onClick={handleExportPPTX} disabled={exporting}>
          {exporting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1.5 h-3.5 w-3.5" />}
          Exportar PPTX
        </Button>

        <Button
          onClick={handleSave}
          disabled={!dirty || saving}
          variant={dirty ? "default" : "outline"}
          size="sm"
          className="h-8"
        >
          {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
          Guardar
        </Button>

        <Link href={Routes.PRESENTATION_EDITOR.replace(":id", documentId) + "/present"}>
          <Button variant="default" size="sm" className="h-8">
            <Play className="mr-1.5 h-3.5 w-3.5" />
            Apresentar
          </Button>
        </Link>
      </div>

      {/* ── Contextual toolbar — formatting + AI actions ──────────────── */}
      {selectedElement && (
        <div className="flex flex-shrink-0 flex-wrap items-center gap-1 border-b border-border bg-muted/30 px-3 py-1.5">

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

              {/* Colour swatches */}
              {COLOR_PRESETS.map(({ color, label }) => (
                <button
                  key={color}
                  title={label}
                  className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 ${
                    selectedTextEl.color === color ? "scale-110 border-foreground" : "border-transparent"
                  }`}
                  style={{ background: color }}
                  onClick={() => applyElementPatch({ color })}
                />
              ))}

              <div className="mx-1 h-5 w-px bg-border" />

              {/* AI quick-actions */}
              <Button
                variant="ghost" size="sm" className="h-7 gap-1 text-xs text-primary"
                title="Pede à IA para simplificar este texto"
                onClick={() => sendAIAction(`Simplifica este texto para ser mais conciso e claro, mantendo o significado. Responde apenas com o texto melhorado (sem explicações): "${selectedTextEl.text}"`)}
              >
                <Sparkles className="h-3 w-3" />
                Simplificar
              </Button>
              <Button
                variant="ghost" size="sm" className="h-7 gap-1 text-xs text-primary"
                title="Pede à IA para expandir este texto"
                onClick={() => sendAIAction(`Expande este texto com mais detalhes relevantes, mantendo um estilo adequado para apresentação. Responde apenas com o texto expandido: "${selectedTextEl.text}"`)}
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

              <Button
                variant="ghost" size="sm" className="h-7 gap-1 text-xs text-primary"
                title="Pede à IA para melhorar esta lista"
                onClick={() => sendAIAction(`Melhora esta lista para uma apresentação escolar. Mantém o mesmo número de itens. Responde apenas com os itens da lista (um por linha): ${selectedListEl.items.join("\n")}`)}
              >
                <Sparkles className="h-3 w-3" />
                Melhorar lista
              </Button>
            </>
          )}

          {/* IMAGE actions */}
          {selectedImgEl && (
            <Button
              variant="ghost" size="sm" className="h-7 gap-1 text-xs text-primary"
              title="Pede à IA uma melhor descrição para a imagem"
              onClick={() => sendAIAction(`Sugere uma descrição mais específica e visual para uma imagem numa apresentação. Descrição atual: "${(selectedImgEl as { prompt?: string }).prompt ?? ""}". Responde com 1 frase descritiva.`)}
            >
              <Sparkles className="h-3 w-3" />
              Melhorar imagem
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
        </div>
      )}

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
              />
            ))}
          </div>
          <div className="sticky bottom-0 mt-auto p-3 pt-0">
            <Button variant="outline" size="sm" className="w-full border-dashed text-xs" onClick={addSlide}>
              + Slide
            </Button>
          </div>
        </aside>

        {/* Main canvas */}
        <main className="flex flex-1 flex-col items-center justify-start overflow-auto bg-zinc-800 p-4 pt-6">
          {activeSlide ? (
            <div className="flex w-full flex-col gap-2">
              <p className="text-center text-xs text-white/40">
                Slide {activeSlideIdx + 1} / {canvas.slides.length}
                {selectedElement ? ` · ${selectedElement.type}` : ""}
              </p>
              <SlideKonvaEditor
                ref={editorRef}
                slide={activeSlide}
                onChange={(elements) => updateSlide(activeSlide.id, elements)}
                onSelectionChange={setSelectedElementId}
              />
            </div>
          ) : (
            <p className="text-sm text-white/30">Nenhum slide selecionado</p>
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
}

function SlideItem({
  slide, index, isActive, isFirst, isLast, isOnly,
  onClick, onMoveUp, onMoveDown, onDelete,
}: SlideItemProps) {
  return (
    <div className="group relative cursor-pointer" onClick={onClick}>
      <SlideThumbnail slide={slide} index={index} isActive={isActive} onClick={onClick} />

      {/* Up / Down arrows — bottom-right corner, stacked vertically */}
      <div className="absolute bottom-1 right-1 flex flex-col gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          disabled={isFirst}
          onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
          className="rounded bg-black/50 p-0.5 text-white transition-colors hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-30"
          title="Mover para cima"
        >
          <ChevronUp className="h-3 w-3" />
        </button>
        <button
          type="button"
          disabled={isLast}
          onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
          className="rounded bg-black/50 p-0.5 text-white transition-colors hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-30"
          title="Mover para baixo"
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>

      {/* Delete — top-right corner, only shown when not the only slide */}
      {!isOnly && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute right-1 top-1 rounded bg-red-600/80 p-0.5 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
          title="Eliminar slide"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
