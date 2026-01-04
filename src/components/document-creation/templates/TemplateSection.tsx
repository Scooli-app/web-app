"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { getTemplates, setDefaultTemplate } from "@/services/api/template.service";
import { TemplateBrowserModal } from "./TemplateBrowserModal";
import { TemplateEmptyState } from "./TemplateEmptyState";

interface TemplateSectionProps {
  documentType: DocumentType;
  selectedTemplateId: string | null;
  onTemplateSelect: (template: DocumentTemplate) => void;
}

export function TemplateSection({
  documentType,
  selectedTemplateId,
  onTemplateSelect,
}: TemplateSectionProps) {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] =
    useState<DocumentTemplate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch templates when documentType changes
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

  // Auto-select default template when templates load and nothing is selected
  useEffect(() => {
    if (templates.length === 0 || selectedTemplateId) {
      return;
    }

    const defaultTemplate = templates.find((t) => t.isDefault) || templates[0];
    setSelectedTemplate(defaultTemplate);
    onTemplateSelect(defaultTemplate);
  }, [templates, selectedTemplateId, onTemplateSelect]);

  // Sync local state when selectedTemplateId prop changes
  useEffect(() => {
    if (!selectedTemplateId || templates.length === 0) {
      return;
    }

    const found = templates.find((t) => t.id === selectedTemplateId);
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
        prev.map((t) => (t.id === template.id ? template : t))
      );
    } else {
      setTemplates((prev) => [...prev, template]);
    }
    handleTemplateSelect(template);
  };

  const handleSetDefault = async (template: DocumentTemplate) => {
    try {
      const updatedTemplate = await setDefaultTemplate(template.id);
      
      // Update all templates - remove default from others, set on the new one
      setTemplates((prev) =>
        prev.map((t) => ({
          ...t,
          isDefault: t.id === updatedTemplate.id,
        }))
      );
      
      // Update selected template if it's the one being set as default
      if (selectedTemplate?.id === updatedTemplate.id) {
        setSelectedTemplate(updatedTemplate);
      } else if (selectedTemplate?.isDefault) {
        // If the currently selected template was the default, update it
        setSelectedTemplate((prev) => prev ? { ...prev, isDefault: false } : null);
      }
    } catch (error) {
      console.error("Failed to set default template:", error);
      throw error;
    }
  };

  if (isLoading) {
    return (
      <Card className="p-4 sm:p-6 border-[#E4E4E7] shadow-sm">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#EEF0FF] shrink-0">
              <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-[#6753FF]" />
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-[#0B0D17]">
              Modelo de Documento <span className="text-red-500">*</span>
            </h2>
          </div>
          <div className="h-24 bg-[#F4F5F8] rounded-xl animate-pulse" />
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
      <Card className="p-4 sm:p-6 border-[#E4E4E7] shadow-sm hover:shadow-md transition-shadow">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#EEF0FF] shrink-0">
                <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-[#6753FF]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-semibold text-[#0B0D17]">
                  Modelo de Documento <span className="text-red-500">*</span>
                </h2>
                <p className="text-xs sm:text-sm text-[#6C6F80]">
                  Escolha a estrutura do seu documento
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="hidden sm:flex items-center gap-2 border-[#C7C9D9] text-[#2E2F38] hover:bg-[#EEF0FF] hover:border-[#6753FF] rounded-xl"
              aria-label="Procurar modelos"
            >
              <Search className="w-4 h-4" />
              Procurar
            </Button>
          </div>

          {selectedTemplate && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className={cn(
                "w-full p-4 rounded-xl border-2 text-left transition-all",
                "bg-[#EEF0FF] border-[#6753FF] hover:shadow-md",
                "focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              )}
              aria-label={`Modelo selecionado: ${selectedTemplate.name}. Clique para alterar.`}
            >
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white shrink-0">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-[#6753FF]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-[#0B0D17] text-sm sm:text-base">
                      {selectedTemplate.name}
                    </h3>
                    {selectedTemplate.isSystem ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-gradient-to-r from-[#6753FF] to-[#8B7AFF] text-white">
                        <Sparkles className="w-2.5 h-2.5" />
                        Scooli
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-[#F4F5F8] text-[#6C6F80]">
                        Personalizado
                      </span>
                    )}
                    {selectedTemplate.isDefault && (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-[#1DB67D] text-white">
                        Padrão
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-[#6C6F80] line-clamp-2">
                    {selectedTemplate.description}
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-[#6C6F80]">
                    <span>{selectedTemplate.sections.length} secções</span>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-[#6753FF] font-medium">
                      Clique para alterar
                    </span>
                  </div>
                </div>
              </div>
            </button>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={() => setIsModalOpen(true)}
            className="sm:hidden w-full flex items-center justify-center gap-2 border-[#C7C9D9] text-[#2E2F38] hover:bg-[#EEF0FF] hover:border-[#6753FF] rounded-xl h-11"
            aria-label="Procurar modelos"
          >
            <Search className="w-4 h-4" />
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

