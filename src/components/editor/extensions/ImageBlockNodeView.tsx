import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Loader2, RefreshCcw, Trash2 } from "lucide-react";
import { useAppDispatch, useAppSelector, selectEditorState } from "@/store/hooks";
import { deleteDocumentImage, regenerateDocumentImage } from "@/store/documents/documentSlice";
import { selectIsPro } from "@/store/subscription/selectors";
import { useCallback } from "react";
import { toast } from "sonner";
import { cn } from "@/shared/utils/utils";

export default function ImageBlockNodeView({ node, deleteNode }: NodeViewProps) {
  const dispatch = useAppDispatch();
  const { currentDocument, images } = useAppSelector(selectEditorState);
  const isPremium = useAppSelector(selectIsPro);

  const src = node.attrs.src;
  const alt = node.attrs.alt;
  const stableImageMatch = typeof src === "string" ? src.match(/{{DOCUMENT_IMAGE:(.+?)}}/) : null;
  const placeholderMatch =
    typeof src === "string" ? src.match(/{{IMAGE_PLACEHOLDER:(.+?)}}/) : null;
  const stableImageId = stableImageMatch?.[1] ?? node.attrs.imageId ?? null;
  const placeholderToken = placeholderMatch?.[1] ?? null;
  const isPlaceholder = Boolean(placeholderToken);
  const isStableRef = Boolean(stableImageId);

  const generatedImage = images?.find(
    (img) =>
      img.id === stableImageId ||
      (!!placeholderToken && img.placeholderToken === placeholderToken)
  );
  const imageId = generatedImage?.id ?? stableImageId;
  const finalSrc = generatedImage?.url ?? (isPlaceholder || isStableRef ? null : src);
  const status =
    generatedImage?.status ??
    (isPlaceholder || isStableRef ? "generating" : "completed");
  const showActions = Boolean(imageId);
  const isCurrentImageGenerating = status === "generating" || status === "pending";

  const handleDelete = useCallback(async () => {
    if (!currentDocument || !imageId) return deleteNode();

    try {
      await dispatch(deleteDocumentImage({ documentId: currentDocument.id, imageId })).unwrap();
      deleteNode();
      toast.success("Imagem removida com sucesso");
    } catch {
      toast.error("Erro ao remover a imagem");
    }
  }, [currentDocument, imageId, deleteNode, dispatch]);

  const handleRegenerate = useCallback(async () => {
    if (!isPremium) {
      toast.error("A geracao de imagens esta disponivel apenas no plano Pro");
      return;
    }
    if (!currentDocument || !imageId || isCurrentImageGenerating) return;

    try {
      await dispatch(regenerateDocumentImage({ documentId: currentDocument.id, imageId })).unwrap();
      toast.success("A gerar nova versao da imagem...");
    } catch {
      toast.error("Erro ao regenerar a imagem");
    }
  }, [currentDocument, imageId, dispatch, isCurrentImageGenerating, isPremium]);

  if (!isPremium && isPlaceholder) {
    return <NodeViewWrapper className="hidden" />;
  }

  if (status === "failed") {
    const failureMessage = generatedImage?.errorMessage;
    return (
      <NodeViewWrapper className="my-6">
        <div className="relative flex min-h-[220px] w-full flex-col items-center justify-center rounded-xl border border-destructive bg-destructive/10 p-8">
          <p className="mb-3 font-medium text-destructive">Falha ao gerar a imagem.</p>
          {failureMessage && (
            <p className="mb-4 max-w-xl text-center text-sm text-destructive/90">{failureMessage}</p>
          )}
          <div className="flex gap-3">
            {isPremium && (
              <button
                onClick={handleRegenerate}
                className="flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm shadow-sm transition-colors hover:bg-muted"
                type="button"
              >
                <RefreshCcw className="h-4 w-4" /> Tentar novamente
              </button>
            )}
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90"
              type="button"
            >
              <Trash2 className="h-4 w-4" /> Remover
            </button>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  if (status === "generating" || status === "pending" || (!finalSrc && (isPlaceholder || isStableRef))) {
    return (
      <NodeViewWrapper className="my-6">
        <div className="relative flex min-h-[260px] w-full flex-col items-center justify-center rounded-xl border border-border/70 bg-gradient-to-b from-muted/40 to-muted/10 px-6 py-10 shadow-sm sm:min-h-[320px]">
          {showActions && (
            <div className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-lg border border-border bg-background/95 p-1.5 shadow-sm">
              {isPremium && (
                <button
                  onClick={handleRegenerate}
                  disabled
                  className="rounded-md border border-border bg-background p-2 text-muted-foreground opacity-70"
                  title="A gerar imagem"
                  type="button"
                >
                  <RefreshCcw className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={handleDelete}
                className="rounded-md border border-border bg-background p-2 text-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                title="Eliminar imagem"
                type="button"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
          <p className="text-center font-medium text-foreground">
            A preparar a imagem do documento...
          </p>
          <div className="mt-4 h-2 w-48 overflow-hidden rounded-full bg-muted/70">
            <div className="h-full w-2/3 rounded-full bg-primary animate-pulse" />
          </div>
          {alt && <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">&quot;{alt}&quot;</p>}
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      className={cn(
        "group my-6 relative overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm transition-colors duration-200"
      )}
      data-drag-handle
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={finalSrc || ""}
        alt={alt || "Document Image"}
        className="w-full h-auto max-h-[640px] min-h-[220px] object-contain bg-muted/20 px-2 py-3 selection:bg-transparent sm:min-h-[280px]"
      />

      {showActions && (
        <div className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-lg border border-border bg-background/95 p-1.5 shadow-md opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          {isPremium && (
            <button
              onClick={handleRegenerate}
              disabled={isCurrentImageGenerating}
              className="rounded-md border border-border bg-background p-2 text-foreground transition-colors hover:bg-muted hover:text-primary disabled:opacity-50"
              title="Regenerar imagem"
              type="button"
            >
              <RefreshCcw className={cn("h-4 w-4", isCurrentImageGenerating ? "animate-spin" : "")} />
            </button>
          )}
          <button
            onClick={handleDelete}
            className="rounded-md border border-border bg-background p-2 text-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="Eliminar imagem"
            type="button"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </NodeViewWrapper>
  );
}
