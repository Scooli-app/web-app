"use client";

import { useSupabase } from "@/frontend/components/providers/SupabaseProvider";
import { Button } from "@/frontend/components/ui/button";
import { Card } from "@/frontend/components/ui/card";
import { Input } from "@/frontend/components/ui/input";
import { useDocumentStore } from "@/frontend/stores/document.store";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function QuizPage() {
  const { user, loading } = useSupabase();
  const router = useRouter();
  const [initialPrompt, setInitialPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { setPendingInitialPrompt, createDocument } = useDocumentStore();

  const handleCreateDocument = async () => {
    if (!initialPrompt.trim()) {
      setError("Por favor, introduza uma descrição do quiz");
      return;
    }

    if (!user) {
      setError("Utilizador não autenticado");
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      await createDocument({
        title: `Quiz - ${new Date().toLocaleDateString("pt-PT")}`,
        content: "",
        document_type: "quiz",
        tags: [],
        is_public: false,
      }, user.id);

      // We need to get the created document ID from the store
      // For now, let's create a temporary ID and redirect - the store will handle the creation
      const tempId = `temp-${Date.now()}`;
      setPendingInitialPrompt(tempId, initialPrompt);

      // Note: This needs to be improved to get the actual document ID
      // For now, redirect to the documents page
      router.push("/documents");
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

  // Redirect if not authenticated
  if (!loading && !user) {
    router.push("/login");
    return null;
  }

  if (loading) {
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
          <h1 className="text-4xl font-bold text-[#0B0D17] mb-4">Criar Quiz</h1>
          <p className="text-lg text-[#6C6F80]">
            Descreva o que pretende avaliar e o Scooli irá gerar um quiz
            interativo
          </p>
        </div>

        <Card className="p-8 max-w-2xl mx-auto">
          <div className="space-y-6">
            <div>
              <label
                htmlFor="prompt"
                className="block text-sm font-medium text-[#2E2F38] mb-2"
              >
                Descrição do Quiz
              </label>
              <Input
                id="prompt"
                value={initialPrompt}
                onChange={(e) => setInitialPrompt(e.target.value)}
                placeholder="Ex: Quiz sobre história de Portugal para o 2º ciclo, com 15 questões de escolha múltipla"
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
                  Criar Quiz
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
