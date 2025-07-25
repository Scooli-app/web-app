import { SupabaseProvider } from "@/components/providers/SupabaseProvider";
import AuthProvider from "@/components/providers/AuthProvider";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Scooli - Plataforma AI para Professores",
  description:
    "Crie conteúdo educacional de qualidade em segundos com inteligência artificial.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt" className={inter.variable}>
      <body className={`${inter.className} antialiased`}>
        <SupabaseProvider>
          <AuthProvider>
            <SidebarLayout>
              {children}
            </SidebarLayout>
          </AuthProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
