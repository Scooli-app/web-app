/**
 * Presentation themes — colour palettes, font pairings, gradient backgrounds,
 * and per-layout decorative shapes for the Konva slide editor.
 *
 * Design philosophy: professional restraint. Each theme has ONE strong visual
 * anchor on the cover (a colour panel, a partial circle, a diagonal band) and
 * almost nothing on content slides (a thin accent bar at most). This mirrors
 * the look of real Canva/PowerPoint teacher templates.
 *
 * Coordinate convention (same as CanvasBaseElement):
 *   x, y  → fractions of WIDTH and HEIGHT (may be negative to bleed off edge)
 *   w     → fraction of slide WIDTH
 *   h     → fraction of slide HEIGHT
 *   For a visually circular ellipse on 16:9: h = w × (16/9)
 *
 * Decorations are exempt from clampCanvasSlide, so they safely extend beyond [0,1].
 */

export interface ThemeGradient {
  /** CSS-convention angle: 0=up, 90=right, 135=down-right, 180=down. */
  angle: number;
  stops: Array<{ offset: number; color: string }>;
}

export interface ThemeDecoration {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
  shape: "rect" | "ellipse" | "line";
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
}

/** Per-element position override for the cover slide text layout. */
export interface CoverTextSlot {
  x: number;
  y: number;
  w: number;
  h?: number;
  align?: "left" | "center" | "right";
}

export interface PresentationTheme {
  id: string;
  name: string;
  bg: string;
  bgGradient?: ThemeGradient;
  titleColor: string;
  bodyColor: string;
  accentColor: string;
  mutedColor: string;
  titleFont: string;
  bodyFont: string;
  /**
   * Optional repositioning for cover-slide text when the theme has a side panel
   * or other structural element that conflicts with the default centred layout.
   * Applied by applyTheme() only on layout === "title" slides.
   */
  coverTextLayout?: {
    title?: CoverTextSlot;
    subtitle?: CoverTextSlot;
  };
  /** Decorations injected on the COVER slide (layout === "title"). */
  coverDecorations?: ThemeDecoration[];
  /** Subtle decorations injected on every NON-COVER slide. */
  decorations?: ThemeDecoration[];
}

/* ─────────────────────────────────────────────────────────────────────────────
 * DARK THEMES
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * NOIR — jet black + gold.
 * Cover: Wide frosted gold panel on the left third + vertical gold rule.
 * Content: Thin gold left border only.
 */
const noir: PresentationTheme = {
  id: "dark",
  name: "Noir",
  bg: "#0a0a0a",
  bgGradient: {
    angle: 160,
    stops: [
      { offset: 0, color: "#0d0b06" },
      { offset: 1, color: "#080808" },
    ],
  },
  titleColor: "#fff8e6",
  bodyColor: "#c9b97a",
  accentColor: "#d4a017",
  mutedColor: "#7a6a3a",
  titleFont: "Merriweather, Georgia, serif",
  bodyFont: "Lato, system-ui, sans-serif",
  // Title lives inside the left gold panel, left-aligned
  coverTextLayout: {
    title:    { x: 0.05, y: 0.22, w: 0.28, h: 0.26, align: "left" },
    subtitle: { x: 0.05, y: 0.56, w: 0.28, h: 0.14, align: "left" },
  },
  coverDecorations: [
    // Left gold panel
    { x: 0, y: 0, w: 0.38, h: 1, shape: "rect", fill: "rgba(212,160,23,0.08)", strokeWidth: 0 },
    // Vertical gold rule separating panel from content
    { x: 0.38, y: 0, w: 0.003, h: 1, shape: "rect", fill: "#d4a017", strokeWidth: 0 },
    // Small horizontal rule inside panel (decorative detail)
    { x: 0.04, y: 0.82, w: 0.28, h: 0.003, shape: "rect", fill: "rgba(212,160,23,0.55)", strokeWidth: 0 },
  ],
  decorations: [
    { x: 0, y: 0, w: 0.006, h: 1, shape: "rect", fill: "#d4a017", strokeWidth: 0 },
  ],
};

/**
 * AURORA — dark teal.
 * Cover: Large soft circle glowing off the top-right corner, like a light source.
 * Content: Thin teal top bar.
 */
const aurora: PresentationTheme = {
  id: "aurora",
  name: "Aurora",
  bg: "#030d0e",
  bgGradient: {
    angle: 135,
    stops: [
      { offset: 0, color: "#030d0e" },
      { offset: 0.55, color: "#0a2e24" },
      { offset: 1, color: "#07191e" },
    ],
  },
  titleColor: "#d4feef",
  bodyColor: "#6dc9ba",
  accentColor: "#00e5a0",
  mutedColor: "#1e8a76",
  titleFont: "Raleway, system-ui, sans-serif",
  bodyFont: "Lato, system-ui, sans-serif",
  coverDecorations: [
    // Large glow circle — mostly off-screen top-right, just the edge visible
    { x: 0.52, y: -0.95, w: 1.10, h: 1.10 * (16 / 9), shape: "ellipse", fill: "rgba(0,229,160,0.07)", stroke: "rgba(0,229,160,0.18)", strokeWidth: 0.0018 },
    // Inner bright core
    { x: 0.68, y: -0.72, w: 0.62, h: 0.62 * (16 / 9), shape: "ellipse", fill: "rgba(0,229,160,0.10)", stroke: "rgba(0,229,160,0.28)", strokeWidth: 0.0020 },
    // Thin accent line near bottom
    { x: 0.06, y: 0.88, w: 0.22, h: 0.004, shape: "rect", fill: "#00e5a0", strokeWidth: 0 },
  ],
  decorations: [
    { x: 0, y: 0, w: 1, h: 0.006, shape: "rect", fill: "#00e5a0", strokeWidth: 0 },
  ],
};

/**
 * NEBULA — deep indigo-black.
 * Cover: One large nebula glow off the right + 3 star dots. Restrained.
 * Content: Thin purple top bar.
 */
const nebula: PresentationTheme = {
  id: "midnight",
  name: "Nebula",
  bg: "#04000f",
  bgGradient: {
    angle: 150,
    stops: [
      { offset: 0, color: "#04000f" },
      { offset: 0.5, color: "#150035" },
      { offset: 1, color: "#04000f" },
    ],
  },
  titleColor: "#e8d5ff",
  bodyColor: "#b59de0",
  accentColor: "#9d4edd",
  mutedColor: "#5a3a7e",
  titleFont: "Raleway, system-ui, sans-serif",
  bodyFont: "Poppins, system-ui, sans-serif",
  coverDecorations: [
    // Nebula — large, mostly off top-right
    { x: 0.58, y: -0.80, w: 0.95, h: 0.95 * (16 / 9), shape: "ellipse", fill: "rgba(157,78,221,0.08)", stroke: "rgba(157,78,221,0.22)", strokeWidth: 0.002 },
    // Brighter inner core
    { x: 0.78, y: -0.48, w: 0.44, h: 0.44 * (16 / 9), shape: "ellipse", fill: "rgba(180,90,255,0.14)", stroke: "rgba(200,120,255,0.35)", strokeWidth: 0.002 },
    // Three scattered stars (kept away from the title zone at y 0.28–0.50)
    { x: 0.62, y: 0.15, w: 0.024, h: 0.024 * (16 / 9), shape: "ellipse", fill: "rgba(255,255,255,0.60)", strokeWidth: 0 },
    { x: 0.48, y: 0.14, w: 0.016, h: 0.016 * (16 / 9), shape: "ellipse", fill: "rgba(220,200,255,0.55)", strokeWidth: 0 },
    { x: 0.32, y: 0.74, w: 0.012, h: 0.012 * (16 / 9), shape: "ellipse", fill: "rgba(255,255,255,0.45)", strokeWidth: 0 },
  ],
  decorations: [
    { x: 0, y: 0, w: 1, h: 0.006, shape: "rect", fill: "#9d4edd", strokeWidth: 0 },
  ],
};

/**
 * CARMIM — dark crimson.
 * Cover: Diagonal colour block rising from bottom — bold, editorial.
 * Content: Thin red left border.
 */
const carmim: PresentationTheme = {
  id: "rose",
  name: "Carmim",
  bg: "#0c0204",
  bgGradient: {
    angle: 160,
    stops: [
      { offset: 0, color: "#0c0204" },
      { offset: 1, color: "#260510" },
    ],
  },
  titleColor: "#ffe4ec",
  bodyColor: "#ffafc4",
  accentColor: "#ff1744",
  mutedColor: "#7a1030",
  titleFont: "Montserrat, system-ui, sans-serif",
  bodyFont: "Lato, system-ui, sans-serif",
  // Title and subtitle sit in the clean upper half, above the diagonal block
  coverTextLayout: {
    title:    { x: 0.10, y: 0.20, w: 0.80, h: 0.22, align: "center" },
    subtitle: { x: 0.10, y: 0.45, w: 0.80, h: 0.10, align: "center" },
  },
  coverDecorations: [
    // Diagonal colour block — lower third, angled slightly
    { x: -0.20, y: 0.67, w: 1.40, h: 0.75, shape: "rect", fill: "rgba(255,23,68,0.11)", strokeWidth: 0, rotation: -8, cornerRadius: 0 },
    // Bright top edge of that block (diagonal rule)
    { x: -0.20, y: 0.67, w: 1.40, h: 0.012, shape: "rect", fill: "rgba(255,23,68,0.40)", strokeWidth: 0, rotation: -8, cornerRadius: 0 },
  ],
  decorations: [
    { x: 0, y: 0, w: 0.006, h: 1, shape: "rect", fill: "#ff1744", strokeWidth: 0 },
  ],
};

/* ─────────────────────────────────────────────────────────────────────────────
 * LIGHT THEMES
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * PEARL — near-white.
 * Cover: One large circle outline mostly off-screen top-right + thin rule.
 * Content: Thin dark bottom rule.
 */
const pearl: PresentationTheme = {
  id: "white",
  name: "Pearl",
  bg: "#f8f8f8",
  bgGradient: {
    angle: 160,
    stops: [
      { offset: 0, color: "#ffffff" },
      { offset: 1, color: "#eeeeee" },
    ],
  },
  titleColor: "#111111",
  bodyColor: "#333333",
  accentColor: "#111111",
  mutedColor: "#888888",
  titleFont: "Poppins, system-ui, sans-serif",
  bodyFont: "Lato, system-ui, sans-serif",
  coverDecorations: [
    // Large circle outline — mostly off-screen top-right
    { x: 0.55, y: -0.62, w: 0.85, h: 0.85 * (16 / 9), shape: "ellipse", fill: "transparent", stroke: "rgba(0,0,0,0.09)", strokeWidth: 0.004 },
    // Thinner inner ring
    { x: 0.68, y: -0.38, w: 0.52, h: 0.52 * (16 / 9), shape: "ellipse", fill: "transparent", stroke: "rgba(0,0,0,0.06)", strokeWidth: 0.003 },
    // Thin horizontal rule near bottom
    { x: 0.06, y: 0.82, w: 0.30, h: 0.003, shape: "rect", fill: "rgba(0,0,0,0.25)", strokeWidth: 0 },
  ],
  decorations: [
    { x: 0, y: 0.994, w: 1, h: 0.006, shape: "rect", fill: "rgba(0,0,0,0.12)", strokeWidth: 0 },
  ],
};

/**
 * FLORAL — blush pink.
 * Cover: Two elegant petal ellipses in the top-right corner, softly layered.
 * Content: Thin pink left border.
 */
const floral: PresentationTheme = {
  id: "pastel",
  name: "Floral",
  bg: "#fff5f7",
  bgGradient: {
    angle: 140,
    stops: [
      { offset: 0, color: "#fff5f7" },
      { offset: 1, color: "#fce4ec" },
    ],
  },
  titleColor: "#6b0020",
  bodyColor: "#880e4f",
  accentColor: "#e91e63",
  mutedColor: "#c06070",
  titleFont: "Raleway, system-ui, sans-serif",
  bodyFont: "Lato, system-ui, sans-serif",
  coverDecorations: [
    // Large soft petal — top right, bleeds off
    { x: 0.48, y: -0.30, w: 0.75, h: 0.75 * 0.28, shape: "ellipse", fill: "rgba(233,30,99,0.08)", stroke: "rgba(233,30,99,0.18)", strokeWidth: 0.002, rotation: 25 },
    // Second petal crossing at different angle
    { x: 0.55, y: -0.10, w: 0.65, h: 0.65 * 0.28, shape: "ellipse", fill: "rgba(240,98,146,0.07)", stroke: "rgba(233,30,99,0.13)", strokeWidth: 0.0015, rotation: 65 },
    // Thin accent rule near bottom
    { x: 0.06, y: 0.84, w: 0.20, h: 0.004, shape: "rect", fill: "#e91e63", strokeWidth: 0 },
  ],
  decorations: [
    { x: 0, y: 0, w: 0.006, h: 1, shape: "rect", fill: "#e91e63", strokeWidth: 0 },
  ],
};

/**
 * LINHO — warm parchment, editorial.
 * Cover: Elegant L-shaped corner frames (top-left + bottom-right) + bottom strip.
 * Content: Same corner accent, scaled down.
 */
const linho: PresentationTheme = {
  id: "warm",
  name: "Linho",
  bg: "#faf7f0",
  bgGradient: {
    angle: 120,
    stops: [
      { offset: 0, color: "#faf7f0" },
      { offset: 1, color: "#f0e8d5" },
    ],
  },
  titleColor: "#2c1206",
  bodyColor: "#5c3a1e",
  accentColor: "#8b4513",
  mutedColor: "#a07850",
  titleFont: "Merriweather, Georgia, serif",
  bodyFont: "Lato, system-ui, sans-serif",
  coverDecorations: [
    // Top-left corner — horizontal arm
    { x: 0.04, y: 0.06, w: 0.14, h: 0.007, shape: "rect", fill: "#8b4513", strokeWidth: 0 },
    // Top-left corner — vertical arm
    { x: 0.04, y: 0.06, w: 0.007, h: 0.18, shape: "rect", fill: "#8b4513", strokeWidth: 0 },
    // Bottom-right corner — horizontal arm
    { x: 0.82, y: 0.912, w: 0.14, h: 0.007, shape: "rect", fill: "#8b4513", strokeWidth: 0 },
    // Bottom-right corner — vertical arm
    { x: 0.953, y: 0.73, w: 0.007, h: 0.19, shape: "rect", fill: "#8b4513", strokeWidth: 0 },
    // Bottom tinted strip
    { x: 0, y: 0.91, w: 1, h: 0.09, shape: "rect", fill: "rgba(139,69,19,0.07)", strokeWidth: 0 },
    // Bottom accent rule
    { x: 0, y: 0.907, w: 0.40, h: 0.010, shape: "rect", fill: "#8b4513", strokeWidth: 0 },
  ],
  decorations: [
    { x: 0.04, y: 0.06, w: 0.085, h: 0.007, shape: "rect", fill: "rgba(139,69,19,0.60)", strokeWidth: 0 },
    { x: 0.04, y: 0.06, w: 0.007, h: 0.12, shape: "rect", fill: "rgba(139,69,19,0.60)", strokeWidth: 0 },
    { x: 0, y: 0.91, w: 1, h: 0.09, shape: "rect", fill: "rgba(139,69,19,0.05)", strokeWidth: 0 },
    { x: 0, y: 0.907, w: 0.25, h: 0.009, shape: "rect", fill: "#8b4513", strokeWidth: 0 },
  ],
};

/**
 * GLACIAL — pale ice blue.
 * Cover: One large diamond outline (rotated square, stroke only) mostly off-screen.
 * Content: Thin blue top bar.
 */
const glacial: PresentationTheme = {
  id: "sky",
  name: "Glacial",
  bg: "#e8f4fd",
  bgGradient: {
    angle: 150,
    stops: [
      { offset: 0, color: "#eef6fd" },
      { offset: 1, color: "#dbe8f7" },
    ],
  },
  titleColor: "#0a2540",
  bodyColor: "#1565c0",
  accentColor: "#1976d2",
  mutedColor: "#64b5f6",
  titleFont: "Montserrat, system-ui, sans-serif",
  bodyFont: "Lato, system-ui, sans-serif",
  coverDecorations: [
    // Large diamond outline — mostly off top-right
    { x: 0.56, y: -0.62, w: 0.70, h: 0.70 * (16 / 9), shape: "rect", fill: "transparent", stroke: "rgba(25,118,210,0.15)", strokeWidth: 0.004, rotation: 45, cornerRadius: 0 },
    // Smaller inner diamond
    { x: 0.70, y: -0.32, w: 0.38, h: 0.38 * (16 / 9), shape: "rect", fill: "rgba(25,118,210,0.05)", stroke: "rgba(25,118,210,0.22)", strokeWidth: 0.004, rotation: 45, cornerRadius: 0 },
    // Thin accent rule near bottom
    { x: 0.06, y: 0.85, w: 0.18, h: 0.004, shape: "rect", fill: "#1976d2", strokeWidth: 0 },
  ],
  decorations: [
    { x: 0, y: 0, w: 1, h: 0.006, shape: "rect", fill: "#1976d2", strokeWidth: 0 },
  ],
};

/* ─────────────────────────────────────────────────────────────────────────────
 * VIBRANT / COLOURFUL
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * ABISSAL — midnight ocean.
 * Cover: Tinted sea-floor band across lower third + one soft glow circle.
 * Content: Thin teal top bar.
 */
const abissal: PresentationTheme = {
  id: "ocean",
  name: "Abissal",
  bg: "#00111c",
  bgGradient: {
    angle: 180,
    stops: [
      { offset: 0, color: "#001520" },
      { offset: 0.6, color: "#00375a" },
      { offset: 1, color: "#004d7a" },
    ],
  },
  titleColor: "#e3f8ff",
  bodyColor: "#81d4fa",
  accentColor: "#00bcd4",
  mutedColor: "#006064",
  titleFont: "Montserrat, system-ui, sans-serif",
  bodyFont: "Poppins, system-ui, sans-serif",
  coverDecorations: [
    // Sea-floor tinted band across the bottom
    { x: 0, y: 0.72, w: 1, h: 0.28, shape: "rect", fill: "rgba(0,188,212,0.10)", strokeWidth: 0 },
    { x: 0, y: 0.72, w: 1, h: 0.006, shape: "rect", fill: "rgba(0,188,212,0.35)", strokeWidth: 0 },
    // Soft glow circle, bottom-left, mostly off-screen
    { x: -0.22, y: 0.30, w: 0.72, h: 0.72 * (16 / 9), shape: "ellipse", fill: "rgba(0,188,212,0.07)", stroke: "rgba(0,188,212,0.16)", strokeWidth: 0.002 },
  ],
  decorations: [
    { x: 0, y: 0, w: 1, h: 0.006, shape: "rect", fill: "#00bcd4", strokeWidth: 0 },
  ],
};

/**
 * ESMERALDA — deep forest green.
 * Cover: Two overlapping leaf ellipses in the top-right corner, like corner
 *        botanical art. Clean content area.
 * Content: Thin green left border.
 */
const esmeralda: PresentationTheme = {
  id: "forest",
  name: "Esmeralda",
  bg: "#050e08",
  bgGradient: {
    angle: 140,
    stops: [
      { offset: 0, color: "#050e08" },
      { offset: 1, color: "#102a18" },
    ],
  },
  titleColor: "#e8fdf0",
  bodyColor: "#86efac",
  accentColor: "#22c55e",
  mutedColor: "#166534",
  titleFont: "Merriweather, Georgia, serif",
  bodyFont: "Lato, system-ui, sans-serif",
  coverDecorations: [
    // Large leaf — top right, mostly off-screen
    { x: 0.40, y: -0.18, w: 0.80, h: 0.80 * 0.26, shape: "ellipse", fill: "rgba(34,197,94,0.09)", stroke: "rgba(34,197,94,0.22)", strokeWidth: 0.002, rotation: 30 },
    // Second leaf crossing it at different angle
    { x: 0.55, y: 0.05, w: 0.70, h: 0.70 * 0.26, shape: "ellipse", fill: "rgba(34,197,94,0.07)", stroke: "rgba(34,197,94,0.15)", strokeWidth: 0.0015, rotation: 70 },
    // Small leaf, bottom-left (corner accent)
    { x: -0.18, y: 0.68, w: 0.48, h: 0.48 * 0.26, shape: "ellipse", fill: "rgba(34,197,94,0.07)", stroke: "rgba(34,197,94,0.13)", strokeWidth: 0.0015, rotation: -15 },
    // Thin accent rule
    { x: 0.06, y: 0.86, w: 0.18, h: 0.004, shape: "rect", fill: "#22c55e", strokeWidth: 0 },
  ],
  decorations: [
    { x: 0, y: 0, w: 0.006, h: 1, shape: "rect", fill: "#22c55e", strokeWidth: 0 },
  ],
};

/**
 * VULCÃO — volcanic, dark purple → ember orange.
 * Cover: Bold diagonal colour block rising from the bottom, like flowing lava.
 * Content: Thin orange left border.
 */
const vulcao: PresentationTheme = {
  id: "sunset",
  name: "Vulcão",
  bg: "#0e0516",
  bgGradient: {
    angle: 160,
    stops: [
      { offset: 0, color: "#0e0516" },
      { offset: 0.55, color: "#3d0a00" },
      { offset: 1, color: "#1a0800" },
    ],
  },
  titleColor: "#fff3e0",
  bodyColor: "#ffcc80",
  accentColor: "#ff6e00",
  mutedColor: "#bf360c",
  titleFont: "Raleway, system-ui, sans-serif",
  bodyFont: "Poppins, system-ui, sans-serif",
  // Title and subtitle sit in the clean upper half, above the lava block
  coverTextLayout: {
    title:    { x: 0.10, y: 0.18, w: 0.80, h: 0.22, align: "center" },
    subtitle: { x: 0.10, y: 0.44, w: 0.80, h: 0.10, align: "center" },
  },
  coverDecorations: [
    // Diagonal lava floor block — lower third
    { x: -0.20, y: 0.67, w: 1.40, h: 0.80, shape: "rect", fill: "rgba(255,110,0,0.11)", strokeWidth: 0, rotation: -7, cornerRadius: 0 },
    // Bright top edge of the lava block
    { x: -0.20, y: 0.67, w: 1.40, h: 0.010, shape: "rect", fill: "rgba(255,110,0,0.45)", strokeWidth: 0, rotation: -7, cornerRadius: 0 },
    // Soft glow source rising from the lava surface
    { x: 0.15, y: 0.52, w: 0.55, h: 0.55 * (16 / 9), shape: "ellipse", fill: "rgba(255,80,0,0.10)", strokeWidth: 0 },
  ],
  decorations: [
    { x: 0, y: 0, w: 0.006, h: 1, shape: "rect", fill: "#ff6e00", strokeWidth: 0 },
  ],
};

/* ─────────────────────────────────────────────────────────────────────────────
 * EDUCATIONAL THEMES
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * ACADÉMICO — navy + gold.
 * Cover: Classic header + footer bands with a subtle crest watermark circle.
 * Content: Header band only.
 */
const academico: PresentationTheme = {
  id: "academic",
  name: "Académico",
  bg: "#06091a",
  bgGradient: {
    angle: 180,
    stops: [
      { offset: 0, color: "#060c1e" },
      { offset: 1, color: "#06091a" },
    ],
  },
  titleColor: "#fff9e0",
  bodyColor: "#e8e0cc",
  accentColor: "#d4a017",
  mutedColor: "#8a7a4a",
  titleFont: "Merriweather, Georgia, serif",
  bodyFont: "Lato, system-ui, sans-serif",
  coverDecorations: [
    // Header tinted band
    { x: 0, y: 0, w: 1, h: 0.085, shape: "rect", fill: "rgba(212,160,23,0.12)", strokeWidth: 0 },
    // Header gold rule
    { x: 0, y: 0.083, w: 1, h: 0.008, shape: "rect", fill: "#d4a017", strokeWidth: 0 },
    // Footer tinted band
    { x: 0, y: 0.90, w: 1, h: 0.10, shape: "rect", fill: "rgba(212,160,23,0.09)", strokeWidth: 0 },
    // Footer gold rule
    { x: 0, y: 0.898, w: 1, h: 0.006, shape: "rect", fill: "#d4a017", strokeWidth: 0 },
    // Faint crest watermark circle (very subtle)
    { x: 0.33, y: 0.10, w: 0.34, h: 0.34 * (16 / 9), shape: "ellipse", fill: "transparent", stroke: "rgba(212,160,23,0.07)", strokeWidth: 0.005 },
  ],
  decorations: [
    { x: 0, y: 0, w: 1, h: 0.060, shape: "rect", fill: "rgba(212,160,23,0.09)", strokeWidth: 0 },
    { x: 0, y: 0.058, w: 1, h: 0.007, shape: "rect", fill: "#d4a017", strokeWidth: 0 },
  ],
};

/**
 * ESCOLA — cobalt blue + sunshine yellow.
 * Cover: Bold left colour panel in blue, yellow vertical accent stripe on the edge.
 * Content: Yellow left border + thin blue top bar.
 */
const escola: PresentationTheme = {
  id: "classroom",
  name: "Escola",
  bg: "#050e30",
  bgGradient: {
    angle: 155,
    stops: [
      { offset: 0, color: "#050e30" },
      { offset: 1, color: "#0d2070" },
    ],
  },
  titleColor: "#fff59d",
  bodyColor: "#dbeafe",
  accentColor: "#ffd600",
  mutedColor: "#7986cb",
  titleFont: "Poppins, system-ui, sans-serif",
  bodyFont: "Lato, system-ui, sans-serif",
  // Title lives in the right content area (to the right of the left panel)
  coverTextLayout: {
    title:    { x: 0.46, y: 0.24, w: 0.50, h: 0.26, align: "left" },
    subtitle: { x: 0.46, y: 0.58, w: 0.50, h: 0.14, align: "left" },
  },
  coverDecorations: [
    // Left blue panel
    { x: 0, y: 0, w: 0.40, h: 1, shape: "rect", fill: "rgba(13,32,112,0.55)", strokeWidth: 0 },
    // Yellow vertical rule (accent stripe between panel and content)
    { x: 0.40, y: 0, w: 0.008, h: 1, shape: "rect", fill: "#ffd600", strokeWidth: 0 },
    // Small yellow dot accent inside panel
    { x: 0.18, y: 0.84, w: 0.08, h: 0.08 * (16 / 9), shape: "ellipse", fill: "rgba(255,214,0,0.30)", strokeWidth: 0 },
  ],
  decorations: [
    { x: 0, y: 0, w: 0.007, h: 1, shape: "rect", fill: "#ffd600", strokeWidth: 0 },
    { x: 0.007, y: 0, w: 1 - 0.007, h: 0.006, shape: "rect", fill: "rgba(255,214,0,0.25)", strokeWidth: 0 },
  ],
};

/**
 * CIÊNCIAS — dark teal, STEM precision.
 * Cover: Single clean atom orbit ring (large, off top-right corner) with a
 *        bright nucleus dot — one purposeful scientific motif.
 * Content: Thin teal top bar.
 */
const ciencias: PresentationTheme = {
  id: "science",
  name: "Ciências",
  bg: "#020e12",
  bgGradient: {
    angle: 145,
    stops: [
      { offset: 0, color: "#020e12" },
      { offset: 1, color: "#0a2a34" },
    ],
  },
  titleColor: "#ccfbf1",
  bodyColor: "#99f6e4",
  accentColor: "#2dd4bf",
  mutedColor: "#0d9488",
  titleFont: "Montserrat, system-ui, sans-serif",
  bodyFont: "Lato, system-ui, sans-serif",
  coverDecorations: [
    // Outer orbital ring — mostly off top-right
    { x: 0.44, y: -0.78, w: 1.05, h: 1.05 * (16 / 9), shape: "ellipse", fill: "transparent", stroke: "rgba(45,212,191,0.18)", strokeWidth: 0.004 },
    // Inner ring
    { x: 0.58, y: -0.46, w: 0.65, h: 0.65 * (16 / 9), shape: "ellipse", fill: "rgba(45,212,191,0.05)", stroke: "rgba(45,212,191,0.28)", strokeWidth: 0.004 },
    // Nucleus (visible near top-right edge)
    { x: 0.872, y: 0.065, w: 0.048, h: 0.048 * (16 / 9), shape: "ellipse", fill: "rgba(45,212,191,0.55)", stroke: "rgba(45,212,191,0.80)", strokeWidth: 0.003 },
    // Thin accent rule near bottom
    { x: 0.06, y: 0.86, w: 0.18, h: 0.004, shape: "rect", fill: "#2dd4bf", strokeWidth: 0 },
  ],
  decorations: [
    { x: 0, y: 0, w: 1, h: 0.006, shape: "rect", fill: "#2dd4bf", strokeWidth: 0 },
  ],
};

/* ─────────────────────────────────────────────────────────────────────────────
 * MINIMAL / CHILDISH
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * BRANCO — pure white, blank canvas.
 * No decorations whatsoever. Ideal as a neutral starting point.
 */
const branco: PresentationTheme = {
  id: "clean",
  name: "Branco",
  bg: "#ffffff",
  titleColor: "#111827",
  bodyColor: "#374151",
  accentColor: "#3b82f6",
  mutedColor: "#9ca3af",
  titleFont: "Poppins, system-ui, sans-serif",
  bodyFont: "Lato, system-ui, sans-serif",
};

/**
 * ARCO-ÍRIS — rainbow top band + colourful corner dots.
 * Bold primary colours, Poppins, very bright and cheerful.
 * Cover text sits below the rainbow stripe.
 */
const arcoiris: PresentationTheme = {
  id: "rainbow",
  name: "Arco-Íris",
  bg: "#fffef8",
  titleColor: "#1e1b4b",
  bodyColor: "#312e81",
  accentColor: "#f97316",
  mutedColor: "#94a3b8",
  titleFont: "Poppins, system-ui, sans-serif",
  bodyFont: "Poppins, system-ui, sans-serif",
  coverTextLayout: {
    title:    { x: 0.10, y: 0.24, w: 0.80, h: 0.24, align: "center" },
    subtitle: { x: 0.10, y: 0.54, w: 0.80, h: 0.12, align: "center" },
  },
  coverDecorations: [
    // Rainbow band — 6 stripes across the full top
    { x: 0, y: 0,     w: 1, h: 0.014, shape: "rect", fill: "#ef4444", strokeWidth: 0 },
    { x: 0, y: 0.014, w: 1, h: 0.014, shape: "rect", fill: "#f97316", strokeWidth: 0 },
    { x: 0, y: 0.028, w: 1, h: 0.014, shape: "rect", fill: "#eab308", strokeWidth: 0 },
    { x: 0, y: 0.042, w: 1, h: 0.014, shape: "rect", fill: "#22c55e", strokeWidth: 0 },
    { x: 0, y: 0.056, w: 1, h: 0.014, shape: "rect", fill: "#3b82f6", strokeWidth: 0 },
    { x: 0, y: 0.070, w: 1, h: 0.014, shape: "rect", fill: "#a855f7", strokeWidth: 0 },
    // Bottom-left colourful dots
    { x: 0.02, y: 0.80, w: 0.065, h: 0.065 * (16 / 9), shape: "ellipse", fill: "#ef4444", strokeWidth: 0 },
    { x: 0.10, y: 0.85, w: 0.050, h: 0.050 * (16 / 9), shape: "ellipse", fill: "#f97316", strokeWidth: 0 },
    { x: 0.17, y: 0.78, w: 0.040, h: 0.040 * (16 / 9), shape: "ellipse", fill: "#eab308", strokeWidth: 0 },
    // Bottom-right colourful dots
    { x: 0.87, y: 0.78, w: 0.060, h: 0.060 * (16 / 9), shape: "ellipse", fill: "#3b82f6", strokeWidth: 0 },
    { x: 0.93, y: 0.84, w: 0.048, h: 0.048 * (16 / 9), shape: "ellipse", fill: "#22c55e", strokeWidth: 0 },
    { x: 0.81, y: 0.86, w: 0.038, h: 0.038 * (16 / 9), shape: "ellipse", fill: "#a855f7", strokeWidth: 0 },
  ],
  decorations: [
    { x: 0, y: 0,     w: 1, h: 0.010, shape: "rect", fill: "#ef4444", strokeWidth: 0 },
    { x: 0, y: 0.010, w: 1, h: 0.010, shape: "rect", fill: "#f97316", strokeWidth: 0 },
    { x: 0, y: 0.020, w: 1, h: 0.010, shape: "rect", fill: "#eab308", strokeWidth: 0 },
    { x: 0, y: 0.030, w: 1, h: 0.010, shape: "rect", fill: "#22c55e", strokeWidth: 0 },
    { x: 0, y: 0.040, w: 1, h: 0.010, shape: "rect", fill: "#3b82f6", strokeWidth: 0 },
    { x: 0, y: 0.050, w: 1, h: 0.010, shape: "rect", fill: "#a855f7", strokeWidth: 0 },
  ],
};

/**
 * PRADO — spring meadow. Light lime-green sky, warm yellow sun in top-right,
 * green grass strip at the bottom. Inviting and cheerful.
 */
const prado: PresentationTheme = {
  id: "meadow",
  name: "Prado",
  bg: "#f7fee7",
  bgGradient: {
    angle: 180,
    stops: [
      { offset: 0, color: "#f0fdf4" },
      { offset: 1, color: "#dcfce7" },
    ],
  },
  titleColor: "#14532d",
  bodyColor: "#166534",
  accentColor: "#f59e0b",
  mutedColor: "#86efac",
  titleFont: "Poppins, system-ui, sans-serif",
  bodyFont: "Poppins, system-ui, sans-serif",
  // Text lives in the left portion — the sun takes the upper right
  coverTextLayout: {
    title:    { x: 0.06, y: 0.28, w: 0.62, h: 0.24, align: "left" },
    subtitle: { x: 0.06, y: 0.56, w: 0.62, h: 0.12, align: "left" },
  },
  coverDecorations: [
    // Sun — large circle, mostly visible in the top-right corner
    { x: 0.64, y: -0.22, w: 0.44, h: 0.44 * (16 / 9), shape: "ellipse", fill: "#fbbf24", strokeWidth: 0 },
    // Sun glow ring
    { x: 0.59, y: -0.36, w: 0.58, h: 0.58 * (16 / 9), shape: "ellipse", fill: "rgba(251,191,36,0.18)", strokeWidth: 0 },
    // Grass strip at the bottom
    { x: 0, y: 0.88, w: 1, h: 0.12, shape: "rect", fill: "rgba(34,197,94,0.28)", strokeWidth: 0 },
    { x: 0, y: 0.878, w: 1, h: 0.007, shape: "rect", fill: "rgba(34,197,94,0.65)", strokeWidth: 0 },
    // Small flower dot — bottom left
    { x: 0.04, y: 0.82, w: 0.055, h: 0.055 * (16 / 9), shape: "ellipse", fill: "#f97316", strokeWidth: 0 },
    { x: 0.12, y: 0.84, w: 0.040, h: 0.040 * (16 / 9), shape: "ellipse", fill: "#ef4444", strokeWidth: 0 },
  ],
  decorations: [
    { x: 0, y: 0.92, w: 1, h: 0.08, shape: "rect", fill: "rgba(34,197,94,0.22)", strokeWidth: 0 },
    { x: 0, y: 0.918, w: 1, h: 0.007, shape: "rect", fill: "rgba(34,197,94,0.55)", strokeWidth: 0 },
  ],
};

/**
 * GALÁXIA — light lavender sky scattered with multicoloured star dots.
 * Fun and cosmic without the darkness of Nebula. For younger audiences.
 */
const galaxia: PresentationTheme = {
  id: "galaxy",
  name: "Galáxia",
  bg: "#f8f5ff",
  bgGradient: {
    angle: 150,
    stops: [
      { offset: 0, color: "#f8f5ff" },
      { offset: 1, color: "#ede9fe" },
    ],
  },
  titleColor: "#3b0764",
  bodyColor: "#6d28d9",
  accentColor: "#7c3aed",
  mutedColor: "#a78bfa",
  titleFont: "Poppins, system-ui, sans-serif",
  bodyFont: "Poppins, system-ui, sans-serif",
  coverDecorations: [
    // Large planet circle — partially off top-right
    { x: 0.58, y: -0.28, w: 0.56, h: 0.56 * (16 / 9), shape: "ellipse", fill: "rgba(167,139,250,0.20)", stroke: "rgba(124,58,237,0.30)", strokeWidth: 0.004 },
    // Saturn-like ring around planet (thin flat ellipse at angle)
    { x: 0.46, y: -0.04, w: 0.80, h: 0.80 * 0.14, shape: "ellipse", fill: "transparent", stroke: "rgba(167,139,250,0.35)", strokeWidth: 0.003, rotation: -12 },
    // Colourful star dots scattered away from title area
    { x: 0.08, y: 0.10, w: 0.020, h: 0.020 * (16 / 9), shape: "ellipse", fill: "#ef4444", strokeWidth: 0 },
    { x: 0.22, y: 0.06, w: 0.016, h: 0.016 * (16 / 9), shape: "ellipse", fill: "#f97316", strokeWidth: 0 },
    { x: 0.38, y: 0.09, w: 0.014, h: 0.014 * (16 / 9), shape: "ellipse", fill: "#eab308", strokeWidth: 0 },
    { x: 0.06, y: 0.68, w: 0.018, h: 0.018 * (16 / 9), shape: "ellipse", fill: "#22c55e", strokeWidth: 0 },
    { x: 0.18, y: 0.78, w: 0.022, h: 0.022 * (16 / 9), shape: "ellipse", fill: "#3b82f6", strokeWidth: 0 },
    { x: 0.88, y: 0.70, w: 0.020, h: 0.020 * (16 / 9), shape: "ellipse", fill: "#ec4899", strokeWidth: 0 },
    { x: 0.78, y: 0.80, w: 0.018, h: 0.018 * (16 / 9), shape: "ellipse", fill: "#f97316", strokeWidth: 0 },
    { x: 0.55, y: 0.76, w: 0.016, h: 0.016 * (16 / 9), shape: "ellipse", fill: "#eab308", strokeWidth: 0 },
    { x: 0.42, y: 0.82, w: 0.014, h: 0.014 * (16 / 9), shape: "ellipse", fill: "#a855f7", strokeWidth: 0 },
  ],
  decorations: [
    { x: 0, y: 0, w: 1, h: 0.006, shape: "rect", fill: "#7c3aed", strokeWidth: 0 },
    // A few scattered star dots on content slides too
    { x: 0.92, y: 0.12, w: 0.016, h: 0.016 * (16 / 9), shape: "ellipse", fill: "#f97316", strokeWidth: 0 },
    { x: 0.04, y: 0.80, w: 0.014, h: 0.014 * (16 / 9), shape: "ellipse", fill: "#3b82f6", strokeWidth: 0 },
  ],
};

/* ─────────────────────────────────────────────────────────────────────────────
 * Export
 * ─────────────────────────────────────────────────────────────────────────── */

export const THEMES: PresentationTheme[] = [
  branco,
  noir,
  aurora,
  nebula,
  carmim,
  pearl,
  floral,
  linho,
  glacial,
  abissal,
  esmeralda,
  vulcao,
  academico,
  escola,
  ciencias,
  arcoiris,
  prado,
  galaxia,
];

export function getThemeById(id: string): PresentationTheme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/** Convert a ThemeGradient to a CSS linear-gradient string (for non-Konva use). */
export function themeToCssGradient(g: ThemeGradient): string {
  const stops = g.stops.map((s) => `${s.color} ${s.offset * 100}%`).join(", ");
  return `linear-gradient(${g.angle}deg, ${stops})`;
}
