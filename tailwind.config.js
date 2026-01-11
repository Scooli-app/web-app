/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "#C7C9D9",
        input: "#F4F5F8",
        ring: "#6753FF",
        background: "#FFFFFF",
        foreground: "#0B0D17",
        primary: {
          DEFAULT: "#6753FF",
          foreground: "#FFFFFF",
          hover: "#4E3BC0",
        },
        secondary: {
          DEFAULT: "#F4F5F8",
          foreground: "#0B0D17",
        },
        destructive: {
          DEFAULT: "#FF4F4F",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#F4F5F8",
          foreground: "#6C6F80",
        },
        accent: {
          DEFAULT: "#EEF0FF",
          foreground: "#0B0D17",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#0B0D17",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#0B0D17",
        },
        surface: "#FFFFFF",
        success: "#1DB67D",
        warning: "#FFC857",
        "background-light": "#EEF0FF",
        "text-primary": "#0B0D17",
        "text-secondary": "#2E2F38",
        "text-muted": "#6C6F80",
        "bg-muted": "#F4F5F8",
        "content-bg": "#EEF0FF",
      },
      borderRadius: {
        sm: "0.375rem",
        md: "0.75rem",
        lg: "1rem",
        xl: "1.5rem",
        "2xl": "2rem",
        full: "9999px",
      },
      boxShadow: {
        card: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
      },
      fontWeight: {
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
