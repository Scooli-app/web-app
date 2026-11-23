// The real root layout (with <html>) is `[locale]/layout.tsx`, prerendered once
// per language. This one only exists so `global-error.tsx` can sit at the root.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
