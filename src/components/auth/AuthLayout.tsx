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
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/scooli.svg"
              alt="Scooli"
              width={150}
              height={120}
              className="h-8"
            />
          </Link>
          
          {mounted && <ThemeToggle />}
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center px-6 py-12">
          {children}
      </div>
    </div>
  );
}

