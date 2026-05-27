/**
 * BlockRenderer — dispatches a single content block to the correct React
 * component. Used inside slide layouts to render nested content arrays.
 *
 * Generic across doc types: when worksheets / tests migrate to JSON they'll add
 * new block types (quiz_question, fill_blank, etc.) — they just need to be
 * registered here.
 */
"use client";

import katex from "katex";
import "katex/dist/katex.min.css";
import { Loader2 } from "lucide-react";
import type {
  ContentBlock,
  ImageBlock,
  SlideImage,
} from "@/shared/types/blocks";
import { InlineText } from "./inline-text";

export function BlockRenderer({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "paragraph":
      return (
        <p className="text-foreground leading-relaxed">
          <InlineText value={block.text} />
        </p>
      );

    case "heading": {
      const Tag = (`h${block.level}` as const) as
        | "h2"
        | "h3"
        | "h4";
      const sizeClass =
        block.level === 2
          ? "text-2xl font-semibold"
          : block.level === 3
            ? "text-xl font-semibold"
            : "text-lg font-medium";
      return (
        <Tag className={`${sizeClass} text-foreground`}>
          <InlineText value={block.text} />
        </Tag>
      );
    }

    case "bullet_list":
      return (
        <ul className="list-disc space-y-2 pl-6 marker:text-primary">
          {block.items.map((item, i) => (
            <li key={i} className="text-foreground leading-relaxed">
              <InlineText value={item} />
            </li>
          ))}
        </ul>
      );

    case "ordered_list":
      return (
        <ol className="list-decimal space-y-2 pl-6 marker:text-primary marker:font-semibold">
          {block.items.map((item, i) => (
            <li key={i} className="text-foreground leading-relaxed">
              <InlineText value={item} />
            </li>
          ))}
        </ol>
      );

    case "math": {
      let html: string;
      try {
        html = katex.renderToString(block.tex, {
          throwOnError: false,
          displayMode: block.display ?? true,
        });
      } catch {
        return (
          <code className="text-destructive">{block.tex}</code>
        );
      }
      return (
        <div
          className="my-2 overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }
  }
}

/**
 * Render a slide.image which can be an already-resolved {@link ImageBlock} or
 * a {@link VisualPlaceholderBlock} still waiting on the image pipeline.
 */
export function SlideImageRenderer({ image }: { image: SlideImage }) {
  if (image.type === "visual_placeholder") {
    return <PlaceholderImage prompt={image.prompt} />;
  }
  return <ResolvedImage image={image} />;
}

function PlaceholderImage({ prompt }: { prompt: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-muted/40 p-6 text-center text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-xs italic line-clamp-3">{prompt}</p>
      <span className="text-[10px] uppercase tracking-wide">
        Imagem em geração
      </span>
    </div>
  );
}

function ResolvedImage({ image }: { image: ImageBlock }) {
  return (
    <figure className="flex h-full w-full flex-col items-center justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.url}
        alt={image.alt}
        className="max-h-full max-w-full rounded-lg object-contain"
        loading="lazy"
      />
      {image.caption ? (
        <figcaption className="mt-2 text-xs text-muted-foreground">
          {image.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
