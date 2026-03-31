import type {
  PresentationAsset,
  PresentationBlock,
  PresentationBulletsBlock,
  PresentationCalloutBlock,
  PresentationContent,
  PresentationIconBlock,
  PresentationImageBlock,
  PresentationLayout,
  PresentationSlide,
  PresentationTextBlock,
  PresentationThemeId,
} from "@/shared/types/presentation";

export function createBlankSlide(index: number): PresentationSlide {
  const id = `slide-${index}`;
  return {
    id,
    layout: index === 1 ? "cover" : "title_bullets",
    blocks: [
      {
        id: `${id}-block-1`,
        type: "title",
        slot: "header",
        content: index === 1 ? "Nova apresentação" : `Slide ${index}`,
      } satisfies PresentationTextBlock,
      {
        id: `${id}-block-2`,
        type: "subtitle",
        slot: "subheader",
        content:
          index === 1
            ? "Edite os blocos diretamente no slide."
            : "Adicione uma ideia principal ou contexto.",
      } satisfies PresentationTextBlock,
      {
        id: `${id}-block-3`,
        type: "bullets",
        slot: "body",
        items: ["Ponto principal", "Contexto", "Exemplo"],
      } satisfies PresentationBulletsBlock,
      {
        id: `${id}-block-4`,
        type: "callout",
        slot: "supporting",
        title: "Destaque",
        content: "Use este bloco para reforçar a mensagem do slide.",
        tone: "info",
      } satisfies PresentationCalloutBlock,
    ],
  };
}

export function createDefaultPresentationContent(
  title = "Nova apresentação",
  themeId: PresentationThemeId = "scooli-dark",
): PresentationContent {
  const firstSlide = createBlankSlide(1);
  firstSlide.blocks = firstSlide.blocks.map((block) =>
    block.type === "title" ? { ...block, content: title } : block,
  );

  return {
    version: 1,
    title,
    themeId,
    slides: [firstSlide],
  };
}

export function buildPresentationAssetMap(assets: PresentationAsset[]): Map<string, PresentationAsset> {
  return new Map(assets.map((asset) => [asset.id, asset]));
}

export function findPresentationBlock(
  content: PresentationContent,
  slideId: string,
  blockId: string,
): PresentationBlock | null {
  const slide = content.slides.find((candidate) => candidate.id === slideId);
  if (!slide) {
    return null;
  }
  return slide.blocks.find((block) => block.id === blockId) ?? null;
}

export function updateSlideBlock(
  slides: PresentationSlide[],
  slideId: string,
  blockId: string,
  updater: (block: PresentationBlock) => PresentationBlock,
): PresentationSlide[] {
  return slides.map((slide) =>
    slide.id !== slideId
      ? slide
      : {
          ...slide,
          blocks: slide.blocks.map((block) =>
            block.id === blockId ? updater(block) : block,
          ),
        },
  );
}

export function appendSlide(slides: PresentationSlide[]): PresentationSlide[] {
  const nextIndex = slides.length + 1;
  return [...slides, createBlankSlide(nextIndex)];
}

export function removeSlide(slides: PresentationSlide[], slideId: string): PresentationSlide[] {
  if (slides.length <= 1) {
    return slides;
  }
  return slides.filter((slide) => slide.id !== slideId);
}

export function replaceSlideLayout(
  slides: PresentationSlide[],
  slideId: string,
  layout: PresentationLayout,
): PresentationSlide[] {
  return slides.map((slide) =>
    slide.id === slideId
      ? {
          ...slide,
          layout,
        }
      : slide,
  );
}

export function replaceImageAsset(
  slides: PresentationSlide[],
  slideId: string,
  blockId: string,
  assetId: string,
  altText: string,
): PresentationSlide[] {
  return updateSlideBlock(slides, slideId, blockId, (block) => {
    if (block.type !== "image") {
      return block;
    }
    const imageBlock: PresentationImageBlock = {
      ...block,
      assetId,
      alt: altText || block.alt,
    };
    return imageBlock;
  });
}

export function replaceIconBlockName(
  slides: PresentationSlide[],
  slideId: string,
  blockId: string,
  name: PresentationIconBlock["name"],
): PresentationSlide[] {
  return updateSlideBlock(slides, slideId, blockId, (block) =>
    block.type === "icon" ? { ...block, name } : block,
  );
}

export function replaceTextBlockContent(
  slides: PresentationSlide[],
  slideId: string,
  blockId: string,
  content: string,
): PresentationSlide[] {
  return updateSlideBlock(slides, slideId, blockId, (block) =>
    block.type === "title" ||
    block.type === "subtitle" ||
    block.type === "paragraph" ||
    block.type === "icon"
      ? { ...block, content }
      : block,
  );
}

export function replaceBulletsBlockItems(
  slides: PresentationSlide[],
  slideId: string,
  blockId: string,
  items: string[],
): PresentationSlide[] {
  return updateSlideBlock(slides, slideId, blockId, (block) =>
    block.type === "bullets" ? { ...block, items } : block,
  );
}

export function replaceCalloutBlock(
  slides: PresentationSlide[],
  slideId: string,
  blockId: string,
  nextValue: Partial<PresentationCalloutBlock>,
): PresentationSlide[] {
  return updateSlideBlock(slides, slideId, blockId, (block) =>
    block.type === "callout" ? { ...block, ...nextValue } : block,
  );
}

export function replaceImageBlockMeta(
  slides: PresentationSlide[],
  slideId: string,
  blockId: string,
  nextValue: Partial<PresentationImageBlock>,
): PresentationSlide[] {
  return updateSlideBlock(slides, slideId, blockId, (block) =>
    block.type === "image" ? { ...block, ...nextValue } : block,
  );
}
