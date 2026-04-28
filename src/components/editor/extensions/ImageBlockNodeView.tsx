import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Loader2, Minus, Plus, RefreshCcw, Trash2 } from "lucide-react";
import { useAppDispatch, useAppSelector, selectEditorState } from "@/store/hooks";
import { deleteDocumentImage, regenerateDocumentImage } from "@/store/documents/documentSlice";
import { selectIsPro } from "@/store/subscription/selectors";
import { useCallback, useEffect, useState } from "react";
import posthog from "posthog-js";
import { toast } from "sonner";
import { cn } from "@/shared/utils/utils";

const DELETE_UNDO_WINDOW_MS = 6000;
const MIN_IMAGE_WIDTH_PERCENT = 30;
const MAX_IMAGE_WIDTH_PERCENT = 100;
const IMAGE_RESIZE_STEP_PERCENT = 10;
const STABLE_REF_HYDRATION_TIMEOUT_MS = 5000;

type PendingImageDeletion = {
  timeoutId: ReturnType<typeof setTimeout>;
  restore: () => void;
  dismissToast: () => void;
};

const pendingImageDeletions = new Map<string, PendingImageDeletion>();

function buildImageEventProps(
  documentId: string | undefined,
  imageId: string | null | undefined,
  imageKind: string | undefined,
  imageSource: string | null | undefined,
) {
  return {
    document_id: documentId ?? null,
    image_id: imageId ?? null,
    image_kind: imageKind ?? null,
    image_source: imageSource ?? null,
  };
}

function normalizeImageWidth(value: unknown): number {
  const numeric =
    typeof value === "number" ? value : Number.parseInt(String(value ?? MAX_IMAGE_WIDTH_PERCENT), 10);
  if (!Number.isFinite(numeric)) {
    return MAX_IMAGE_WIDTH_PERCENT;
  }
  return Math.max(MIN_IMAGE_WIDTH_PERCENT, Math.min(MAX_IMAGE_WIDTH_PERCENT, Math.round(numeric)));
}

function hasImageReferenceInDocument(
  editor: NodeViewProps["editor"],
  imageId: string,
  placeholderToken: string | null,
): boolean {
  const stableToken = `{{DOCUMENT_IMAGE:${imageId}}}`;
  const placeholderRef = placeholderToken
    ? `{{IMAGE_PLACEHOLDER:${placeholderToken}}}`
    : null;

  let found = false;
  editor.state.doc.descendants((docNode) => {
    if (docNode.type.name !== "imageBlock") {
      return true;
    }

    const nodeSrc = docNode.attrs?.src;
    if (typeof nodeSrc !== "string") {
      return true;
    }

    if (nodeSrc.includes(stableToken) || (!!placeholderRef && nodeSrc.includes(placeholderRef))) {
      found = true;
      return false;
    }

    return true;
  });

  return found;
}

export default function ImageBlockNodeView({ node, deleteNode, editor, getPos, updateAttributes }: NodeViewProps) {
  const dispatch = useAppDispatch();
  const { currentDocument, images, isGeneratingImages } = useAppSelector(selectEditorState);
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
  const [allowMissingState, setAllowMissingState] = useState(false);

  useEffect(() => {
    if (!isStableRef || isPlaceholder || generatedImage) {
      setAllowMissingState(true);
      return;
    }

    setAllowMissingState(false);
    const timeoutId = setTimeout(() => {
      setAllowMissingState(true);
    }, STABLE_REF_HYDRATION_TIMEOUT_MS);

    return () => clearTimeout(timeoutId);
  }, [generatedImage, isPlaceholder, isStableRef, stableImageId]);

  const imageId = generatedImage?.id ?? stableImageId;
  const finalSrc = generatedImage?.url ?? (isPlaceholder || isStableRef ? null : src);
  const shouldWaitForHydration =
    isStableRef && !generatedImage && (!allowMissingState || Boolean(isGeneratingImages));
  const status = generatedImage?.status
    ?? (isPlaceholder ? "pending" : isStableRef ? (shouldWaitForHydration ? "pending" : "missing") : "completed");
  const showActions = Boolean(imageId);
  const isCurrentImageGenerating = status === "generating" || status === "pending";
  const imageSource = generatedImage?.source
    ?? (generatedImage?.kind === "exercise" ? "exercise_renderer" : null);
  const isUserUploadedImage = imageSource === "user_upload";
  const canRegenerate = Boolean(isPremium && imageId && !isUserUploadedImage);
  const imageWidth = normalizeImageWidth(node.attrs.width);
  const imageEventProps = buildImageEventProps(
    currentDocument?.id,
    imageId,
    generatedImage?.kind,
    imageSource,
  );

  const handleDelete = useCallback(async () => {
    if (!currentDocument || !imageId) {
      deleteNode();
      return;
    }

    const key = `${currentDocument.id}:${imageId}`;
    const existingDeletion = pendingImageDeletions.get(key);
    if (existingDeletion) {
      clearTimeout(existingDeletion.timeoutId);
      existingDeletion.dismissToast();
      pendingImageDeletions.delete(key);
    }

    const nodeSnapshot = node.toJSON();
    const safePosition = typeof getPos === "function" ? getPos() : null;

    const restoreNode = () => {
      if (hasImageReferenceInDocument(editor, imageId, placeholderToken)) {
        return;
      }

      const insertionPosition =
        typeof safePosition === "number"
          ? Math.max(0, Math.min(safePosition, editor.state.doc.content.size))
          : editor.state.doc.content.size;

      editor
        .chain()
        .focus()
        .insertContentAt(insertionPosition, nodeSnapshot)
        .run();
    };

    deleteNode();
    posthog.capture("document_image_delete_requested", imageEventProps);

    const timeoutId = setTimeout(async () => {
      pendingImageDeletions.delete(key);
      try {
        await dispatch(
          deleteDocumentImage({ documentId: currentDocument.id, imageId }),
        ).unwrap();
        posthog.capture("document_image_deleted", imageEventProps);
        toast.success("Imagem removida com sucesso");
      } catch (error) {
        posthog.capture("document_image_delete_failed", imageEventProps);
        posthog.captureException(error);
        restoreNode();
        toast.error("Erro ao remover a imagem. A imagem foi restaurada.");
      }
    }, DELETE_UNDO_WINDOW_MS);

    const toastId = toast("Imagem removida.", {
      description: "Pode refazer esta ação durante alguns segundos.",
      duration: DELETE_UNDO_WINDOW_MS + 1200,
      action: {
        label: "Refazer",
        onClick: () => {
          const pendingDeletion = pendingImageDeletions.get(key);
          if (!pendingDeletion) {
            return;
          }
          clearTimeout(pendingDeletion.timeoutId);
          pendingDeletion.dismissToast();
          pendingImageDeletions.delete(key);
          pendingDeletion.restore();
          posthog.capture("document_image_delete_undone", imageEventProps);
          toast.success("Imagem restaurada.");
        },
      },
    });

    pendingImageDeletions.set(key, {
      timeoutId,
      restore: restoreNode,
      dismissToast: () => toast.dismiss(toastId),
    });
  }, [currentDocument, imageEventProps, imageId, node, getPos, editor, placeholderToken, deleteNode, dispatch]);

  const handleRegenerate = useCallback(async () => {
    if (isUserUploadedImage) {
      toast.error("Imagens carregadas pelo utilizador não suportam regeneração.");
      return;
    }
    if (!isPremium) {
      toast.error("A geracao de imagens esta disponivel apenas no plano Pro");
      return;
    }
    if (!currentDocument || !imageId || isCurrentImageGenerating) return;

    try {
      await dispatch(regenerateDocumentImage({ documentId: currentDocument.id, imageId })).unwrap();
      posthog.capture("document_image_regenerated", imageEventProps);
      toast.success("A gerar nova versao da imagem...");
    } catch (error) {
      posthog.capture("document_image_regeneration_failed", imageEventProps);
      posthog.captureException(error);
      toast.error("Erro ao regenerar a imagem");
    }
  }, [currentDocument, imageEventProps, imageId, dispatch, isCurrentImageGenerating, isPremium, isUserUploadedImage]);

  const handleResize = useCallback(
    (delta: number) => {
      const nextWidth = Math.max(
        MIN_IMAGE_WIDTH_PERCENT,
        Math.min(MAX_IMAGE_WIDTH_PERCENT, imageWidth + delta),
      );
      if (nextWidth === imageWidth) {
        return;
      }
      updateAttributes({ width: nextWidth });
    },
    [imageWidth, updateAttributes],
  );

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
            {canRegenerate && (
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

  if (status === "missing" && isStableRef) {
    return (
      <NodeViewWrapper className="my-6">
        <div className="relative flex min-h-[220px] w-full flex-col items-center justify-center rounded-xl border border-border bg-muted/20 p-8">
          <p className="mb-2 font-medium text-foreground">Imagem indisponível.</p>
          <p className="mb-4 max-w-xl text-center text-sm text-muted-foreground">
            Esta imagem foi removida ou ainda não está sincronizada.
          </p>
          <div className="flex gap-3">
            {canRegenerate && (
              <button
                onClick={handleRegenerate}
                className="flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm shadow-sm transition-colors hover:bg-muted"
                type="button"
              >
                <RefreshCcw className="h-4 w-4" /> Regenerar
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
              {canRegenerate && (
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
      style={{
        width: `${imageWidth}%`,
        maxWidth: "100%",
        marginLeft: "auto",
        marginRight: "auto",
      }}
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
          <button
            onClick={() => handleResize(-IMAGE_RESIZE_STEP_PERCENT)}
            disabled={imageWidth <= MIN_IMAGE_WIDTH_PERCENT}
            className="rounded-md border border-border bg-background p-2 text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            title="Diminuir imagem"
            type="button"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleResize(IMAGE_RESIZE_STEP_PERCENT)}
            disabled={imageWidth >= MAX_IMAGE_WIDTH_PERCENT}
            className="rounded-md border border-border bg-background p-2 text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            title="Aumentar imagem"
            type="button"
          >
            <Plus className="h-4 w-4" />
          </button>
          {canRegenerate && (
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
