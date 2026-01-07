import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { createElement } from "react";

// Loading component for document editor
const EditorLoadingFallback = () =>
  createElement(
    "div",
    { className: "flex items-center justify-center min-h-[400px] w-full" },
    createElement(
      "div",
      { className: "flex items-center space-x-2" },
      createElement(Loader2, {
        className: "w-6 h-6 animate-spin text-[#6753FF]",
      }),
      createElement(
        "span",
        { className: "text-lg text-[#6C6F80]" },
        "A carregar editor..."
      )
    )
  );

// Dynamic import for DocumentEditor - this is a heavy component with TipTap
export const DocumentEditor = dynamic(() => import("./DocumentEditor"), {
  loading: EditorLoadingFallback,
  ssr: false, // TipTap doesn't work well with SSR
});

// Dynamic import for AIChatPanel
export const AIChatPanel = dynamic(() => import("./AIChatPanel"), {
  ssr: false,
});

// Re-export DocumentTitle as it's lightweight
export { default as DocumentTitle } from "./DocumentTitle";
