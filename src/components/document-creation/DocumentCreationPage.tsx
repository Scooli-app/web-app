import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { DocumentType } from "@/shared/types/domain/document";
import {
  createDocument,
  setPendingInitialPrompt,
} from "@/store/documents/documentSlice";
import { useAppDispatch } from "@/store/hooks";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export interface DocumentTypeConfig {
  id: DocumentType;
  title: string;
  description: string;
  placeholder: string;
  redirectPath: string;
  generateTitlePrefix: string;
}

interface DocumentCreationPageProps {
  documentType: DocumentTypeConfig;
  userId?: string;
}

export default function DocumentCreationPage({
  documentType,
  userId = "",
}: DocumentCreationPageProps) {
  const router = useRouter();
  const [initialPrompt, setInitialPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const dispatch = useAppDispatch();

  const handleCreateDocument = async () => {
    if (!initialPrompt.trim()) {
      setError(
        `Por favor, introduza uma descrição do ${documentType.title.toLowerCase()}`
      );
      return;
    }

    if (!userId) {
      setError("User ID é necessário");
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const resultAction = await dispatch(
        createDocument({
          data: {
            title: `${
              documentType.generateTitlePrefix
            } - ${new Date().toLocaleDateString("pt-PT")}`,
            content: "",
            documentType: documentType.id,
            isPublic: false,
            metadata: {
              initialPrompt: initialPrompt,
            },
          },
          userId: userId,
        })
      );

      if (createDocument.fulfilled.match(resultAction)) {
        const newDoc = resultAction.payload;
        dispatch(
          setPendingInitialPrompt({
            documentId: newDoc.id,
            prompt: initialPrompt,
          })
        );
        const redirectUrl = documentType.redirectPath.replace(":id", newDoc.id);
        router.push(redirectUrl);
      } else {
        setError(
          (resultAction.payload as string) ||
            "Ocorreu um erro ao criar o documento."
        );
      }
    } catch (error) {
      console.error("Failed to create document:", error);

      // More specific error messages
      if (error instanceof Error) {
        setError(`Erro ao criar o documento: ${error.message}`);
      } else {
        setError("Erro ao criar o documento.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#0B0D17] mb-4">
            Criar {documentType.title}
          </h1>
          <p className="text-lg text-[#6C6F80]">{documentType.description}</p>
        </div>

        <Card className="p-8 max-w-2xl mx-auto">
          <div className="space-y-6">
            <div>
              <label
                htmlFor="prompt"
                className="block text-sm font-medium text-[#2E2F38] mb-2"
              >
                Descrição do {documentType.title}
              </label>
              <Input
                id="prompt"
                value={initialPrompt}
                onChange={(e) => setInitialPrompt(e.target.value)}
                placeholder={documentType.placeholder}
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
                  Criar {documentType.title}
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
