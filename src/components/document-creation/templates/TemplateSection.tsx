"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getTemplates, setDefaultTemplate } from "@/services/api/template.service";
import type { DocumentTemplate, DocumentType } from "@/shared/types";
import { cn } from "@/shared/utils/utils";
import {
  ChevronRight,
  FileText,
  Layers,
  Search,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { TemplateBrowserModal } from "./TemplateBrowserModal";
import { TemplateEmptyState } from "./TemplateEmptyState";

interface TemplateSectionProps {
  documentType: DocumentType;
  selectedTemplateId: string | null;
  onTemplateSelect: (template: DocumentTemplate) => void;
  requireExplicitSelection?: boolean;
}

export function TemplateSection({
  documentType,
  selectedTemplateId,
  onTemplateSelect,
  requireExplicitSelection = false,
}: TemplateSectionProps) {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] =
    useState<DocumentTemplate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadTemplates() {
      setIsLoading(true);
      try {
        const data = await getTemplates(documentType);
        if (cancelled) {
          return;
        }
        setTemplates(data);
      } catch (error) {
        console.error("Failed to load templates:", error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadTemplates();
    return () => {
      cancelled = true;
    };
  }, [documentType]);

  useEffect(() => {
    if (requireExplicitSelection || templates.length === 0 || selectedTemplateId) {
      return;
    }

    const defaultTemplate = templates.find((template) => template.isDefault) || templates[0];
    setSelectedTemplate(defaultTemplate);
    onTemplateSelect(defaultTemplate);
  }, [templates, selectedTemplateId, onTemplateSelect, requireExplicitSelection]);

  useEffect(() => {
    if (!selectedTemplateId || templates.length === 0) {
      if (!selectedTemplateId) {
        setSelectedTemplate(null);
      }
      return;
    }

    const found = templates.find((template) => template.id === selectedTemplateId);
    if (found && found.id !== selectedTemplate?.id) {
      setSelectedTemplate(found);
    }
  }, [selectedTemplateId, templates, selectedTemplate?.id]);

  const handleTemplateSelect = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    onTemplateSelect(template);
    setIsModalOpen(false);
  };

  const handleTemplateSaved = (template: DocumentTemplate, isUpdate: boolean) => {
    if (isUpdate) {
      setTemplates((prev) =>
        prev.map((currentTemplate) =>
          currentTemplate.id === template.id ? template : currentTemplate
        )
      );
    } else {
      setTemplates((prev) => [...prev, template]);
    }
    handleTemplateSelect(template);
  };

  const handleSetDefault = async (template: DocumentTemplate) => {
    try {
      const updatedTemplate = await setDefaultTemplate(template.id);

      setTemplates((prev) =>
        prev.map((currentTemplate) => ({
          ...currentTemplate,
          isDefault: currentTemplate.id === updatedTemplate.id,
        }))
      );

      if (selectedTemplate?.id === updatedTemplate.id) {
        setSelectedTemplate(updatedTemplate);
      } else if (selectedTemplate?.isDefault) {
        setSelectedTemplate((prev) =>
          prev ? { ...prev, isDefault: false } : null
        );
      }
    } catch (error) {
      console.error("Failed to set default template:", error);
      throw error;
    }
  };

  if (isLoading) {
    return (
      <Card className="border-border p-4 shadow-sm sm:p-6">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent sm:h-10 sm:w-10 sm:rounded-xl">
              <Layers className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
            </div>
            <h2 className="text-base font-semibold text-foreground sm:text-lg">
              Modelo de Documento <span className="text-destructive">*</span>
            </h2>
          </div>
          <div className="h-24 rounded-xl bg-muted animate-pulse" />
        </div>
      </Card>
    );
  }

  if (templates.length === 0) {
    return (
      <>
        <TemplateEmptyState onCreateTemplate={() => setIsModalOpen(true)} />

        <TemplateBrowserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          documentType={documentType}
          templates={templates}
          selectedTemplateId={null}
          onTemplateSelect={handleTemplateSelect}
          onTemplateSaved={handleTemplateSaved}
          onSetDefault={handleSetDefault}
        />
      </>
    );
  }

  return (
    <>
      <Card className="border-border p-4 shadow-sm transition-shadow hover:shadow-md sm:p-6">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent sm:h-10 sm:w-10 sm:rounded-xl">
                <Layers className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-foreground sm:text-lg">
                  Modelo de Documento <span className="text-destructive">*</span>
                </h2>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Escolha a estrutura do seu documento
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="hidden items-center gap-2 rounded-xl border-border text-foreground hover:border-primary hover:bg-accent sm:flex"
              aria-label="Procurar modelos"
            >
              <Search className="h-4 w-4" />
              Procurar
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className={cn(
              "w-full rounded-xl border-2 p-4 text-left transition-all",
              selectedTemplate
                ? "border-primary bg-accent hover:shadow-md"
                : "border-dashed border-border bg-muted/30 hover:border-primary/50 hover:bg-accent/40",
              "focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            )}
            aria-label={
              selectedTemplate
                ? `Modelo selecionado: ${selectedTemplate.name}. Clique para alterar.`
                : "Selecionar modelo de documento"
            }
          >
            {selectedTemplate ? (
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card sm:h-12 sm:w-12">
                  <FileText className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground sm:text-base">
                      {selectedTemplate.name}
                    </h3>
                    {selectedTemplate.isSystem ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary to-primary/70 px-2 py-0.5 text-[10px] font-medium text-primary-foreground sm:text-xs">
                        <Sparkles className="h-2.5 w-2.5" />
                        Scooli
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground sm:text-xs">
                        Personalizado
                      </span>
                    )}
                    {selectedTemplate.isDefault && (
                      <span className="inline-flex rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-medium text-white sm:text-xs">
                        Padrão
                      </span>
                    )}
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground sm:text-sm">
                    {selectedTemplate.description}
                  </p>
                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <span>{selectedTemplate.sections.length} secções</span>
                    <ChevronRight className="h-3 w-3" />
                    <span className="font-medium text-primary">Clique para alterar</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-card text-primary shadow-sm">
                  <Layers className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground sm:text-base">
                    Selecionar modelo
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    Escolha explicitamente o modelo que melhor se adapta a esta ficha.
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                    <span>Ver modelos disponíveis</span>
                    <ChevronRight className="h-3 w-3" />
                  </div>
                </div>
              </div>
            )}
          </button>

          <Button
            type="button"
            variant="outline"
            onClick={() => setIsModalOpen(true)}
            className="h-11 w-full items-center justify-center gap-2 rounded-xl border-border text-foreground hover:border-primary hover:bg-accent sm:hidden"
            aria-label="Procurar modelos"
          >
            <Search className="h-4 w-4" />
            Procurar outros modelos
          </Button>
        </div>
      </Card>

      <TemplateBrowserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        documentType={documentType}
        templates={templates}
        selectedTemplateId={selectedTemplate?.id || null}
        onTemplateSelect={handleTemplateSelect}
        onTemplateSaved={handleTemplateSaved}
        onSetDefault={handleSetDefault}
      />
    </>
  );
}
