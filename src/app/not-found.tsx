"use client";

import { Button } from "@/frontend/components/ui/button";
import { Card } from "@/frontend/components/ui/card";
import { Home, Search, ArrowLeft } from "lucide-react";
import Link from "next/link"; 
import { useRouter } from "next/navigation";
import { Routes } from "@/shared/types/routes";

export default function NotFound() {
  const router = useRouter();

  const handleGoBack = () => {
    // Check if there's history to go back to
    if (window.history.length > 1) {
      router.back();
    } else {
      // Fallback to dashboard if no history
      router.push(Routes.DASHBOARD);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-6 w-full">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-[#6753FF] rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-[#0B0D17] mb-2">404</h1>
          <h2 className="text-xl font-semibold text-[#2E2F38] mb-2">
            Página não encontrada
          </h2>
          <p className="text-[#6C6F80] mb-6">
            A página que está a procurar não existe ou foi movida.
          </p>
        </div>

        <div className="space-y-3">
          <Button asChild className="w-full bg-[#6753FF] hover:bg-[#4E3BC0] text-white">
            <Link href={Routes.DASHBOARD}>
              <Home className="h-4 w-4 mr-2" />
              Ir para o Dashboard
            </Link>
          </Button>
          
          <Button variant="outline" asChild className="w-full border-[#C7C9D9] text-[#0B0D17] bg-white hover:bg-[#EEF0FF]">
            <button onClick={handleGoBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar atrás
            </button>
          </Button>
        </div>

        <div className="mt-8 pt-6 border-t border-[#E4E4E7]">
          <p className="text-sm text-[#6C6F80]">
            Se acredita que isto é um erro, contacte o suporte.
          </p>
        </div>
      </Card>
    </div>
  );
} 