"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getUploadUrl } from "@/services/api/document.service";
import { createTemplateFromDocument } from "@/services/api/template.service";
import type { DocumentTemplate, DocumentType } from "@/shared/types";
import { cn } from "@/shared/utils/utils";
import {
  AlertCircle,
  ArrowLeft,
  FilePlus,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";
import { useRef, useState } from "react";

interface TemplateFromDocumentCreatorProps {
  documentType: DocumentType;
  onBack: () => void;
  onTemplateSaved: (template: DocumentTemplate, isUpdate: boolean) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export function TemplateFromDocumentCreator({
  documentType,
  onBack,
  onTemplateSaved,
}: TemplateFromDocumentCreatorProps) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSetFile = (selectedFile: File) => {
    setError(null);
    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setError("Apenas ficheiros PDF e DOCX são suportados.");
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("O tamanho máximo do ficheiro é 10MB.");
      return;
    }
    setFile(selectedFile);
    if (!name) {
      setName(selectedFile.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) validateAndSetFile(selectedFile);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) validateAndSetFile(droppedFile);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || !name.trim()) return;

    try {
      setIsProcessing(true);
      setError(null);

      const { uploadUrl, fileKey } = await getUploadUrl(
        file.name,
        file.type,
        documentType
      );

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Falha ao carregar o ficheiro para o armazenamento.");
      }

      const template = await createTemplateFromDocument({
        fileKey,
        documentType,
        name: name.trim(),
      });

      onTemplateSaved(template, false);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocorreu um erro ao criar o modelo. Tente novamente."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const isFormValid = !!file && !!name.trim();

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4 pb-4 sm:p-6 sm:pb-4">
        <button
          type="button"
          onClick={onBack}
          disabled={isProcessing}
          className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary disabled:pointer-events-none disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <UploadCloud className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground sm:text-lg">
              Criar Modelo a partir de Documento
            </h2>
            <p className="text-xs text-muted-foreground sm:text-sm">
              A IA vai analisar o documento e gerar a estrutura do modelo.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          <div
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 transition-all",
              file
                ? "border-primary/40 bg-primary/5"
                : "border-border hover:border-primary/40 hover:bg-muted/50",
              error && !file && "border-destructive/50 bg-destructive/5",
              isProcessing && "pointer-events-none opacity-60"
            )}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              type="file"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              disabled={isProcessing}
            />

            {file ? (
              <div className="flex w-full items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <FilePlus className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  disabled={isProcessing}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-center">
                <UploadCloud className="h-7 w-7 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">
                  Clique ou arraste o ficheiro
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF ou DOCX · Máx. 10MB
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p className="text-xs">{error}</p>
            </div>
          )}

          {isProcessing && (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-4">
              <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  A analisar o documento...
                </p>
                <p className="text-xs text-muted-foreground">
                  A IA está a gerar a estrutura do modelo. Pode demorar alguns
                  segundos.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="template-from-doc-name" className="text-sm">
              Nome do Modelo
            </Label>
            <Input
              id="template-from-doc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Plano de Aula — Frações"
              disabled={isProcessing}
            />
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/60 p-3">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Imagens e formatação complexa poderão não ser preservadas.
              Documentos digitalizados sem texto legível serão rejeitados.
            </p>
          </div>
        </div>

        <div className="border-t border-border bg-muted/50 p-4 pt-3 sm:p-6 sm:pt-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              disabled={isProcessing}
              className="h-11 rounded-xl border-border text-secondary-foreground hover:border-primary hover:bg-accent sm:flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid || isProcessing}
              className="h-11 rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 sm:flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A processar...
                </>
              ) : (
                <>
                  <UploadCloud className="mr-2 h-4 w-4" />
                  Criar Modelo
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
