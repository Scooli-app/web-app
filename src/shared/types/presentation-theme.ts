/**
 * Presentation themes — colour palettes for the Konva slide editor.
 *
 * Each theme defines a background colour and four text/accent colours.
 * applyTheme() in canvas-layout.ts maps these to CanvasElement colours
 * based on each element's semantic role.
 */

export interface PresentationTheme {
  id: string;
  name: string;
  /** Slide background fill */
  bg: string;
  /** Role "title" text */
  titleColor: string;
  /** Body text (paragraphs, list items) */
  bodyColor: string;
  /** Accent / label text (role "label") */
  accentColor: string;
  /** Muted / subtitle text (role "subtitle") */
  mutedColor: string;
}

export const THEMES: PresentationTheme[] = [
  {
    id: "dark",
    name: "Dark",
    bg: "#16171e",
    titleColor: "#e5e7eb",
    bodyColor: "#d1d5db",
    accentColor: "#6753FF",
    mutedColor: "#6c6f80",
  },
  {
    id: "white",
    name: "Branco",
    bg: "#ffffff",
    titleColor: "#111827",
    bodyColor: "#374151",
    accentColor: "#2563eb",
    mutedColor: "#6b7280",
  },
  {
    id: "midnight",
    name: "Midnight",
    bg: "#0f172a",
    titleColor: "#f1f5f9",
    bodyColor: "#cbd5e1",
    accentColor: "#818cf8",
    mutedColor: "#64748b",
  },
  {
    id: "ocean",
    name: "Oceano",
    bg: "#0c4a6e",
    titleColor: "#f0f9ff",
    bodyColor: "#bae6fd",
    accentColor: "#38bdf8",
    mutedColor: "#7dd3fc",
  },
  {
    id: "forest",
    name: "Floresta",
    bg: "#14532d",
    titleColor: "#f0fdf4",
    bodyColor: "#bbf7d0",
    accentColor: "#4ade80",
    mutedColor: "#86efac",
  },
  {
    id: "sky",
    name: "Céu",
    bg: "#e0f2fe",
    titleColor: "#0c4a6e",
    bodyColor: "#1e3a5f",
    accentColor: "#0284c7",
    mutedColor: "#475569",
  },
  {
    id: "warm",
    name: "Pergaminho",
    bg: "#fef3c7",
    titleColor: "#1c1917",
    bodyColor: "#292524",
    accentColor: "#b45309",
    mutedColor: "#78716c",
  },
  {
    id: "rose",
    name: "Rosa",
    bg: "#1c0a12",
    titleColor: "#fce7f3",
    bodyColor: "#fbcfe8",
    accentColor: "#f43f5e",
    mutedColor: "#9f1239",
  },
];

export function getThemeById(id: string): PresentationTheme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
