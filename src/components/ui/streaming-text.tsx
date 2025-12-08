import { cn } from "@/shared/utils/utils";
import type { ComponentPropsWithoutRef, ElementType } from "react";

export interface StreamingTextProps<T extends ElementType = "span"> {
  text: string;
  isStreaming?: boolean;
  className?: string;
  cursorClassName?: string;
  as?: T;
  emptyText?: string;
}

type StreamingTextComponentProps<T extends ElementType> = StreamingTextProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof StreamingTextProps<T>>;

/**
 * Generic streaming text component that displays text with an animated cursor
 * when streaming is active. Can be used inline or as a block element.
 * 
 * @example
 * // Inline usage for titles
 * <StreamingText 
 *   text={title} 
 *   isStreaming={isStreaming}
 *   as="h1"
 *   className="text-3xl font-bold"
 *   onClick={handleClick}
 * />
 * 
 * @example
 * // Block usage for content
 * <StreamingText 
 *   text={content} 
 *   isStreaming={isStreaming}
 *   className="prose max-w-none whitespace-pre-wrap"
 * />
 */
export function StreamingText<T extends ElementType = "span">({
  text,
  isStreaming = false,
  className = "",
  cursorClassName = "",
  as,
  emptyText,
  ...props
}: StreamingTextComponentProps<T>) {
  const Component = (as || "span") as ElementType;
  const displayText = text || emptyText || "";
  const showCursor = isStreaming && displayText.length > 0;

  // Default cursor styles based on component type
  const componentType = typeof Component === "string" ? Component : "span";
  const defaultCursorClass = componentType.startsWith("h")
    ? "inline-block w-2 h-8 bg-[#6753FF] ml-1 align-middle animate-pulse"
    : "inline-block w-2 h-5 bg-[#6753FF] ml-0.5 animate-pulse align-middle";

  const finalCursorClass = cursorClassName || defaultCursorClass;

  return (
    <Component className={cn(className)} {...props}>
      {displayText}
      {showCursor && <span className={cn(finalCursorClass)} />}
    </Component>
  );
}
