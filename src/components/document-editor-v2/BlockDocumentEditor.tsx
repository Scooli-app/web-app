/**
 * BlockDocumentEditor — minimal v1 editor for JSON-backed documents
 * (Presentations pilot). SCOOL-131.
 *
 * Pragmatic scope for the first cut:
 *   - Loads document JSON via the existing fetchDocument flow.
 *   - Shows the {@link GenerationProgress} overlay while the doc is generating.
 *   - Once status="completed", parses content into a typed PresentationDocument
 *     and renders slide-by-slide cards: editable title/subtitle inputs + read-only
 *     content preview via {@link SlideRenderer}.
 *   - Explicit "Guardar" button (no auto-save yet) → updateDocument with serialized JSON.
 *   - "Apresentar" button → /presentation/{id}/present.
 *
 * Deferred to follow-up tickets:
 *   - BlockNote integration (SCOOL-129 full): rich-editor blocks for slide content
 *   - Layout picker, add/delete/reorder slides (SCOOL-131 extensions)
 *   - JSON-aware AI chat panel (SCOOL-134, HIGH RISK)
 *   - Auto-save (debounce + diff)
 */
"use client";

import {
  parsePresentationDocument,
  type PresentationDocument,
  type SlideBlock,
} from "@/shared/types/blocks";
import {
  fetchDocument,
  updateDocument,
} from "@/store/documents/documentSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { Loader2, Play, Save } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGenerationProgress } from "@/hooks/useGenerationProgress";
import { Routes } from "@/shared/types";
import { GenerationProgress } from "@/components/blocks/GenerationProgress";
import { SlideRenderer } from "@/components/blocks/SlideRenderer";

interface Props {
  documentId: string;
}

export function BlockDocumentEditor({ documentId }: Props) {
  const dispatch = useAppDispatch();
  const document = useAppSelector((s) => s.documents.currentDocument);
  const isLoading = useAppSelector((s) => s.documents.isLoading);

  // Fetch on mount + when id changes.
  useEffect(() => {
    if (documentId) {
      void dispatch(fetchDocument(documentId));
    }
  }, [dispatch, documentId]);

  // Subscribe to generation progress while the doc is being generated.
  const inProgress =
    !!document &&
    (document.status === "generating" || document.status === "processing");
  const progress = useGenerationProgress({
    documentId: inProgress ? documentId : null,
  });

  // When generation finishes (SSE done), re-fetch to pick up the final JSON.
  useEffect(() => {
    if (progress.isDone) {
      void dispatch(fetchDocument(documentId));
    }
  }, [progress.isDone, documentId, dispatch]);

  // Parse the document JSON (memoized). null if content isn't valid JSON yet.
  const parsed = useMemo<PresentationDocument | null>(() => {
    if (!document || document.contentFormat !== "json" || !document.content) {
      return null;
    }
    try {
      return parsePresentationDocument(document.content);
    } catch {
      return null;
    }
  }, [document]);

  // Local working copy — edits go here, persisted via the Guardar button.
  const [working, setWorking] = useState<PresentationDocument | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (parsed) {
      setWorking(parsed);
      setDirty(false);
    }
  }, [parsed]);

  const updateSlide = (slideId: string, patch: Partial<SlideBlock>) => {
    setWorking((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        blocks: prev.blocks.map((s) =>
          s.id === slideId ? { ...s, ...patch } : s,
        ),
      };
    });
    setDirty(true);
  };

  const handleSave = async () => {
    if (!working || !document) return;
    setSaving(true);
    try {
      const serialized = JSON.stringify(working);
      const result = await dispatch(
        updateDocument({
          id: documentId,
          title: document.title,
          content: serialized,
        }),
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

  /* ------------------------------------------------------------------ */
  /* Render branches                                                     */
  /* ------------------------------------------------------------------ */

  if (isLoading && !document) {
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

  // Generation still running — show overlay until SSE reports done.
  if (inProgress) {
    return (
      <GenerationProgress
        phase={progress.phase}
        imageProgress={progress.imageProgress}
        error={progress.error}
      />
    );
  }

  // Failed status — surface the error.
  if (document.status === "failed") {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h2 className="text-lg font-semibold text-foreground">
          A geração falhou
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Tenta criar a apresentação outra vez. Se o problema persistir, contacta
          o suporte.
        </p>
      </div>
    );
  }

  // Content missing or unparseable — defensive (shouldn't happen in normal flow).
  if (!working) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h2 className="text-lg font-semibold text-foreground">
          Não foi possível carregar a apresentação
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          O conteúdo não está em formato válido. Recarrega a página ou cria a
          apresentação novamente.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-foreground sm:text-xl">
            {document.title}
          </h1>
          <p className="text-xs text-muted-foreground">
            {working.blocks.length} slides
            {dirty ? " · alterações por guardar" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={!dirty || saving}
            variant={dirty ? "default" : "outline"}
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Guardar
          </Button>
          <Link
            href={Routes.PRESENTATION_EDITOR.replace(":id", documentId) + "/present"}
          >
            <Button variant="default">
              <Play className="mr-2 h-4 w-4" />
              Apresentar
            </Button>
          </Link>
        </div>
      </div>

      {/* Slide cards */}
      <div className="flex flex-col gap-6">
        {working.blocks.map((slide, idx) => (
          <SlideCard
            key={slide.id}
            slide={slide}
            index={idx + 1}
            total={working.blocks.length}
            onChange={(patch) => updateSlide(slide.id, patch)}
          />
        ))}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * One slide card — editable header + read-only preview side-by-side on wide
 * viewports; stacked on narrow.
 * -------------------------------------------------------------------------- */

function SlideCard({
  slide,
  index,
  total,
  onChange,
}: {
  slide: SlideBlock;
  index: number;
  total: number;
  onChange: (patch: Partial<SlideBlock>) => void;
}) {
  return (
    <Card className="p-4 sm:p-6">
      <div className="mb-4 flex items-baseline gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          Slide {index} / {total}
        </span>
        <span className="text-xs text-muted-foreground">{slide.layout}</span>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Edit panel */}
        <div className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label htmlFor={`title-${slide.id}`}>Título</Label>
            <Input
              id={`title-${slide.id}`}
              value={slide.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Título do slide"
            />
          </div>
          {slide.layout === "title" || slide.subtitle !== undefined ? (
            <div className="space-y-1.5">
              <Label htmlFor={`subtitle-${slide.id}`}>Subtítulo</Label>
              <Input
                id={`subtitle-${slide.id}`}
                value={slide.subtitle ?? ""}
                onChange={(e) =>
                  onChange({ subtitle: e.target.value || undefined })
                }
                placeholder="Subtítulo (opcional)"
              />
            </div>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Edição rica do conteúdo do slide chega na próxima iteração. Por
            agora, podes editar título e subtítulo, e ver a pré-visualização.
          </p>
        </div>

        {/* Preview */}
        <div>
          <SlideRenderer slide={slide} />
        </div>
      </div>
    </Card>
  );
}
