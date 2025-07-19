"use client";

import MainLayout from "@/components/layout/MainLayout";
import RagQuery from "@/components/RagQuery";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  createClientComponentClient,
  type User,
} from "@supabase/auth-helpers-nextjs";
import { ArrowRight, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface UserProfile {
  credits_remaining: number;
  xp_points: number;
}



export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchUserData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setUser(user);

      // Buscar perfil do utilizador
      const { data: profileData } = await supabase
        .from("user_profiles")
        .select("credits_remaining, xp_points")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }



      setLoading(false);
    };

    fetchUserData();
  }, [supabase, router]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg text-[#6C6F80]">A carregar...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header com boas-vindas */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-[#6753FF] mb-2">
            Bem-vindo ao Scooli, {user?.user_metadata?.full_name}!
          </h1>
          <p className="text-lg text-[#6C6F80]">
            Crie conteúdo educacional de qualidade em segundos.
          </p>
        </div>

        {/* Cards de informação do utilizador */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-xl font-semibold text-[#0B0D17] mb-2">
              Créditos Disponíveis
            </h3>
            <div className="text-3xl font-bold text-[#6753FF]">
              {profile?.credits_remaining || 0}
            </div>
            <p className="text-sm text-[#6C6F80] mt-1">
              Use créditos para gerar conteúdo educacional
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="text-xl font-semibold text-[#0B0D17] mb-2">
              Pontos de Impacto
            </h3>
            <div className="text-3xl font-bold text-[#1DB67D]">
              {profile?.xp_points || 0}
            </div>
            <p className="text-sm text-[#6C6F80] mt-1">
              Ganhe pontos partilhando recursos na comunidade
            </p>
          </Card>
        </div>

        {/* Área de geração de conteúdo */}
        <Card className="p-8">
          <h2 className="text-3xl font-semibold text-[#0B0D17] mb-4">
            Gerar Novo Conteúdo
          </h2>
          <p className="text-base text-[#6C6F80] mb-6">
            Escolha o tipo de conteúdo educacional que pretende criar:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => router.push("/lesson-plan")}
            >
              <span className="text-2xl">📄</span>
              <span>Plano de Aula</span>
            </Button>
            <Button
              className="h-20 flex flex-col items-center justify-center space-y-2"
              disabled
            >
              <span className="text-2xl">📊</span>
              <span>Apresentação</span>
            </Button>
            <Button
              className="h-20 flex flex-col items-center justify-center space-y-2"
              disabled
            >
              <span className="text-2xl">📝</span>
              <span>Teste/Quiz</span>
            </Button>
            <Button
              className="h-20 flex flex-col items-center justify-center space-y-2"
              disabled
            >
              <span className="text-2xl">🎯</span>
              <span>Atividades</span>
            </Button>
          </div>
          <p className="text-sm text-[#6C6F80] mt-4 text-center">
            Em desenvolvimento - Brevemente disponível!
          </p>
        </Card>

        {/* Documents Gallery Preview */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <FileText className="w-6 h-6 text-[#6753FF]" />
              <h2 className="text-xl font-semibold text-[#0B0D17]">
                Os Meus Documentos
              </h2>
            </div>
            <Button 
              onClick={() => router.push("/documents")}
              className="flex items-center space-x-2 px-4 py-2 text-sm"
            >
              <span>Ver Todos</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-sm text-[#6C6F80] mb-6">
            Aceda a todos os seus planos de aula, avaliações e atividades criadas.
          </p>
          
          {/* Show mini gallery or link */}
          <div className="bg-[#F4F5F8] rounded-xl p-6 text-center">
            <div className="text-4xl mb-3">📚</div>
            <h3 className="font-medium text-[#0B0D17] mb-2">
              Biblioteca de Documentos
            </h3>
            <p className="text-sm text-[#6C6F80] mb-4">
              Organize, filtre e aceda rapidamente a todos os seus recursos educacionais.
            </p>
            <Button 
              onClick={() => router.push("/documents")}
              className="w-full"
            >
              <FileText className="w-4 h-4 mr-2" />
              Explorar Documentos
            </Button>
          </div>
        </Card>

        {/* Assistente Curricular RAG */}
        <RagQuery />
      </div>
    </MainLayout>
  );
}
