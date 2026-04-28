"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
  
interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/scooli.svg"
              alt="Scooli"
              width={150}
              height={120}
              className="h-7 w-auto sm:h-8"
            />
          </Link>
          
          {mounted && <ThemeToggle />}
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center px-3 py-6 sm:px-6 sm:py-12">
          {children}
      </div>
    </div>
  );
}

