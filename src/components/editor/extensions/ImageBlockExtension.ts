import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import ImageBlockNodeView from "./ImageBlockNodeView";

export interface ImageBlockOptions {
  HTMLAttributes: Record<string, unknown>;
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
    return ["img", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageBlockNodeView);
  },
});
