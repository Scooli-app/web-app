import Header from "@/components/layout/Header";
import type { ReactNode } from "react";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[#EEF0FF]">
      <Header />
      <main className="flex-1 w-full max-w-screen-xl mx-auto px-6 md:px-12 py-6 grid grid-cols-1 gap-6">
        {children}
      </main>
      <footer className="w-full max-w-screen-xl mx-auto px-6 md:px-12 py-4 text-center text-xs text-[#6C6F80]">
        © {new Date().getFullYear()} Scooli. Todos os direitos reservados.
      </footer>
    </div>
  );
}
