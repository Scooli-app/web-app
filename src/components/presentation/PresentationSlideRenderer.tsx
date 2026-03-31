import type { CSSProperties } from "react";
import type {
  PresentationAsset,
  PresentationBlock,
  PresentationCalloutBlock,
  PresentationIconName,
  PresentationImageBlock,
  PresentationSlide,
  PresentationThemeId,
} from "@/shared/types/presentation";
import { buildPresentationAssetMap } from "@/shared/utils/presentation";
import { presentationIconMap } from "./presentation-icons";
import { getPresentationTheme } from "./presentation-themes";

interface PresentationSlideRendererProps {
  slide: PresentationSlide;
  themeId: PresentationThemeId;
  assets: PresentationAsset[];
  selectedBlockId?: string | null;
  readOnly?: boolean;
  compact?: boolean;
  isUploading?: boolean;
  onSelectBlock?: (blockId: string) => void;
  onTextChange?: (blockId: string, value: string) => void;
  onBulletsChange?: (blockId: string, items: string[]) => void;
  onCalloutChange?: (
    blockId: string,
    nextValue: Partial<PresentationCalloutBlock>,
  ) => void;
  onImageMetaChange?: (
    blockId: string,
    nextValue: Partial<PresentationImageBlock>,
  ) => void;
  onIconTextChange?: (blockId: string, value: string) => void;
  onIconChange?: (blockId: string, value: PresentationIconName) => void;
  onImageUpload?: (block: PresentationImageBlock, file: File) => void;
}

const slotOrder = [
  "header",
  "subheader",
  "body",
  "supporting",
  "media",
  "aside",
  "footer",
] as const;

function getLayoutStyles(layout: PresentationSlide["layout"]): {
  gridTemplateColumns: string;
  gridTemplateRows: string;
  slotStyles: Record<string, CSSProperties>;
} {
  switch (layout) {
    case "cover":
      return {
        gridTemplateColumns: "1.35fr 0.85fr",
        gridTemplateRows: "auto auto 1fr auto",
        slotStyles: {
          header: { gridColumn: "1 / -1", gridRow: "1" },
          subheader: { gridColumn: "1", gridRow: "2" },
          body: { gridColumn: "1", gridRow: "3" },
          supporting: { gridColumn: "2", gridRow: "2 / 4" },
          media: { gridColumn: "2", gridRow: "2 / 4" },
          aside: { gridColumn: "2", gridRow: "4" },
          footer: { gridColumn: "1 / -1", gridRow: "4" },
        },
      };
    case "two_column":
      return {
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "auto auto 1fr auto",
        slotStyles: {
          header: { gridColumn: "1 / -1", gridRow: "1" },
          subheader: { gridColumn: "1 / -1", gridRow: "2" },
          body: { gridColumn: "1", gridRow: "3" },
          supporting: { gridColumn: "1", gridRow: "4" },
          media: { gridColumn: "2", gridRow: "3" },
          aside: { gridColumn: "2", gridRow: "4" },
          footer: { gridColumn: "1 / -1", gridRow: "4" },
        },
      };
    case "image_focus":
      return {
        gridTemplateColumns: "0.92fr 1.08fr",
        gridTemplateRows: "auto auto 1fr auto",
        slotStyles: {
          header: { gridColumn: "1", gridRow: "1" },
          subheader: { gridColumn: "1", gridRow: "2" },
          body: { gridColumn: "1", gridRow: "3" },
          supporting: { gridColumn: "1", gridRow: "4" },
          media: { gridColumn: "2", gridRow: "1 / 5" },
          aside: { gridColumn: "1", gridRow: "4" },
          footer: { gridColumn: "1 / -1", gridRow: "4" },
        },
      };
    case "callout_grid":
      return {
        gridTemplateColumns: "1.15fr 0.85fr",
        gridTemplateRows: "auto auto 1fr auto",
        slotStyles: {
          header: { gridColumn: "1 / -1", gridRow: "1" },
          subheader: { gridColumn: "1 / -1", gridRow: "2" },
          body: { gridColumn: "1", gridRow: "3" },
          supporting: { gridColumn: "2", gridRow: "3" },
          media: { gridColumn: "2", gridRow: "3" },
          aside: { gridColumn: "2", gridRow: "4" },
          footer: { gridColumn: "1 / -1", gridRow: "4" },
        },
      };
    case "quote":
      return {
        gridTemplateColumns: "1fr",
        gridTemplateRows: "auto auto 1fr auto",
        slotStyles: {
          header: { gridColumn: "1", gridRow: "1" },
          subheader: { gridColumn: "1", gridRow: "2" },
          body: { gridColumn: "1", gridRow: "3" },
          supporting: { gridColumn: "1", gridRow: "4" },
          media: { display: "none" },
          aside: { gridColumn: "1", gridRow: "4" },
          footer: { gridColumn: "1", gridRow: "4" },
        },
      };
    case "title_bullets":
    default:
      return {
        gridTemplateColumns: "1.18fr 0.82fr",
        gridTemplateRows: "auto auto 1fr auto",
        slotStyles: {
          header: { gridColumn: "1 / -1", gridRow: "1" },
          subheader: { gridColumn: "1 / -1", gridRow: "2" },
          body: { gridColumn: "1", gridRow: "3" },
          supporting: { gridColumn: "2", gridRow: "3" },
          media: { gridColumn: "2", gridRow: "3" },
          aside: { gridColumn: "2", gridRow: "4" },
          footer: { gridColumn: "1 / -1", gridRow: "4" },
        },
      };
  }
}

function toBulletText(items: string[]): string {
  return items.join("\n");
}

export function PresentationSlideRenderer({
  slide,
  themeId,
  assets,
  selectedBlockId,
  readOnly = false,
  compact = false,
  isUploading = false,
  onSelectBlock,
  onTextChange,
  onBulletsChange,
  onCalloutChange,
  onImageMetaChange,
  onIconTextChange,
  onImageUpload,
}: PresentationSlideRendererProps) {
  const theme = getPresentationTheme(themeId);
  const assetMap = buildPresentationAssetMap(assets);
  const layoutStyles = getLayoutStyles(slide.layout);

  return (
    <div
      style={{
        ...theme.canvasStyle,
        width: "100%",
        aspectRatio: "16 / 9",
        padding: compact ? "4.5%" : "5.2%",
        display: "grid",
        gap: compact ? 14 : 22,
        gridTemplateColumns: layoutStyles.gridTemplateColumns,
        gridTemplateRows: layoutStyles.gridTemplateRows,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(125deg, rgba(255,255,255,0.04), transparent 38%, rgba(255,255,255,0.02) 100%)",
        }}
      />

      {slotOrder.map((slot) => {
        const blocks = slide.blocks.filter((block) => block.slot === slot);
        const slotStyle = layoutStyles.slotStyles[slot];
        if (!slotStyle || blocks.length === 0) {
          return null;
        }

        return (
          <div
            key={slot}
            style={{
              ...slotStyle,
              display: "flex",
              flexDirection: "column",
              gap: compact ? 12 : 16,
              minWidth: 0,
              minHeight: 0,
            }}
          >
            {blocks.map((block) => {
              const isSelected = selectedBlockId === block.id;
              return (
                <BlockRenderer
                  key={block.id}
                  block={block}
                  themeId={themeId}
                  assetMap={assetMap}
                  compact={compact}
                  readOnly={readOnly}
                  isSelected={isSelected}
                  isUploading={isUploading}
                  onSelectBlock={onSelectBlock}
                  onTextChange={onTextChange}
                  onBulletsChange={onBulletsChange}
                  onCalloutChange={onCalloutChange}
                  onImageMetaChange={onImageMetaChange}
                  onIconTextChange={onIconTextChange}
                  onImageUpload={onImageUpload}
                />
              );
            })}
          </div>
        );
      })}

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 24,
          borderRadius: compact ? 22 : 28,
          border: `1px solid ${theme.dividerColor}`,
          opacity: compact ? 0.25 : 0.18,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

function BlockRenderer({
  block,
  themeId,
  assetMap,
  readOnly,
  compact,
  isSelected,
  isUploading,
  onSelectBlock,
  onTextChange,
  onBulletsChange,
  onCalloutChange,
  onImageMetaChange,
  onIconTextChange,
  onImageUpload,
}: {
  block: PresentationBlock;
  themeId: PresentationThemeId;
  assetMap: Map<string, PresentationAsset>;
  readOnly: boolean;
  compact: boolean;
  isSelected: boolean;
  isUploading: boolean;
  onSelectBlock?: (blockId: string) => void;
  onTextChange?: (blockId: string, value: string) => void;
  onBulletsChange?: (blockId: string, items: string[]) => void;
  onCalloutChange?: (
    blockId: string,
    nextValue: Partial<PresentationCalloutBlock>,
  ) => void;
  onImageMetaChange?: (
    blockId: string,
    nextValue: Partial<PresentationImageBlock>,
  ) => void;
  onIconTextChange?: (blockId: string, value: string) => void;
  onImageUpload?: (block: PresentationImageBlock, file: File) => void;
}) {
  const theme = getPresentationTheme(themeId);
  const blockChrome =
    !readOnly && isSelected
      ? {
          outline: "2px solid rgba(103, 83, 255, 0.92)",
          outlineOffset: 2,
          boxShadow: "0 0 0 4px rgba(103, 83, 255, 0.18)",
        }
      : undefined;

  const handleSelect = () => {
    onSelectBlock?.(block.id);
  };

  if (block.type === "title" || block.type === "subtitle" || block.type === "paragraph") {
    const textStyle =
      block.type === "title"
        ? theme.titleStyle
        : block.type === "subtitle"
          ? theme.subtitleStyle
          : theme.bodyStyle;

    return (
      <div
        role={readOnly ? undefined : "button"}
        tabIndex={readOnly ? -1 : 0}
        onClick={handleSelect}
        onKeyDown={(event) => {
          if (!readOnly && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            handleSelect();
          }
        }}
        style={{ ...blockChrome, borderRadius: 18, cursor: readOnly ? "default" : "text" }}
      >
        {!readOnly && isSelected ? (
          <textarea
            value={block.content}
            rows={Math.max(2, block.content.split("\n").length)}
            onChange={(event) => onTextChange?.(block.id, event.target.value)}
            style={{
              ...textStyle,
              width: "100%",
              resize: "none",
              background: "transparent",
              border: "none",
              outline: "none",
              padding: 0,
            }}
          />
        ) : (
          <div style={{ ...textStyle, whiteSpace: "pre-wrap" }}>{block.content}</div>
        )}
      </div>
    );
  }

  if (block.type === "bullets") {
    return (
      <div
        role={readOnly ? undefined : "button"}
        tabIndex={readOnly ? -1 : 0}
        onClick={handleSelect}
        style={{ ...blockChrome, borderRadius: 20, cursor: readOnly ? "default" : "text" }}
      >
        {!readOnly && isSelected ? (
          <textarea
            value={toBulletText(block.items)}
            rows={Math.max(4, block.items.length + 1)}
            onChange={(event) =>
              onBulletsChange?.(
                block.id,
                event.target.value
                  .split("\n")
                  .map((item) => item.trim())
                  .filter(Boolean),
              )
            }
            style={{
              ...theme.bodyStyle,
              width: "100%",
              resize: "none",
              background: "transparent",
              border: "none",
              outline: "none",
              padding: 0,
            }}
          />
        ) : (
          <ul
            style={{
              ...theme.bodyStyle,
              margin: 0,
              paddingLeft: compact ? "1.1rem" : "1.3rem",
              display: "grid",
              gap: compact ? 6 : 10,
            }}
          >
            {block.items.map((item, index) => (
              <li key={`${block.id}-${index}`}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (block.type === "callout") {
    return (
      <div
        onClick={handleSelect}
        style={{
          ...theme.chromeStyle,
          ...theme.calloutStyles[block.tone],
          ...blockChrome,
          padding: compact ? "0.85rem 1rem" : "1rem 1.15rem",
          display: "grid",
          gap: compact ? 8 : 10,
          cursor: readOnly ? "default" : "text",
        }}
      >
        {!readOnly && isSelected ? (
          <>
            <input
              value={block.title}
              onChange={(event) =>
                onCalloutChange?.(block.id, { title: event.target.value })
              }
              style={{
                ...theme.secondaryStyle,
                fontWeight: 700,
                background: "transparent",
                border: "none",
                outline: "none",
                padding: 0,
              }}
            />
            <textarea
              value={block.content}
              rows={Math.max(3, block.content.split("\n").length)}
              onChange={(event) =>
                onCalloutChange?.(block.id, { content: event.target.value })
              }
              style={{
                ...theme.bodyStyle,
                background: "transparent",
                border: "none",
                outline: "none",
                resize: "none",
                padding: 0,
              }}
            />
          </>
        ) : (
          <>
            {block.title ? (
              <div style={{ ...theme.secondaryStyle, fontWeight: 700 }}>
                {block.title}
              </div>
            ) : null}
            <div style={theme.bodyStyle}>{block.content}</div>
          </>
        )}
      </div>
    );
  }

  if (block.type === "icon") {
    const Icon = presentationIconMap[block.name];
    return (
      <div
        onClick={handleSelect}
        style={{
          ...theme.chromeStyle,
          ...blockChrome,
          padding: compact ? "0.9rem" : "1rem 1.1rem",
          display: "flex",
          alignItems: "center",
          gap: compact ? 10 : 12,
          cursor: readOnly ? "default" : "pointer",
        }}
      >
        <div
          style={{
            width: compact ? 36 : 44,
            height: compact ? 36 : 44,
            borderRadius: 16,
            background: "rgba(103, 83, 255, 0.14)",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={compact ? 18 : 22} />
        </div>
        {!readOnly && isSelected ? (
          <input
            value={block.content}
            onChange={(event) => onIconTextChange?.(block.id, event.target.value)}
            style={{
              ...theme.secondaryStyle,
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
            }}
          />
        ) : (
          <div style={theme.secondaryStyle}>{block.content}</div>
        )}
      </div>
    );
  }

  if (block.type === "image") {
    const asset = block.assetId ? assetMap.get(block.assetId) : null;

    return (
      <div
        onClick={handleSelect}
        style={{
          ...theme.imageFrameStyle,
          ...blockChrome,
          display: "grid",
          minHeight: compact ? 180 : 220,
          cursor: readOnly ? "default" : "pointer",
        }}
      >
        {asset?.url ? (
          // eslint-disable-next-line @next/next/no-img-element -- Signed R2 assets must render as-is in the editor and PDF export pipeline.
          <img
            src={asset.url}
            alt={asset.altText || block.alt}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              ...theme.placeholderStyle,
              display: "grid",
              placeItems: "center",
              textAlign: "center",
              padding: compact ? "1rem" : "1.35rem",
              gap: 10,
            }}
          >
            <div style={theme.secondaryStyle}>{block.alt || "Adicionar imagem"}</div>
            <div style={{ ...theme.bodyStyle, opacity: 0.82 }}>
              {block.caption || block.imagePrompt || "Sem imagem neste slide."}
            </div>
          </div>
        )}

        {!readOnly && isSelected ? (
          <div
            style={{
              padding: compact ? "0.85rem" : "1rem",
              display: "grid",
              gap: 8,
              background: "rgba(255,255,255,0.75)",
            }}
          >
            <label
              style={{
                ...theme.chromeStyle,
                padding: "0.7rem 0.9rem",
                textAlign: "center",
                cursor: isUploading ? "wait" : "pointer",
                fontWeight: 600,
              }}
            >
              {isUploading ? "A carregar imagem..." : asset ? "Substituir imagem" : "Carregar imagem"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                disabled={isUploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    onImageUpload?.(block, file);
                  }
                  event.currentTarget.value = "";
                }}
                style={{ display: "none" }}
              />
            </label>

            <input
              value={block.alt}
              placeholder="Texto alternativo"
              onChange={(event) =>
                onImageMetaChange?.(block.id, { alt: event.target.value })
              }
              style={{
                ...theme.secondaryStyle,
                background: "transparent",
                border: "none",
                outline: "none",
              }}
            />
            <textarea
              value={block.caption}
              rows={2}
              placeholder="Legenda ou contexto"
              onChange={(event) =>
                onImageMetaChange?.(block.id, { caption: event.target.value })
              }
              style={{
                ...theme.bodyStyle,
                resize: "none",
                background: "transparent",
                border: "none",
                outline: "none",
              }}
            />
          </div>
        ) : null}
      </div>
    );
  }

  return null;
}
