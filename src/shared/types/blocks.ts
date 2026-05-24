/**
 * Block document schema (v1) — frontend mirror of
 * `services/src/main/resources/schemas/blocks/presentation.schema.json`.
 *
 * Hand-maintained in lockstep with the backend JSON Schema. If you change one,
 * change the other in the same PR. CI parity test (TODO) will load the same
 * worked example through both and fail on drift.
 *
 * See: https://scooli.atlassian.net/wiki/spaces/Scooli/pages/9404459
 */

import { z } from "zod";

/* --------------------------------------------------------------------------
 * Constants
 * -------------------------------------------------------------------------- */

export const SCHEMA_VERSION = 1;

/**
 * Allowed slide layouts. Order matches the schema enum.
 */
export const SLIDE_LAYOUTS = [
  "title",
  "title-content",
  "image-left",
  "image-right",
  "two-column",
  "full-image",
  "conclusion",
] as const;

export type SlideLayout = (typeof SLIDE_LAYOUTS)[number];

/**
 * Layouts that REQUIRE an image field on the slide (enforced at semantic
 * validation, not in JSON Schema — easier to surface a clear error).
 */
export const LAYOUTS_REQUIRING_IMAGE: ReadonlySet<SlideLayout> = new Set([
  "image-left",
  "image-right",
  "full-image",
]);

/**
 * Reserved block-type names. Do not implement locally — these slots are claimed
 * for future doc-type migrations (Worksheets etc.).
 */
export const RESERVED_BLOCK_TYPES = [
  "quiz_question",
  "fill_blank",
  "math_problem",
  "drag_match",
  "code_block",
  "table",
  "callout",
] as const;

/* --------------------------------------------------------------------------
 * Primitives
 * -------------------------------------------------------------------------- */

/**
 * Short sequential id. Pattern matches `s1`, `s2-b1`, etc.
 * Starts with a letter; 1-32 chars; alphanumeric + `_` and `-`.
 */
export const blockIdSchema = z
  .string()
  .regex(
    /^[a-zA-Z][a-zA-Z0-9_-]{0,31}$/,
    "block id must start with a letter and contain only [a-zA-Z0-9_-] (max 32 chars)",
  );

/**
 * Limited-Markdown inline text. Allowed: **bold**, *italic*, `code`,
 * [link](url), $math$. No block-level markdown.
 *
 * The Zod schema can't easily enforce the markdown restriction; that's a
 * documentation contract honored by the AI prompt + render-time parser.
 */
export const inlineTextSchema = z.string().max(1000);

/* --------------------------------------------------------------------------
 * Content blocks (nest inside slides; will be top-level for other doc types)
 * -------------------------------------------------------------------------- */

export const paragraphBlockSchema = z.object({
  id: blockIdSchema,
  type: z.literal("paragraph"),
  text: inlineTextSchema,
});
export type ParagraphBlock = z.infer<typeof paragraphBlockSchema>;

export const headingBlockSchema = z.object({
  id: blockIdSchema,
  type: z.literal("heading"),
  level: z.number().int().min(2).max(4),
  text: inlineTextSchema,
});
export type HeadingBlock = z.infer<typeof headingBlockSchema>;

export const bulletListBlockSchema = z.object({
  id: blockIdSchema,
  type: z.literal("bullet_list"),
  items: z.array(inlineTextSchema).min(1).max(6),
});
export type BulletListBlock = z.infer<typeof bulletListBlockSchema>;

export const orderedListBlockSchema = z.object({
  id: blockIdSchema,
  type: z.literal("ordered_list"),
  items: z.array(inlineTextSchema).min(1).max(6),
});
export type OrderedListBlock = z.infer<typeof orderedListBlockSchema>;

export const mathBlockSchema = z.object({
  id: blockIdSchema,
  type: z.literal("math"),
  tex: z.string().max(500),
  display: z.boolean().optional(),
});
export type MathBlock = z.infer<typeof mathBlockSchema>;

/* --------------------------------------------------------------------------
 * Image blocks
 * -------------------------------------------------------------------------- */

export const imageBlockSchema = z.object({
  id: blockIdSchema,
  type: z.literal("image"),
  url: z.string().url(),
  alt: z.string().max(500),
  caption: z.string().max(500).optional(),
});
export type ImageBlock = z.infer<typeof imageBlockSchema>;

export const visualPlaceholderBlockSchema = z.object({
  id: blockIdSchema,
  type: z.literal("visual_placeholder"),
  prompt: z.string().min(10).max(500),
});
export type VisualPlaceholderBlock = z.infer<
  typeof visualPlaceholderBlockSchema
>;

/* --------------------------------------------------------------------------
 * Slide container
 * -------------------------------------------------------------------------- */

export const contentBlockSchema = z.discriminatedUnion("type", [
  paragraphBlockSchema,
  headingBlockSchema,
  bulletListBlockSchema,
  orderedListBlockSchema,
  mathBlockSchema,
]);
export type ContentBlock = z.infer<typeof contentBlockSchema>;

export const slideImageSchema = z.discriminatedUnion("type", [
  imageBlockSchema,
  visualPlaceholderBlockSchema,
]);
export type SlideImage = z.infer<typeof slideImageSchema>;

export const slideBlockSchema = z.object({
  id: blockIdSchema,
  type: z.literal("slide"),
  layout: z.enum(SLIDE_LAYOUTS),
  title: inlineTextSchema,
  subtitle: inlineTextSchema.optional(),
  content: z.array(contentBlockSchema).max(12).optional(),
  image: slideImageSchema.optional(),
  notes: z.string().max(2000).optional(),
});
export type SlideBlock = z.infer<typeof slideBlockSchema>;

/* --------------------------------------------------------------------------
 * Document envelope
 * -------------------------------------------------------------------------- */

export const presentationDocumentSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  documentType: z.literal("presentation"),
  blocks: z.array(slideBlockSchema).min(3).max(20),
});
export type PresentationDocument = z.infer<typeof presentationDocumentSchema>;

/**
 * Union of all known block types — useful for generic renderers that walk
 * the document tree.
 */
export type AnyBlock = SlideBlock | ContentBlock | ImageBlock | VisualPlaceholderBlock;

/* --------------------------------------------------------------------------
 * Helpers
 * -------------------------------------------------------------------------- */

/**
 * Parse and validate a raw JSON string into a typed PresentationDocument.
 * Throws ZodError on validation failure.
 */
export function parsePresentationDocument(raw: string): PresentationDocument {
  const parsed = JSON.parse(raw);
  return presentationDocumentSchema.parse(parsed);
}

/**
 * Safe variant that returns a result instead of throwing.
 */
export function safeParsePresentationDocument(raw: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return {
      success: false as const,
      error: `Invalid JSON: ${(err as Error).message}`,
    };
  }
  const result = presentationDocumentSchema.safeParse(parsed);
  if (!result.success) {
    return { success: false as const, error: result.error.message };
  }
  return { success: true as const, data: result.data };
}

/**
 * Check whether a slide's layout requires the `image` field to be present.
 * Used by the semantic validator and the editor UI.
 */
export function layoutRequiresImage(layout: SlideLayout): boolean {
  return LAYOUTS_REQUIRING_IMAGE.has(layout);
}
