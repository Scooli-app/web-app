"use client";

import { Button } from "@/frontend/components/ui/button";
import { Card } from "@/frontend/components/ui/card";
import { Input } from "@/frontend/components/ui/input";
import { useAuthStore } from "@/frontend/stores/auth.store";
import { useDocumentStore } from "@/frontend/stores/document.store";
import { Routes } from "@/shared/types/routes";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LessonPlanPage() {
  const { user, isLoading: authLoading } = useAuthStore();
  const router = useRouter();
  const [initialPrompt, setInitialPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { setPendingInitialPrompt, createDocument } = useDocumentStore();

  const handleCreateDocument = async () => {
    if (!initialPrompt.trim()) {
      setError("Por favor, introduza uma descrição do plano de aula");
      return;
    }

    if (!user) {
      setError("Utilizador não autenticado");
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const newDoc = await createDocument(
        {
          title: `Plano de Aula - ${new Date().toLocaleDateString("pt-PT")}`,
          content: "",
          document_type: "lesson_plan",
          is_public: false,
          metadata: {
            initial_prompt: initialPrompt,
          },
        },
        user.id
      );

      if (newDoc) {
        setPendingInitialPrompt(newDoc.id, initialPrompt);
        router.push(Routes.LESSON_PLAN_EDITOR.replace(":id", newDoc.id));
      }
    } catch (error) {
      console.error("Failed to create document:", error);

      // More specific error messages
      if (error instanceof Error) {
        if (error.message.includes("not authenticated")) {
          setError("Erro de autenticação. Por favor, faça login novamente.");
        } else if (error.message.includes("violates row-level security")) {
          setError("Erro de permissão. Verifique se está autenticado.");
        } else {
          setError(`Erro ao criar o documento: ${error.message}`);
        }
      } else {
        setError("Erro ao criar o documento. Verifique se está autenticado.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] w-full">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#6753FF]" />
          <span className="text-lg text-[#6C6F80]">A carregar...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#0B0D17] mb-4">
            Criar Plano de Aula
          </h1>
          <p className="text-lg text-[#6C6F80]">
            Descreva o que pretende ensinar e o Scooli irá gerar um plano de
            aula completo
          </p>
        </div>

        <Card className="p-8 max-w-2xl mx-auto">
          <div className="space-y-6">
            <div>
              <label
                htmlFor="prompt"
                className="block text-sm font-medium text-[#2E2F38] mb-2"
              >
                Descrição do Plano de Aula
              </label>
              <Input
                id="prompt"
                value={initialPrompt}
                onChange={(e) => setInitialPrompt(e.target.value)}
                placeholder="Ex: Plano de aula sobre frações para o 3º ano, incluindo atividades práticas e avaliação"
                className="w-full"
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !isLoading) {
                    handleCreateDocument();
                  }
                }}
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                {error}
              </div>
            )}

            <Button
              onClick={handleCreateDocument}
              disabled={isLoading || !initialPrompt.trim()}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />A criar
                  documento...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Plano de Aula
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
