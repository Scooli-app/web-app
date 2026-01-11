import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // TypeScript specific rules
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/ban-ts-comment": "error",
      "@typescript-eslint/no-empty-function": "warn",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          disallowTypeAnnotations: false,
        },
      ],

      // General JavaScript/React rules
      "no-unused-vars": "off", // Handled by @typescript-eslint/no-unused-vars
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "no-var": "error",
      "prefer-const": "error",
      "prefer-template": "error",
      "no-duplicate-imports": "error",
      "no-useless-return": "error",
      "no-empty": "warn",
      "no-unreachable": "error",

      // React specific rules
      "react/jsx-no-useless-fragment": "error",
      "react/self-closing-comp": "error",
      "react/jsx-no-target-blank": "error",

      // React Hooks rules (already included in next/core-web-vitals)
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Next.js specific rules
      "@next/next/no-img-element": "error",

      // Code style and formatting
      eqeqeq: ["error", "always"],
      quotes: ["error", "double", { avoidEscape: true }],
      semi: ["error", "always"],

      // Security and best practices
      "no-eval": "error",
      "no-throw-literal": "error",
    },
  },
  {
    files: ["**/*.config.*", "**/next.config.*"],
    rules: {
      // Relax rules for config files
      "import/no-default-export": "off",
    },
  },
  {
    ignores: [
      ".next/**",
      "out/**",
      "dist/**",
      "node_modules/**",
      "*.config.js",
      "*.config.mjs",
      "tailwind.config.js",
      "postcss.config.mjs",
      "next.config.ts",
    ],
  },
];

export default eslintConfig;
