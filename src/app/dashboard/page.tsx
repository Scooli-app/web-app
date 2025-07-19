"use client";

import MainLayout from "@/components/layout/MainLayout";
import RagQuery from "@/components/RagQuery";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  createClientComponentClient,
  type User,
} from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface UserProfile {
  credits_remaining: number;
  xp_points: number;
}

interface GeneratedContent {
  id: number;
  content_type: string;
  prompt: string;
  generated_text: string;
  created_at: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>(
    []
  );
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

      // Buscar conteúdo gerado pelo utilizador
      const { data: contentData } = await supabase
        .from("generated_content")
        .select("id, content_type, prompt, generated_text, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (contentData) {
        setGeneratedContent(contentData);
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

        {/* Conteúdo gerado recentemente */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-[#0B0D17] mb-4">
            Conteúdo Recente
          </h2>
          {generatedContent.length > 0 ? (
            <div className="space-y-4">
              {generatedContent.map((content) => (
                <div
                  key={content.id}
                  className="border border-[#C7C9D9] rounded-xl p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-[#0B0D17]">
                      {content.content_type}
                    </h3>
                    <span className="text-xs text-[#6C6F80]">
                      {new Date(content.created_at).toLocaleDateString("pt-PT")}
                    </span>
                  </div>
                  <p className="text-sm text-[#6C6F80] mb-2">
                    {content.prompt}
                  </p>
                  <p className="text-sm text-[#2E2F38] line-clamp-3">
                    {content.generated_text.substring(0, 150)}...
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-[#6C6F80]">Ainda não gerou nenhum conteúdo.</p>
              <p className="text-sm text-[#6C6F80] mt-1">
                Comece por criar o seu primeiro recurso educacional!
              </p>
            </div>
          )}
        </Card>

        {/* Assistente Curricular RAG */}
        <RagQuery />
      </div>
    </MainLayout>
  );
}
