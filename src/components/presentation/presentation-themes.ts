import type { CSSProperties } from "react";
import type {
  PresentationCalloutTone,
  PresentationThemeId,
} from "@/shared/types/presentation";

export interface PresentationThemeDefinition {
  id: PresentationThemeId;
  name: string;
  description: string;
  preview: string;
  canvasStyle: CSSProperties;
  titleStyle: CSSProperties;
  subtitleStyle: CSSProperties;
  bodyStyle: CSSProperties;
  secondaryStyle: CSSProperties;
  chromeStyle: CSSProperties;
  placeholderStyle: CSSProperties;
  calloutStyles: Record<PresentationCalloutTone, CSSProperties>;
  imageFrameStyle: CSSProperties;
  dividerColor: string;
}

export const presentationThemes: PresentationThemeDefinition[] = [
  {
    id: "scooli-dark",
    name: "Scooli Dark",
    description: "Contraste forte, acentos luminosos e ritmo visual confiante.",
    preview: "linear-gradient(135deg, #101b3d 0%, #0e1328 55%, #26165f 100%)",
    canvasStyle: {
      background:
        "radial-gradient(circle at top right, rgba(115,92,255,0.42), transparent 35%), linear-gradient(135deg, #101b3d 0%, #0e1328 55%, #26165f 100%)",
      color: "#f7f9ff",
      borderRadius: 28,
      border: "1px solid rgba(140, 168, 255, 0.16)",
      boxShadow: "0 28px 60px rgba(7, 9, 18, 0.28)",
    },
    titleStyle: {
      fontSize: "clamp(2rem, 3vw, 3.4rem)",
      lineHeight: 1.02,
      fontWeight: 700,
      letterSpacing: "-0.04em",
      fontFamily: "\"Avenir Next\", \"Segoe UI\", sans-serif",
    },
    subtitleStyle: {
      fontSize: "clamp(1rem, 1.35vw, 1.45rem)",
      lineHeight: 1.4,
      color: "rgba(236, 241, 255, 0.86)",
      fontFamily: "\"Segoe UI\", sans-serif",
    },
    bodyStyle: {
      fontSize: "clamp(1rem, 1.15vw, 1.2rem)",
      lineHeight: 1.55,
      color: "rgba(248, 249, 255, 0.92)",
      fontFamily: "\"Segoe UI\", sans-serif",
    },
    secondaryStyle: {
      fontSize: "clamp(0.95rem, 1vw, 1.1rem)",
      lineHeight: 1.4,
      color: "rgba(194, 203, 241, 0.92)",
      fontFamily: "\"Segoe UI\", sans-serif",
    },
    chromeStyle: {
      background: "rgba(255, 255, 255, 0.08)",
      border: "1px solid rgba(255, 255, 255, 0.12)",
      color: "#f7f9ff",
      borderRadius: 22,
      boxShadow: "0 20px 40px rgba(4, 8, 21, 0.2)",
      backdropFilter: "blur(12px)",
    },
    placeholderStyle: {
      background:
        "linear-gradient(145deg, rgba(121, 144, 255, 0.18), rgba(88, 211, 255, 0.08))",
      border: "1px dashed rgba(143, 173, 255, 0.45)",
      color: "rgba(229, 236, 255, 0.86)",
      borderRadius: 24,
    },
    calloutStyles: {
      neutral: {
        background: "rgba(255, 255, 255, 0.08)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
      },
      info: {
        background: "rgba(103, 83, 255, 0.18)",
        border: "1px solid rgba(142, 126, 255, 0.42)",
      },
      success: {
        background: "rgba(22, 163, 74, 0.18)",
        border: "1px solid rgba(74, 222, 128, 0.4)",
      },
      warning: {
        background: "rgba(217, 119, 6, 0.2)",
        border: "1px solid rgba(251, 191, 36, 0.4)",
      },
    },
    imageFrameStyle: {
      background: "rgba(255, 255, 255, 0.06)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: 28,
      overflow: "hidden",
      boxShadow: "0 18px 36px rgba(3, 8, 18, 0.18)",
    },
    dividerColor: "rgba(194, 203, 241, 0.22)",
  },
  {
    id: "clean-light",
    name: "Clean Light",
    description: "Espaço generoso, tipografia sóbria e leitura editorial.",
    preview: "linear-gradient(135deg, #ffffff 0%, #f5f1ea 100%)",
    canvasStyle: {
      background:
        "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(247,243,237,1) 100%)",
      color: "#1e2431",
      borderRadius: 28,
      border: "1px solid rgba(40, 48, 66, 0.08)",
      boxShadow: "0 22px 55px rgba(30, 36, 49, 0.12)",
    },
    titleStyle: {
      fontSize: "clamp(2.1rem, 3vw, 3.4rem)",
      lineHeight: 1.08,
      fontWeight: 600,
      letterSpacing: "-0.04em",
      fontFamily: "Georgia, \"Times New Roman\", serif",
    },
    subtitleStyle: {
      fontSize: "clamp(1rem, 1.25vw, 1.32rem)",
      lineHeight: 1.5,
      color: "rgba(52, 63, 81, 0.86)",
      fontFamily: "\"Avenir Next\", \"Segoe UI\", sans-serif",
    },
    bodyStyle: {
      fontSize: "clamp(1rem, 1.1vw, 1.18rem)",
      lineHeight: 1.6,
      color: "#273041",
      fontFamily: "\"Avenir Next\", \"Segoe UI\", sans-serif",
    },
    secondaryStyle: {
      fontSize: "clamp(0.95rem, 1vw, 1.08rem)",
      lineHeight: 1.45,
      color: "rgba(76, 88, 109, 0.95)",
      fontFamily: "\"Avenir Next\", \"Segoe UI\", sans-serif",
    },
    chromeStyle: {
      background: "rgba(255, 255, 255, 0.86)",
      border: "1px solid rgba(39, 48, 65, 0.08)",
      color: "#1e2431",
      borderRadius: 20,
      boxShadow: "0 14px 28px rgba(30, 36, 49, 0.08)",
    },
    placeholderStyle: {
      background:
        "linear-gradient(145deg, rgba(243, 235, 224, 0.9), rgba(255,255,255,0.95))",
      border: "1px dashed rgba(120, 100, 83, 0.35)",
      color: "rgba(83, 68, 58, 0.85)",
      borderRadius: 26,
    },
    calloutStyles: {
      neutral: {
        background: "rgba(255, 255, 255, 0.72)",
        border: "1px solid rgba(39, 48, 65, 0.08)",
      },
      info: {
        background: "rgba(59, 130, 246, 0.08)",
        border: "1px solid rgba(96, 165, 250, 0.3)",
      },
      success: {
        background: "rgba(16, 185, 129, 0.09)",
        border: "1px solid rgba(16, 185, 129, 0.24)",
      },
      warning: {
        background: "rgba(245, 158, 11, 0.12)",
        border: "1px solid rgba(245, 158, 11, 0.24)",
      },
    },
    imageFrameStyle: {
      background: "#ffffff",
      border: "1px solid rgba(39, 48, 65, 0.08)",
      borderRadius: 28,
      overflow: "hidden",
      boxShadow: "0 14px 34px rgba(30, 36, 49, 0.08)",
    },
    dividerColor: "rgba(39, 48, 65, 0.12)",
  },
  {
    id: "educational-soft",
    name: "Educational Soft",
    description: "Tons acolhedores, cartões arredondados e energia didática.",
    preview: "linear-gradient(135deg, #fff4e8 0%, #f0f8f3 100%)",
    canvasStyle: {
      background:
        "radial-gradient(circle at top left, rgba(255, 182, 94, 0.32), transparent 34%), linear-gradient(135deg, #fff4e8 0%, #f0f8f3 100%)",
      color: "#22323d",
      borderRadius: 30,
      border: "1px solid rgba(41, 82, 69, 0.08)",
      boxShadow: "0 24px 56px rgba(34, 50, 61, 0.12)",
    },
    titleStyle: {
      fontSize: "clamp(2rem, 2.8vw, 3.25rem)",
      lineHeight: 1.04,
      fontWeight: 700,
      letterSpacing: "-0.04em",
      fontFamily: "\"Trebuchet MS\", \"Avenir Next\", sans-serif",
    },
    subtitleStyle: {
      fontSize: "clamp(1rem, 1.2vw, 1.3rem)",
      lineHeight: 1.45,
      color: "rgba(34, 50, 61, 0.86)",
      fontFamily: "\"Trebuchet MS\", \"Segoe UI\", sans-serif",
    },
    bodyStyle: {
      fontSize: "clamp(1rem, 1.08vw, 1.16rem)",
      lineHeight: 1.58,
      color: "#24404a",
      fontFamily: "\"Trebuchet MS\", \"Segoe UI\", sans-serif",
    },
    secondaryStyle: {
      fontSize: "clamp(0.95rem, 1vw, 1.08rem)",
      lineHeight: 1.45,
      color: "rgba(54, 79, 88, 0.94)",
      fontFamily: "\"Trebuchet MS\", \"Segoe UI\", sans-serif",
    },
    chromeStyle: {
      background: "rgba(255, 255, 255, 0.68)",
      border: "1px solid rgba(41, 82, 69, 0.1)",
      color: "#22323d",
      borderRadius: 22,
      boxShadow: "0 16px 34px rgba(34, 50, 61, 0.08)",
    },
    placeholderStyle: {
      background:
        "linear-gradient(145deg, rgba(255, 237, 214, 0.98), rgba(240, 248, 243, 0.95))",
      border: "1px dashed rgba(66, 136, 117, 0.34)",
      color: "rgba(54, 79, 88, 0.88)",
      borderRadius: 28,
    },
    calloutStyles: {
      neutral: {
        background: "rgba(255, 255, 255, 0.78)",
        border: "1px solid rgba(41, 82, 69, 0.12)",
      },
      info: {
        background: "rgba(59, 130, 246, 0.08)",
        border: "1px solid rgba(59, 130, 246, 0.22)",
      },
      success: {
        background: "rgba(34, 197, 94, 0.1)",
        border: "1px solid rgba(34, 197, 94, 0.2)",
      },
      warning: {
        background: "rgba(251, 146, 60, 0.12)",
        border: "1px solid rgba(249, 115, 22, 0.2)",
      },
    },
    imageFrameStyle: {
      background: "rgba(255, 255, 255, 0.72)",
      border: "1px solid rgba(41, 82, 69, 0.1)",
      borderRadius: 30,
      overflow: "hidden",
      boxShadow: "0 16px 40px rgba(34, 50, 61, 0.08)",
    },
    dividerColor: "rgba(41, 82, 69, 0.12)",
  },
];

export const presentationThemeMap = new Map(
  presentationThemes.map((theme) => [theme.id, theme]),
);

export function getPresentationTheme(themeId: PresentationThemeId): PresentationThemeDefinition {
  return presentationThemeMap.get(themeId) ?? presentationThemes[0];
}
