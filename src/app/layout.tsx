import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import StoreProvider from "@/components/providers/StoreProvider";
import { SidebarLayout } from "@/components/layout/SidebarLayout";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
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
      <body className={`${inter.className} antialiased`}>
        <StoreProvider>
          <SidebarLayout>{children}</SidebarLayout>
        </StoreProvider>
      </body>
    </html>
  );
}
