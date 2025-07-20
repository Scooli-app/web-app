import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Home, Search, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
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
            <Link href="/dashboard">
              <Home className="h-4 w-4 mr-2" />
              Ir para o Dashboard
            </Link>
          </Button>
          
          <Button variant="outline" asChild className="w-full">
            <Link href="javascript:history.back()">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar atrás
            </Link>
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