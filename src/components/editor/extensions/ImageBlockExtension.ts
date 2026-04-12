import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import ImageBlockNodeView from "./ImageBlockNodeView";

interface ImageBlockOptions {
  HTMLAttributes: Record<string, unknown>;
}

const WIDTH_TITLE_PREFIX = "scooli-width:";
const MIN_IMAGE_WIDTH_PERCENT = 30;
const MAX_IMAGE_WIDTH_PERCENT = 100;
const DEFAULT_IMAGE_WIDTH_PERCENT = 100;

function clampImageWidth(rawValue: unknown): number {
  const numeric =
    typeof rawValue === "number"
      ? rawValue
      : Number.parseInt(String(rawValue ?? DEFAULT_IMAGE_WIDTH_PERCENT), 10);
  if (!Number.isFinite(numeric)) {
    return DEFAULT_IMAGE_WIDTH_PERCENT;
  }
  return Math.max(MIN_IMAGE_WIDTH_PERCENT, Math.min(MAX_IMAGE_WIDTH_PERCENT, Math.round(numeric)));
}

function parseWidthFromTitle(title: string | null | undefined): number | null {
  if (!title) {
    return null;
  }
  const match = title.match(/scooli-width:(\d{1,3})/i);
  if (!match) {
    return null;
  }
  const value = Number.parseInt(match[1], 10);
  if (!Number.isFinite(value)) {
    return null;
  }
  return clampImageWidth(value);
}

function buildWidthTitleToken(width: number): string {
  return `${WIDTH_TITLE_PREFIX}${clampImageWidth(width)}`;
}

export const ImageBlockExtension = Node.create<ImageBlockOptions>({
  name: "imageBlock",
  
  // Make it act like a block element, not inline text
  group: "block",
  inline: false,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute("title"),
      },
      width: {
        default: DEFAULT_IMAGE_WIDTH_PERCENT,
        parseHTML: (element) => {
          const widthFromTitle = parseWidthFromTitle(element.getAttribute("title"));
          if (widthFromTitle !== null) {
            return widthFromTitle;
          }
          const widthAttribute = element.getAttribute("width");
          if (widthAttribute) {
            return clampImageWidth(widthAttribute);
          }
          return DEFAULT_IMAGE_WIDTH_PERCENT;
        },
      },
      // Extract documentImageId if present in the src placeholder
      imageId: {
        default: null,
        parseHTML: (element) => {
          const src = element.getAttribute("src");
          if (src && src.startsWith("{{DOCUMENT_IMAGE:")) {
            const match = src.match(/{{DOCUMENT_IMAGE:(.+?)}}/);
            return match ? match[1] : null;
          }
          return null;
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "img[src]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const normalizedWidth = clampImageWidth((HTMLAttributes as { width?: unknown }).width);
    const normalizedAttributes = {
      ...HTMLAttributes,
    } as Record<string, unknown>;
    if (normalizedWidth < MAX_IMAGE_WIDTH_PERCENT) {
      normalizedAttributes.title = buildWidthTitleToken(normalizedWidth);
    } else {
      delete normalizedAttributes.title;
    }
    delete normalizedAttributes.width;

    return ["img", mergeAttributes(this.options.HTMLAttributes, normalizedAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageBlockNodeView);
  },
});
