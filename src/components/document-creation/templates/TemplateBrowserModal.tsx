"use client";

import { Button } from "@/components/ui/button";
import { UnsavedChangesDialog } from "@/components/ui/confirmation-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DocumentTemplate, DocumentType } from "@/shared/types";
import { cn } from "@/shared/utils/utils";
import {
  Check,
  ChevronRight,
  FileText,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Star,
} from "lucide-react";
import { useCallback, useState } from "react";
import { TemplateCard } from "./TemplateCard";
import { TemplateCreator } from "./TemplateCreator";

type ModalView = "browse" | "create" | "preview" | "edit";

interface TemplateBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: DocumentType;
  templates: DocumentTemplate[];
  selectedTemplateId: string | null;
  onTemplateSelect: (template: DocumentTemplate) => void;
  onTemplateSaved: (template: DocumentTemplate, isUpdate: boolean) => void;
  onSetDefault: (template: DocumentTemplate) => Promise<void>;
}

export function TemplateBrowserModal({
  isOpen,
  onClose,
  documentType,
  templates,
  selectedTemplateId,
  onTemplateSelect,
  onTemplateSaved,
  onSetDefault,
}: TemplateBrowserModalProps) {
  const [view, setView] = useState<ModalView>("browse");
  const [previewTemplate, setPreviewTemplate] =
    useState<DocumentTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] =
    useState<DocumentTemplate | null>(null);
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(
    selectedTemplateId,
  );
  const [isCreatorDirty, setIsCreatorDirty] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingCloseAction, setPendingCloseAction] = useState<
    (() => void) | null
  >(null);
  const [isSettingDefault, setIsSettingDefault] = useState(false);

  const resetModalState = useCallback(() => {
    setView("browse");
    setPreviewTemplate(null);
    setEditingTemplate(null);
    setLocalSelectedId(selectedTemplateId);
    setIsCreatorDirty(false);
  }, [selectedTemplateId]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      const isInCreatorView = view === "create" || view === "edit";

      if (isInCreatorView && isCreatorDirty) {
        setPendingCloseAction(() => () => {
          onClose();
          setTimeout(resetModalState, 200);
        });
        setShowUnsavedDialog(true);
      } else {
        onClose();
        setTimeout(resetModalState, 200);
      }
    }
  };

  const handleConfirmUnsavedClose = () => {
    setShowUnsavedDialog(false);
    if (pendingCloseAction) {
      pendingCloseAction();
      setPendingCloseAction(null);
    }
  };

  const handleCancelUnsavedClose = () => {
    setShowUnsavedDialog(false);
    setPendingCloseAction(null);
  };

  const handleCreatorDirtyStateChange = useCallback((isDirty: boolean) => {
    setIsCreatorDirty(isDirty);
  }, []);

  const handleEditTemplate = (template: DocumentTemplate) => {
    if (!template.isSystem) {
      setEditingTemplate(template);
      setView("edit");
    }
  };

  const handleTemplateClick = (template: DocumentTemplate) => {
    setLocalSelectedId(template.id);
    setPreviewTemplate(template);
    setView("preview");
  };

  const handleConfirmSelection = () => {
    if (previewTemplate) {
      onTemplateSelect(previewTemplate);
    }
  };

  const handleBackToBrowse = () => {
    setView("browse");
    setPreviewTemplate(null);
  };

  const handleTemplateSaved = (
    template: DocumentTemplate,
    isUpdate: boolean,
  ) => {
    onTemplateSaved(template, isUpdate);
    setEditingTemplate(null);
    setIsCreatorDirty(false);
    setView("browse");
  };

  const getDocumentTypeLabel = (type: DocumentType): string => {
    const labels: Record<DocumentType, string> = {
      lessonPlan: "Planos de Aula",
      quiz: "Quizzes",
      test: "Testes",
      worksheet: "Fichas de Trabalho",
      presentation: "Apresentações",
    };
    return labels[type];
  };

  const handleSetDefault = async (template: DocumentTemplate) => {
    if (template.isDefault || isSettingDefault) {
      return;
    }

    setIsSettingDefault(true);
    try {
      await onSetDefault(template);
      if (previewTemplate?.id === template.id) {
        setPreviewTemplate({ ...template, isDefault: true });
      }
    } finally {
      setIsSettingDefault(false);
    }
  };

  return (
    <>
      <UnsavedChangesDialog
        isOpen={showUnsavedDialog}
        onClose={handleCancelUnsavedClose}
        onConfirm={handleConfirmUnsavedClose}
      />

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent
          className={cn(
            "flex h-[min(90dvh,820px)] max-h-[90dvh] w-[min(100%,44rem)] flex-col gap-0 overflow-scroll p-0",
          )}
          hideCloseButton={view === "create" || view === "edit"}
        >
          {view === "create" || view === "edit" ? (
            <TemplateCreator
              documentType={documentType}
              onBack={handleBackToBrowse}
              onTemplateSaved={handleTemplateSaved}
              editingTemplate={view === "edit" ? editingTemplate : null}
              onDirtyStateChange={handleCreatorDirtyStateChange}
            />
          ) : view === "preview" && previewTemplate ? (
            <>
              <DialogHeader className="p-4 pb-3 pr-12 sm:p-6 sm:pb-4 sm:pr-14">
                <div className="mb-2 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                  <button
                    type="button"
                    onClick={handleBackToBrowse}
                    className="transition-colors hover:text-primary"
                  >
                    Modelos
                  </button>
                  <ChevronRight className="h-4 w-4" />
                  <span className="font-medium text-foreground">
                    {previewTemplate.name}
                  </span>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent sm:h-12 sm:w-12">
                      <FileText className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <DialogTitle className="flex flex-wrap items-center gap-2">
                        {previewTemplate.name}
                        {previewTemplate.isSystem ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary to-primary/70 px-2 py-0.5 text-xs font-medium text-primary-foreground">
                            <Sparkles className="h-2.5 w-2.5" />
                            Scooli
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            Personalizado
                          </span>
                        )}
                        {previewTemplate.isDefault && (
                          <span className="inline-flex rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-medium text-white">
                            Padrao
                          </span>
                        )}
                      </DialogTitle>
                      <DialogDescription className="mt-1 line-clamp-2 sm:line-clamp-none">
                        {previewTemplate.description}
                      </DialogDescription>
                    </div>
                  </div>

                  <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                    {!previewTemplate.isDefault && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(previewTemplate)}
                        disabled={isSettingDefault}
                        className="h-9 flex-1 items-center gap-1.5 rounded-lg border-border text-secondary-foreground hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400 sm:h-8 sm:flex-none"
                        aria-label="Definir como padrao"
                      >
                        {isSettingDefault ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Star className="h-4 w-4" />
                        )}
                        <span>
                          {isSettingDefault ? "A definir..." : "Definir Padrao"}
                        </span>
                      </Button>
                    )}

                    {previewTemplate.isDefault && (
                      <div className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-50 px-3 text-sm font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 sm:h-8 sm:flex-none">
                        <Check className="h-4 w-4" />
                        <span>Padrao</span>
                      </div>
                    )}

                    {!previewTemplate.isSystem && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditTemplate(previewTemplate)}
                        className="h-9 flex-1 items-center gap-1.5 rounded-lg border-border text-secondary-foreground hover:border-primary hover:bg-accent sm:h-8 sm:flex-none"
                        aria-label="Editar modelo"
                      >
                        <Pencil className="h-4 w-4" />
                        <span>Editar</span>
                      </Button>
                    )}
                  </div>
                </div>
              </DialogHeader>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-6">
                <div className="space-y-3 pb-4 pt-0.5">
                  <h3 className="text-sm font-medium text-foreground">
                    Seccoes ({previewTemplate.sections.length})
                  </h3>
                  <div className="space-y-2">
                    {previewTemplate.sections
                      .sort((a, b) => a.order - b.order)
                      .map((section, index) => (
                        <div
                          key={section.id}
                          className="flex gap-2.5 rounded-xl bg-muted p-2.5 sm:gap-3 sm:p-3"
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-background text-sm font-semibold text-primary">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-medium text-foreground">
                              {section.title}
                            </h4>
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                              {section.description}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-border bg-muted/50 p-4 pt-3 sm:p-6 sm:pt-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBackToBrowse}
                    className="h-11 rounded-xl border-border text-secondary-foreground hover:border-primary hover:bg-accent sm:flex-1"
                  >
                    Ver outros modelos
                  </Button>
                  <Button
                    type="button"
                    onClick={handleConfirmSelection}
                    className="h-11 rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 sm:flex-1"
                  >
                    Usar este modelo
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogHeader className="p-4 pb-4 pr-12 sm:p-6 sm:pb-4 sm:pr-14">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent">
                      <Layers className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <DialogTitle>Escolher Modelo</DialogTitle>
                      <DialogDescription className="line-clamp-2 sm:line-clamp-none">
                        {getDocumentTypeLabel(documentType)} -{" "}
                        {templates.length} modelos disponiveis
                      </DialogDescription>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setView("create")}
                    className="h-9 w-full items-center gap-1.5 rounded-lg border-border text-secondary-foreground hover:border-primary hover:bg-accent sm:h-8 sm:w-auto"
                    aria-label="Criar novo modelo"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Criar Modelo</span>
                  </Button>
                </div>
              </DialogHeader>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-6">
                <div className="grid grid-cols-1 gap-3 pb-6 pt-0.5">
                  {templates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      isSelected={localSelectedId === template.id}
                      onSelect={handleTemplateClick}
                      onEdit={handleEditTemplate}
                    />
                  ))}

                  {templates.length === 0 && (
                    <div className="flex flex-col items-center justify-center px-2 py-12 text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="mb-1 text-lg font-semibold text-foreground">
                        Sem modelos disponiveis
                      </h3>
                      <p className="mb-4 max-w-xs text-sm text-muted-foreground">
                        Crie o seu primeiro modelo personalizado para comecar
                      </p>
                      <Button
                        type="button"
                        onClick={() => setView("create")}
                        className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Criar Modelo
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
