"use client";

import { Button } from "@/frontend/components/ui/button";
import { Card } from "@/frontend/components/ui/card";
import { useAuthStore } from "@/frontend/stores/auth.store";
import { Routes } from "@/shared/types/routes";
import { Download, Star, Upload, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CommunityPage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(Routes.LOGIN);
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] w-full">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#6753FF]" />
          <span className="text-lg text-[#6C6F80]">A carregar...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#6753FF] mb-4">
            Comunidade Scooli
          </h1>
          <p className="text-lg text-[#6C6F80]">
            Partilhe e descubra recursos educacionais criados pela comunidade
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 text-center">
            <div className="flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-[#6753FF]" />
            </div>
            <h3 className="text-2xl font-bold text-[#0B0D17] mb-2">1,247</h3>
            <p className="text-sm text-[#6C6F80]">Membros Ativos</p>
          </Card>

          <Card className="p-6 text-center">
            <div className="flex items-center justify-center mb-4">
              <Upload className="h-8 w-8 text-[#1DB67D]" />
            </div>
            <h3 className="text-2xl font-bold text-[#0B0D17] mb-2">3,891</h3>
            <p className="text-sm text-[#6C6F80]">Recursos Partilhados</p>
          </Card>

          <Card className="p-6 text-center">
            <div className="flex items-center justify-center mb-4">
              <Download className="h-8 w-8 text-[#FFC857]" />
            </div>
            <h3 className="text-2xl font-bold text-[#0B0D17] mb-2">12,456</h3>
            <p className="text-sm text-[#6C6F80]">Downloads Totais</p>
          </Card>
        </div>

        {/* Coming Soon Section */}
        <Card className="p-8 text-center">
          <div className="mb-6">
            <Star className="h-16 w-16 text-[#6753FF] mx-auto mb-4" />
            <h2 className="text-3xl font-semibold text-[#0B0D17] mb-4">
              Biblioteca Comunitária
            </h2>
            <p className="text-lg text-[#6C6F80] mb-6">
              Em breve poderá partilhar e descobrir recursos educacionais
              criados por outros professores.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="text-left">
              <h3 className="text-xl font-semibold text-[#0B0D17] mb-3">
                ✨ Funcionalidades
              </h3>
              <ul className="space-y-2 text-sm text-[#6C6F80]">
                <li>• Partilhar planos de aula</li>
                <li>• Avaliar recursos de outros</li>
                <li>• Ganhar pontos de impacto</li>
                <li>• Sistema de badges</li>
              </ul>
            </div>

            <div className="text-left">
              <h3 className="text-xl font-semibold text-[#0B0D17] mb-3">
                🎯 Benefícios
              </h3>
              <ul className="space-y-2 text-sm text-[#6C6F80]">
                <li>• Economizar tempo</li>
                <li>• Inspiração para aulas</li>
                <li>• Rede de professores</li>
                <li>• Reconhecimento da comunidade</li>
              </ul>
            </div>
          </div>

          <div className="mt-8">
            <Button className="bg-[#6753FF] hover:bg-[#4E3BC0] text-white px-8 py-3">
              <Users className="h-5 w-5 mr-2" />
              Ser Notificado
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
