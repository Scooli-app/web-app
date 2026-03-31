import { Button } from "@/components/ui/button";
import type {
  PresentationAsset,
  PresentationSlide,
  PresentationTextBlock,
  PresentationThemeId,
} from "@/shared/types/presentation";
import { cn } from "@/shared/utils/utils";
import { Plus, Trash2 } from "lucide-react";
import { PresentationSlideRenderer } from "./PresentationSlideRenderer";

interface PresentationSlideSidebarProps {
  slides: PresentationSlide[];
  themeId: PresentationThemeId;
  assets: PresentationAsset[];
  activeSlideId: string | null;
  onSelectSlide: (slideId: string) => void;
  onAddSlide: () => void;
  onRemoveSlide: (slideId: string) => void;
}

function getSlideLabel(slide: PresentationSlide, index: number): string {
  const titleBlock = slide.blocks.find(
    (block) => block.type === "title",
  ) as PresentationTextBlock | undefined;
  return titleBlock?.content?.trim() || `Slide ${index + 1}`;
}

export function PresentationSlideSidebar({
  slides,
  themeId,
  assets,
  activeSlideId,
  onSelectSlide,
  onAddSlide,
  onRemoveSlide,
}: PresentationSlideSidebarProps) {
  return (
    <aside className="rounded-[28px] border border-border/70 bg-card/90 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Slides</p>
          <p className="text-xs text-muted-foreground">
            Estrutura visual da apresentação.
          </p>
        </div>
        <Button type="button" size="sm" onClick={onAddSlide}>
          <Plus className="h-4 w-4" />
          Novo
        </Button>
      </div>

      <div className="mt-4 flex gap-3 overflow-x-auto pb-2 xl:max-h-[calc(100vh-12rem)] xl:flex-col xl:overflow-y-auto xl:overflow-x-visible">
        {slides.map((slide, index) => {
          const isActive = slide.id === activeSlideId;

          return (
            <div
              key={slide.id}
              className={cn(
                "min-w-[220px] shrink-0 rounded-[24px] border p-3 transition-all xl:min-w-0",
                isActive
                  ? "border-primary/50 bg-primary/5 shadow-sm"
                  : "border-border/70 bg-background/70 hover:border-primary/30 hover:bg-accent/30",
              )}
            >
              <button
                type="button"
                onClick={() => onSelectSlide(slide.id)}
                className="w-full text-left"
              >
                <div className="overflow-hidden rounded-[18px] border border-border/60 bg-muted/40 p-2 shadow-sm">
                  <PresentationSlideRenderer
                    slide={slide}
                    themeId={themeId}
                    assets={assets}
                    compact
                    readOnly
                  />
                </div>
              </button>

              <div className="mt-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Slide {index + 1}
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold text-foreground">
                    {getSlideLabel(slide, index)}
                  </p>
                </div>

                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={slides.length <= 1}
                  onClick={() => onRemoveSlide(slide.id)}
                  aria-label={`Remover slide ${index + 1}`}
                  className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
