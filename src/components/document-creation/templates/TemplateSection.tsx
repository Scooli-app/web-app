"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { getTemplates, setDefaultTemplate } from "@/services/api/template.service";
import type { DocumentTemplate, DocumentType } from "@/shared/types";
import { LoadError } from "@/components/ui/load-error";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { TemplateBrowserModal } from "./TemplateBrowserModal";
import { OptionRow } from "../sections/FormCard";

interface TemplateSectionProps {
  documentType: DocumentType;
  selectedTemplateId: string | null;
  onTemplateSelect: (template: DocumentTemplate) => void;
  requireExplicitSelection?: boolean;
  /** Reports how many templates this teacher has once the list loads or changes. */
  onTemplateCountChange?: (count: number) => void;
}

export function TemplateSection({
  documentType,
  selectedTemplateId,
  onTemplateSelect,
  requireExplicitSelection = false,
  onTemplateCountChange,
}: TemplateSectionProps) {
  const t = useTranslations("documentCreation.template");
  const tModal = useTranslations("documentCreation.templateBrowserModal");
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] =
    useState<DocumentTemplate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadTemplates() {
      setIsLoading(true);
      setLoadFailed(false);
      try {
        const data = await getTemplates(documentType);
        if (cancelled) {
          return;
        }
        setTemplates(data);
      } catch (error) {
        console.error("Failed to load templates:", error);
        if (!cancelled) setLoadFailed(true);
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
  }, [documentType, retryKey]);

  useEffect(() => {
    if (!isLoading && !loadFailed) onTemplateCountChange?.(templates.length);
  }, [isLoading, loadFailed, templates.length, onTemplateCountChange]);

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

  // One row inside "Mais opções": the chosen template, and "Mudar" to browse or create one.
  if (isLoading) {
    return (
      <OptionRow label={t("title")}>
        <Skeleton className="h-9 rounded-lg" />
      </OptionRow>
    );
  }

  if (loadFailed) {
    return (
      <OptionRow label={t("title")}>
        <LoadError onRetry={() => setRetryKey((n) => n + 1)} />
      </OptionRow>
    );
  }

  return (
    <>
      <OptionRow label={t("title")}>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex w-full min-w-0 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left text-sm transition-colors hover:border-primary/50 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label={selectedTemplate ? t("selectedAriaLabel", { name: selectedTemplate.name }) : t("selectAriaLabel")}
        >
          <span className="min-w-0 flex-1 truncate">
            {selectedTemplate ? (
              <>
                <span className="font-medium text-foreground">{selectedTemplate.name}</span>
                <span className="text-muted-foreground"> · {t("sectionsCount", { count: selectedTemplate.sections.length })}</span>
              </>
            ) : (
              <span className="text-muted-foreground">{templates.length === 0 ? tModal("noTemplatesTitle") : t("selectTemplate")}</span>
            )}
          </span>
          <span className="shrink-0 text-xs font-semibold text-primary">
            {templates.length === 0 ? tModal("createModel") : t("changeCta")}
          </span>
        </button>
      </OptionRow>

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
