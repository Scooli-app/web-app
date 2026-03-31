export type PresentationThemeId =
  | "scooli-dark"
  | "clean-light"
  | "educational-soft";

export type PresentationLayout =
  | "cover"
  | "title_bullets"
  | "two_column"
  | "image_focus"
  | "callout_grid"
  | "quote";

export type PresentationBlockSlot =
  | "header"
  | "subheader"
  | "body"
  | "supporting"
  | "media"
  | "aside"
  | "footer";

export type PresentationIconName =
  | "sparkles"
  | "book-open"
  | "graduation-cap"
  | "lightbulb"
  | "target"
  | "globe"
  | "users"
  | "chart-column"
  | "brain"
  | "shield-check"
  | "clock-3"
  | "quote";

export type PresentationCalloutTone =
  | "neutral"
  | "info"
  | "success"
  | "warning";

export interface PresentationBlockBase {
  id: string;
  type:
    | "title"
    | "subtitle"
    | "paragraph"
    | "bullets"
    | "image"
    | "icon"
    | "callout";
  slot: PresentationBlockSlot;
}

export interface PresentationTextBlock extends PresentationBlockBase {
  type: "title" | "subtitle" | "paragraph";
  content: string;
}

export interface PresentationBulletsBlock extends PresentationBlockBase {
  type: "bullets";
  items: string[];
}

export interface PresentationImageBlock extends PresentationBlockBase {
  type: "image";
  assetId: string | null;
  alt: string;
  caption: string;
  imagePrompt: string;
}

export interface PresentationIconBlock extends PresentationBlockBase {
  type: "icon";
  name: PresentationIconName;
  content: string;
}

export interface PresentationCalloutBlock extends PresentationBlockBase {
  type: "callout";
  title: string;
  content: string;
  tone: PresentationCalloutTone;
}

export type PresentationBlock =
  | PresentationTextBlock
  | PresentationBulletsBlock
  | PresentationImageBlock
  | PresentationIconBlock
  | PresentationCalloutBlock;

export interface PresentationSlide {
  id: string;
  layout: PresentationLayout;
  blocks: PresentationBlock[];
}

export interface PresentationContent {
  version: number;
  title: string;
  themeId: PresentationThemeId;
  slides: PresentationSlide[];
}

export interface PresentationAsset {
  id: string;
  altText: string;
  contentType: string;
  sourceType: string;
  url: string;
  createdAt: string | null;
}

export interface PresentationSummary {
  id: string;
  title: string;
  themeId: PresentationThemeId;
  subject: string;
  gradeLevel: string | null;
  status: string;
  updatedAt: string | null;
}

export interface PresentationRecord {
  id: string;
  title: string;
  themeId: PresentationThemeId;
  subject: string;
  gradeLevel: string | null;
  prompt: string;
  additionalInstructions: string | null;
  status: string;
  content: PresentationContent;
  assets: PresentationAsset[];
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreatePresentationParams {
  title?: string;
  prompt: string;
  subject: string;
  schoolYear: number;
  themeId?: PresentationThemeId;
  additionalInstructions?: string;
}

export interface UpdatePresentationParams {
  title?: string;
  themeId?: PresentationThemeId;
  content: PresentationContent;
}

export interface PresentationExportPayload {
  id: string;
  title: string;
  themeId: PresentationThemeId;
  content: PresentationContent;
  assets: PresentationAsset[];
}
