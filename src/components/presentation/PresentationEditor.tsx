"use client";

import { PresentationSettingsPanel } from "@/components/presentation/PresentationSettingsPanel";
import { PresentationSlideSidebar } from "@/components/presentation/PresentationSlideSidebar";
import { PresentationSlideRenderer } from "@/components/presentation/PresentationSlideRenderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  addPresentationSlide,
  clearPresentationError,
  fetchPresentation,
  removePresentationSlide,
  savePresentation,
  setActiveSlide,
  setImageBlockAsset,
  setSelectedBlock,
  updateBulletsBlock,
  updateCalloutBlock,
  updateIconBlock,
  updateImageBlockMeta,
  updatePresentationTheme,
  updateSlideLayout,
  updateTextBlock,
  uploadPresentationAsset,
} from "@/store/presentation/presentationSlice";
import {
  selectActivePresentationSlide,
  selectCurrentPresentation,
  selectPresentationDirty,
  selectPresentationError,
  selectPresentationSaving,
  selectPresentationUploading,
  selectSelectedBlockId,
} from "@/store/presentation/selectors";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { downloadPresentationPdf } from "@/services/api/presentation.service";
import type {
  PresentationCalloutBlock,
  PresentationIconName,
  PresentationImageBlock,
} from "@/shared/types/presentation";
import { findPresentationBlock } from "@/shared/utils/presentation";
import { cn } from "@/shared/utils/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Download,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Wand2,
} from "lucide-react";

interface PresentationEditorProps {
  presentationId: string;
}

function formatGradeLevel(gradeLevel: string | null): string | null {
  if (!gradeLevel) {
    return null;
  }

  return gradeLevel.endsWith("º ano") ? gradeLevel : `${gradeLevel}º ano`;
}

export function PresentationEditor({
  presentationId,
}: PresentationEditorProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const currentPresentation = useAppSelector(selectCurrentPresentation);
  const activeSlide = useAppSelector(selectActivePresentationSlide);
  const selectedBlockId = useAppSelector(selectSelectedBlockId);
  const isSaving = useAppSelector(selectPresentationSaving);
  const isUploading = useAppSelector(selectPresentationUploading);
  const dirty = useAppSelector(selectPresentationDirty);
  const error = useAppSelector(selectPresentationError);
  const isLoading = useAppSelector((state) => state.presentation.isLoading);

  const [isExporting, setIsExporting] = useState(false);
  const errorToastRef = useRef<string | null>(null);

  useEffect(() => {
    dispatch(clearPresentationError());
    void dispatch(fetchPresentation(presentationId));
  }, [dispatch, presentationId]);

  useEffect(() => {
    if (error && error !== errorToastRef.current) {
      toast.error(error);
      errorToastRef.current = error;
      return;
    }

    if (!error) {
      errorToastRef.current = null;
    }
  }, [error]);

  const selectedBlock = useMemo(() => {
    if (!currentPresentation || !activeSlide || !selectedBlockId) {
      return null;
    }

    return findPresentationBlock(
      currentPresentation.content,
      activeSlide.id,
      selectedBlockId,
    );
  }, [activeSlide, currentPresentation, selectedBlockId]);

  const persistPresentation = useCallback(
    async (showSuccessToast = false) => {
      if (!currentPresentation) {
        return false;
      }

      try {
        await dispatch(
          savePresentation({
            id: currentPresentation.id,
            title: currentPresentation.title,
            themeId: currentPresentation.themeId,
            content: currentPresentation.content,
          }),
        ).unwrap();

        if (showSuccessToast) {
          toast.success("Apresentação guardada.");
        }
        return true;
      } catch (saveError) {
        toast.error(
          saveError instanceof Error
            ? saveError.message
            : "Não foi possível guardar a apresentação.",
        );
        return false;
      }
    },
    [currentPresentation, dispatch],
  );

  useEffect(() => {
    if (!currentPresentation || currentPresentation.id !== presentationId) {
      return;
    }

    if (!dirty || isSaving) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void persistPresentation(false);
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [currentPresentation, dirty, isSaving, persistPresentation, presentationId]);

  const handleTextChange = (blockId: string, value: string) => {
    if (!activeSlide) {
      return;
    }

    dispatch(
      updateTextBlock({
        slideId: activeSlide.id,
        blockId,
        content: value,
      }),
    );
  };

  const handleBulletsChange = (blockId: string, items: string[]) => {
    if (!activeSlide) {
      return;
    }

    dispatch(
      updateBulletsBlock({
        slideId: activeSlide.id,
        blockId,
        items,
      }),
    );
  };

  const handleCalloutChange = (
    blockId: string,
    nextValue: Partial<PresentationCalloutBlock>,
  ) => {
    if (!activeSlide) {
      return;
    }

    dispatch(
      updateCalloutBlock({
        slideId: activeSlide.id,
        blockId,
        nextValue,
      }),
    );
  };

  const handleImageMetaChange = (
    blockId: string,
    nextValue: Partial<PresentationImageBlock>,
  ) => {
    if (!activeSlide) {
      return;
    }

    dispatch(
      updateImageBlockMeta({
        slideId: activeSlide.id,
        blockId,
        nextValue,
      }),
    );
  };

  const handleIconTextChange = (blockId: string, value: string) => {
    if (!activeSlide) {
      return;
    }

    dispatch(
      updateTextBlock({
        slideId: activeSlide.id,
        blockId,
        content: value,
      }),
    );
  };

  const handleImageUpload = async (
    block: PresentationImageBlock,
    file: File,
  ) => {
    if (!activeSlide || !currentPresentation) {
      return;
    }

    try {
      const asset = await dispatch(
        uploadPresentationAsset({
          presentationId: currentPresentation.id,
          file,
          alt: block.alt,
        }),
      ).unwrap();

      dispatch(
        setImageBlockAsset({
          slideId: activeSlide.id,
          blockId: block.id,
          assetId: asset.id,
          altText: asset.altText,
        }),
      );
    } catch (uploadError) {
      toast.error(
        uploadError instanceof Error
          ? uploadError.message
          : "Não foi possível carregar a imagem.",
      );
    }
  };

  const handleExport = async () => {
    if (!currentPresentation) {
      return;
    }

    setIsExporting(true);

    try {
      if (dirty) {
        const saved = await persistPresentation(false);
        if (!saved) {
          return;
        }
      }

      await downloadPresentationPdf(
        currentPresentation.id,
        currentPresentation.title,
      );
    } catch (exportError) {
      toast.error(
        exportError instanceof Error
          ? exportError.message
          : "Não foi possível exportar a apresentação.",
      );
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading && (!currentPresentation || currentPresentation.id !== presentationId)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rounded-[28px] border border-border bg-card/80 p-6 shadow-sm">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span>A preparar o editor visual...</span>
        </div>
      </div>
    );
  }

  if (!currentPresentation || currentPresentation.id !== presentationId || !activeSlide) {
    return (
      <div className="rounded-[28px] border border-border bg-card/90 p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">
          Apresentação indisponível
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Não encontrámos esta apresentação ou a sessão perdeu o contexto.
        </p>
        <div className="mt-4 flex gap-3">
          <Button type="button" onClick={() => router.refresh()}>
            Tentar novamente
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/presentation">Voltar às apresentações</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="rounded-[30px] border border-border/70 bg-card/90 p-5 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <Link
              href="/presentation"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              Apresentações
            </Link>

            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {currentPresentation.title}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                O conteúdo é editado diretamente no slide. O painel lateral ajuda
                com estrutura, tema e propriedades visuais sem sair do canvas.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{currentPresentation.subject}</Badge>
              {formatGradeLevel(currentPresentation.gradeLevel) ? (
                <Badge variant="outline">
                  {formatGradeLevel(currentPresentation.gradeLevel)}
                </Badge>
              ) : null}
              <Badge
                className={cn(
                  dirty && "bg-amber-500 text-white hover:bg-amber-500",
                  !dirty &&
                    !isSaving &&
                    "bg-emerald-500 text-white hover:bg-emerald-500",
                )}
              >
                {isSaving
                  ? "A guardar..."
                  : dirty
                    ? "Alterações por guardar"
                    : "Tudo guardado"}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => dispatch(addPresentationSlide())}
            >
              <Plus className="h-4 w-4" />
              Novo slide
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!dirty || isSaving}
              onClick={() => void persistPresentation(true)}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Guardar agora
            </Button>
            <Button
              type="button"
              onClick={() => void handleExport()}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Exportar PDF
            </Button>
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
        <div className="order-2 xl:order-1">
          <PresentationSlideSidebar
            slides={currentPresentation.content.slides}
            themeId={currentPresentation.themeId}
            assets={currentPresentation.assets}
            activeSlideId={activeSlide.id}
            onSelectSlide={(slideId) => dispatch(setActiveSlide(slideId))}
            onAddSlide={() => dispatch(addPresentationSlide())}
            onRemoveSlide={(slideId) => dispatch(removePresentationSlide(slideId))}
          />
        </div>

        <main className="order-1 space-y-4 xl:order-2">
          <div className="rounded-[32px] border border-border/70 bg-gradient-to-b from-background to-muted/40 p-3 shadow-sm sm:p-6">
            <div className="mx-auto w-full max-w-[1180px]">
              <PresentationSlideRenderer
                slide={activeSlide}
                themeId={currentPresentation.themeId}
                assets={currentPresentation.assets}
                selectedBlockId={selectedBlockId}
                isUploading={isUploading}
                onSelectBlock={(blockId) => dispatch(setSelectedBlock(blockId))}
                onTextChange={handleTextChange}
                onBulletsChange={handleBulletsChange}
                onCalloutChange={handleCalloutChange}
                onImageMetaChange={handleImageMetaChange}
                onIconTextChange={handleIconTextChange}
                onImageUpload={handleImageUpload}
              />
            </div>
          </div>

          <div className="rounded-[24px] border border-border/70 bg-card/80 p-4 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Edição slide-first
                </p>
                <p className="text-sm text-muted-foreground">
                  Clica diretamente nos blocos para editar. Não há separação entre
                  preview e conteúdo final.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Wand2 className="h-4 w-4 text-primary" />
                {selectedBlock
                  ? `Bloco ativo: ${selectedBlock.type}`
                  : "Seleciona um bloco para ajustar propriedades visuais."}
              </div>
            </div>
          </div>
        </main>

        <div className="order-3">
          <PresentationSettingsPanel
            presentation={currentPresentation}
            activeSlide={activeSlide}
            selectedBlock={selectedBlock}
            onThemeChange={(themeId) => dispatch(updatePresentationTheme(themeId))}
            onSlideLayoutChange={(layout) =>
              dispatch(updateSlideLayout({ slideId: activeSlide.id, layout }))
            }
            onImageMetaChange={(nextValue) => {
              if (!selectedBlock || selectedBlock.type !== "image") {
                return;
              }

              handleImageMetaChange(selectedBlock.id, nextValue);
            }}
            onCalloutChange={(nextValue) => {
              if (!selectedBlock || selectedBlock.type !== "callout") {
                return;
              }

              handleCalloutChange(selectedBlock.id, nextValue);
            }}
            onIconChange={(name) => {
              if (!selectedBlock || selectedBlock.type !== "icon") {
                return;
              }

              dispatch(
                updateIconBlock({
                  slideId: activeSlide.id,
                  blockId: selectedBlock.id,
                  name: name as PresentationIconName,
                }),
              );
            }}
          />
        </div>
      </div>
    </div>
  );
}
