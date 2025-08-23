"use client";

import { useAppSelector } from "@/store/hooks";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  const {
    user,
    profile,
    isLoading: authLoading,
    isAuthenticated,
    isInitialized,
  } = useAppSelector((state) => state.auth);

  if (authLoading || !isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-[400px] w-full">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#6753FF]" />
          <span className="text-lg text-[#6C6F80]">A carregar...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-[#0B0D17] mb-2">
          Bem-vindo de volta{user.name ? `, ${user.name}` : ""}!
        </h1>
        <p className="text-lg text-[#6C6F80]">
          Aqui está o que pode fazer hoje na Scooli.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-md border border-[#E4E4E7]">
          <h3 className="text-xl font-semibold text-[#0B0D17] mb-2">
            Créditos Restantes
          </h3>
          <p className="text-3xl font-bold text-[#6753FF]">
            {profile?.credits_remaining ?? 0}
          </p>
          <p className="text-sm text-[#6C6F80]">
            Créditos disponíveis para gerar conteúdo
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-md border border-[#E4E4E7]">
          <h3 className="text-xl font-semibold text-[#0B0D17] mb-2">
            Pontos XP
          </h3>
          <p className="text-3xl font-bold text-[#1DB67D]">
            {profile?.xp_points ?? 0}
          </p>
          <p className="text-sm text-[#6C6F80]">
            Pontos ganhos por contribuições
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-md border border-[#E4E4E7]">
          <h3 className="text-xl font-semibold text-[#0B0D17] mb-2">
            Tipo de Conta
          </h3>
          <p className="text-lg font-medium text-[#2E2F38]">
            {profile?.role_name === "teacher" && "Professor"}
            {profile?.role_name === "curator" && "Curador"}
            {profile?.role_name === "admin" && "Administrador"}
            {profile?.role_name === "super_admin" && "Super Admin"}
          </p>
          <p className="text-sm text-[#6C6F80]">Conta verificada e ativa</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-2xl shadow-md border border-[#E4E4E7]">
          <h2 className="text-2xl font-semibold text-[#0B0D17] mb-4">
            Ações Rápidas
          </h2>
          <div className="space-y-3">
            <button
              onClick={() => router.push("/lesson-plan")}
              className="w-full bg-[#6753FF] hover:bg-[#4E3BC0] text-white px-5 py-3 rounded-xl font-medium transition-colors"
            >
              Criar Plano de Aula
            </button>
            <button
              onClick={() => router.push("/assays")}
              className="w-full border border-[#C7C9D9] text-[#0B0D17] bg-white hover:bg-[#EEF0FF] px-5 py-3 rounded-xl font-medium transition-colors"
            >
              Gerar Teste
            </button>
            <button
              onClick={() => router.push("/quiz")}
              className="w-full border border-[#C7C9D9] text-[#0B0D17] bg-white hover:bg-[#EEF0FF] px-5 py-3 rounded-xl font-medium transition-colors"
            >
              Criar Quiz
            </button>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-md border border-[#E4E4E7]">
          <h2 className="text-2xl font-semibold text-[#0B0D17] mb-4">
            Atividade Recente
          </h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-[#6753FF] rounded-full" />
              <span className="text-[#2E2F38]">Conta criada</span>
            </div>
            <p className="text-sm text-[#6C6F80] pl-5">
              Bem-vindo à Scooli! Comece por explorar as funcionalidades.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
