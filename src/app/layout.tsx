import AuthProvider from "@/components/providers/AuthProvider";
import ClerkThemeProvider from "@/components/providers/ClerkThemeProvider";
import StoreProvider from "@/components/providers/StoreProvider";
import ThemeProvider from "@/components/providers/ThemeProvider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const themeInitScript = `
(function() {
  try {
    var theme = localStorage.getItem('scooli-theme');
    var isDark = theme === 'dark' || 
      ((theme === 'system' || !theme) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;

const themeInitScript = `
(function() {
  try {
    var theme = localStorage.getItem('scooli-theme');
    var isDark = theme === 'dark' || 
      ((theme === 'system' || !theme) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;

const themeInitScript = `
(function() {
  try {
    var theme = localStorage.getItem('scooli-theme');
    var isDark = theme === 'dark' || 
      ((theme === 'system' || !theme) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;

const lexend = Lexend({
  variable: "--font-lexend-variable",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Scooli - Plataforma AI para Professores",
  description:
    "Crie conteúdo educacional de qualidade em segundos com inteligência artificial.",
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
  appleWebApp: {
    title: "Scooli",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        <StoreProvider>
          <ThemeProvider>
            <ClerkThemeProvider>
              <AuthProvider>
                {children}
              </AuthProvider>
            </ClerkThemeProvider>
          </ThemeProvider>
        </StoreProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
