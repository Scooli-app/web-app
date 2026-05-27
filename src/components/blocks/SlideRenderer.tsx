/**
 * SlideRenderer — dispatches a {@link SlideBlock} to the React layout component
 * matching {@code slide.layout}. The 7 layouts are the v1 fixed set per the
 * Confluence JSON Schema Design page.
 *
 * Used in 4 places:
 *   - Editor preview pane
 *   - Reveal.js present route
 *   - Read-only share view
 *   - Dashboard card thumbnails (scaled down)
 *
 * The slides render at a fixed 16:9 aspect ratio inside whatever container
 * they're placed in. Caller controls the outer dimensions; the slide adapts.
 */
"use client";

import type { SlideBlock, SlideLayout } from "@/shared/types/blocks";
import { cn } from "@/shared/utils/utils";
import { BlockRenderer, SlideImageRenderer } from "./BlockRenderer";
import { InlineText } from "./inline-text";

/* --------------------------------------------------------------------------
 * Outer frame — 16:9, theme-tokened, full-bleed inside its container.
 * -------------------------------------------------------------------------- */

function SlideFrame({
  children,
  className,
  pad = true,
}: {
  children: React.ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
      <div
        className={cn(
          "absolute inset-0",
          pad && "p-[4%]",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Per-layout components — all consume the same SlideBlock prop.
 * -------------------------------------------------------------------------- */

/** Title slide — large title + optional subtitle, centered. */
function TitleLayout({ slide }: { slide: SlideBlock }) {
  return (
    <SlideFrame className="flex flex-col items-center justify-center text-center gap-4">
      <h1 className="text-[4cqw] font-bold leading-tight text-foreground">
        <InlineText value={slide.title} />
      </h1>
      {slide.subtitle ? (
        <p className="text-[2.2cqw] text-muted-foreground">
          <InlineText value={slide.subtitle} />
        </p>
      ) : null}
    </SlideFrame>
  );
}

/** Title + body content, the workhorse layout. */
function TitleContentLayout({ slide }: { slide: SlideBlock }) {
  return (
    <SlideFrame className="flex flex-col gap-[3%]">
      <h2 className="text-[3cqw] font-semibold text-foreground">
        <InlineText value={slide.title} />
      </h2>
      <div className="flex flex-1 flex-col gap-3 overflow-hidden text-[1.7cqw]">
        {(slide.content ?? []).map((block) => (
          <BlockRenderer key={block.id} block={block} />
        ))}
      </div>
    </SlideFrame>
  );
}

/** Image on left, content on right. */
function ImageLeftLayout({ slide }: { slide: SlideBlock }) {
  return (
    <SlideFrame className="flex flex-col gap-[3%]">
      <h2 className="text-[3cqw] font-semibold text-foreground">
        <InlineText value={slide.title} />
      </h2>
      <div className="grid flex-1 grid-cols-[42%_minmax(0,1fr)] gap-[3%] overflow-hidden">
        <div className="overflow-hidden">
          {slide.image ? <SlideImageRenderer image={slide.image} /> : null}
        </div>
        <div className="flex flex-col gap-3 overflow-hidden text-[1.6cqw]">
          {(slide.content ?? []).map((block) => (
            <BlockRenderer key={block.id} block={block} />
          ))}
        </div>
      </div>
    </SlideFrame>
  );
}

/** Content on left, image on right. */
function ImageRightLayout({ slide }: { slide: SlideBlock }) {
  return (
    <SlideFrame className="flex flex-col gap-[3%]">
      <h2 className="text-[3cqw] font-semibold text-foreground">
        <InlineText value={slide.title} />
      </h2>
      <div className="grid flex-1 grid-cols-[minmax(0,1fr)_42%] gap-[3%] overflow-hidden">
        <div className="flex flex-col gap-3 overflow-hidden text-[1.6cqw]">
          {(slide.content ?? []).map((block) => (
            <BlockRenderer key={block.id} block={block} />
          ))}
        </div>
        <div className="overflow-hidden">
          {slide.image ? <SlideImageRenderer image={slide.image} /> : null}
        </div>
      </div>
    </SlideFrame>
  );
}

/**
 * Two columns of content. The schema doesn't model an explicit column
 * delimiter for v1 — we split slide.content roughly in half (paragraph and
 * heading boundaries respected).
 */
function TwoColumnLayout({ slide }: { slide: SlideBlock }) {
  const content = slide.content ?? [];
  const mid = Math.ceil(content.length / 2);
  const left = content.slice(0, mid);
  const right = content.slice(mid);
  return (
    <SlideFrame className="flex flex-col gap-[3%]">
      <h2 className="text-[3cqw] font-semibold text-foreground">
        <InlineText value={slide.title} />
      </h2>
      <div className="grid flex-1 grid-cols-2 gap-[4%] overflow-hidden text-[1.5cqw]">
        <div className="flex flex-col gap-3 overflow-hidden">
          {left.map((block) => (
            <BlockRenderer key={block.id} block={block} />
          ))}
        </div>
        <div className="flex flex-col gap-3 overflow-hidden">
          {right.map((block) => (
            <BlockRenderer key={block.id} block={block} />
          ))}
        </div>
      </div>
    </SlideFrame>
  );
}

/** Full-bleed image with title overlay at the bottom. */
function FullImageLayout({ slide }: { slide: SlideBlock }) {
  return (
    <SlideFrame pad={false}>
      <div className="relative h-full w-full">
        {slide.image ? (
          <div className="absolute inset-0 [&_figure]:h-full [&_img]:h-full [&_img]:w-full [&_img]:max-h-full [&_img]:max-w-full [&_img]:rounded-none [&_img]:object-cover">
            <SlideImageRenderer image={slide.image} />
          </div>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-[4%] text-white">
          <h2 className="text-[3.5cqw] font-bold drop-shadow-md">
            <InlineText value={slide.title} />
          </h2>
          {slide.subtitle ? (
            <p className="mt-2 text-[2cqw] opacity-90">
              <InlineText value={slide.subtitle} />
            </p>
          ) : null}
        </div>
      </div>
    </SlideFrame>
  );
}

/**
 * Closing slide — visually distinct (subtle accent background) so the audience
 * knows the deck is wrapping up.
 */
function ConclusionLayout({ slide }: { slide: SlideBlock }) {
  return (
    <SlideFrame className="flex flex-col gap-[3%] bg-accent/30">
      <div className="flex items-baseline gap-3">
        <span className="text-[1.4cqw] uppercase tracking-widest text-primary">
          Conclusão
        </span>
      </div>
      <h2 className="text-[3.5cqw] font-bold text-foreground">
        <InlineText value={slide.title} />
      </h2>
      <div className="flex flex-1 flex-col gap-3 overflow-hidden text-[1.7cqw]">
        {(slide.content ?? []).map((block) => (
          <BlockRenderer key={block.id} block={block} />
        ))}
      </div>
    </SlideFrame>
  );
}

/* --------------------------------------------------------------------------
 * Dispatch + registry
 * -------------------------------------------------------------------------- */

const LAYOUT_COMPONENTS: Record<SlideLayout, (props: { slide: SlideBlock }) => React.ReactElement> = {
  title: TitleLayout,
  "title-content": TitleContentLayout,
  "image-left": ImageLeftLayout,
  "image-right": ImageRightLayout,
  "two-column": TwoColumnLayout,
  "full-image": FullImageLayout,
  conclusion: ConclusionLayout,
};

export function SlideRenderer({ slide }: { slide: SlideBlock }) {
  const Component = LAYOUT_COMPONENTS[slide.layout] ?? TitleContentLayout;
  // `container-type: inline-size` so the `cqw` (container-query-width) units in
  // the layouts scale text relative to the slide width, not the viewport.
  return (
    <div className="@container w-full" style={{ containerType: "inline-size" }}>
      <Component slide={slide} />
    </div>
  );
}
