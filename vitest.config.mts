import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: {
      "@": path.join(root, "src"),
    },
  },
  // tsconfig says "preserve" for Next.js; vitest must compile .tsx itself to render components.
  oxc: {
    jsx: { runtime: "automatic" },
  },
  // Components that import CSS (KaTeX) load in tests without the app's Tailwind PostCSS pipeline.
  css: { postcss: {} },
  test: {
    environment: "node",
  },
});
