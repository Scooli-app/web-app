"use client";

import { useSupabase } from "@/components/providers/SupabaseProvider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DocumentService } from "@/lib/services/document-service";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LessonPlanPage() {
  const { user, loading } = useSupabase();
  const router = useRouter();
  const [initialPrompt, setInitialPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const documentService = new DocumentService();

  const handleCreateDocument = async () => {
    if (!initialPrompt.trim()) {
      setError("Por favor, introduza uma descrição do plano de aula");
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const newDocument = await documentService.createDocument({
        title: `Plano de Aula - ${new Date().toLocaleDateString("pt-PT")}`,
        content: "",
        document_type: "lesson_plan",
        metadata: {
          initial_prompt: initialPrompt,
        },
      });

      // Redirect to the new document page
      router.push(`/lesson-plan/${newDocument.id}`);
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
      <div className="min-h-screen bg-[#EEF0FF] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#6753FF]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EEF0FF] p-6">
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
