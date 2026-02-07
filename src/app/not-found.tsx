"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Home, Search, ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Routes } from "@/shared/types";

export default function NotFound() {
  const router = useRouter();

  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(Routes.DASHBOARD);
    }
  };

  return (
    <div className="min-h-screen bg-accent dark:bg-background flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-8">
        <Image
          src="/scooli.svg"
          alt="Scooli"
          width={120}
          height={40}
          priority
        />
      </div>

      <Card className="w-full max-w-md p-8 text-center bg-card border-border">
        <div className="mb-6">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">404</h1>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Página não encontrada
          </h2>
          <p className="text-muted-foreground mb-6">
            A página que está a procurar não existe ou foi movida.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            asChild
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Link href={Routes.DASHBOARD}>
              <Home className="h-4 w-4 mr-2" />
              Ir para o Dashboard
            </Link>
          </Button>

          <Button
            variant="outline"
            onClick={handleGoBack}
            className="w-full border-border text-foreground bg-background hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar atrás
          </Button>
        </div>

        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Se acredita que isto é um erro, contacte o suporte.
          </p>
        </div>
      </Card>
    </div>
  );
}
