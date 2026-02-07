"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UnsavedChangesDialog } from "@/components/ui/confirmation-dialog";
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
    selectedTemplateId
  );
  const [isCreatorDirty, setIsCreatorDirty] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingCloseAction, setPendingCloseAction] = useState<(() => void) | null>(null);
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

  const handleTemplateSaved = (template: DocumentTemplate, isUpdate: boolean) => {
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
      // Update preview template if it's the one being set as default
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
          "h-[85vh] max-h-[800px] flex flex-col p-0 gap-0 overflow-hidden max-w-2xl"
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
            <DialogHeader className="p-6 pb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <button
                  type="button"
                  onClick={handleBackToBrowse}
                  className="hover:text-primary transition-colors"
                >
                  Modelos
                </button>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground font-medium">
                  {previewTemplate.name}
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-accent shrink-0">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <DialogTitle className="flex items-center gap-2 flex-wrap">
                    {previewTemplate.name}
                    {previewTemplate.isSystem ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-primary to-primary/70 text-primary-foreground">
                        <Sparkles className="w-2.5 h-2.5" />
                        Scooli
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                        Personalizado
                      </span>
                    )}
                    {previewTemplate.isDefault && (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-success text-white">
                        Padrão
                      </span>
                    )}
                  </DialogTitle>
                  <DialogDescription className="mt-1">
                    {previewTemplate.description}
                  </DialogDescription>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!previewTemplate.isDefault && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(previewTemplate)}
                      disabled={isSettingDefault}
                      className="flex items-center gap-1.5 border-border text-secondary-foreground hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400 rounded-lg"
                      aria-label="Definir como padrão"
                    >
                      {isSettingDefault ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Star className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">
                        {isSettingDefault ? "A definir..." : "Definir Padrão"}
                      </span>
                    </Button>
                  )}
                  {previewTemplate.isDefault && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 rounded-lg text-sm font-medium">
                      <Check className="w-4 h-4" />
                      <span className="hidden sm:inline">Padrão</span>
                    </div>
                  )}
                  {!previewTemplate.isSystem && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditTemplate(previewTemplate)}
                      className="flex items-center gap-1.5 border-border text-secondary-foreground hover:bg-accent hover:border-primary rounded-lg"
                      aria-label="Editar modelo"
                    >
                      <Pencil className="w-4 h-4" />
                      <span className="hidden sm:inline">Editar</span>
                    </Button>
                  )}
                </div>
              </div>
            </DialogHeader>

            <ScrollArea className="flex-1 px-6">
              <div className="space-y-3 pb-4">
                <h3 className="text-sm font-medium text-foreground">
                  Secções ({previewTemplate.sections.length})
                </h3>
                <div className="space-y-2">
                  {previewTemplate.sections
                    .sort((a, b) => a.order - b.order)
                    .map((section, index) => (
                      <div
                        key={section.id}
                        className="flex gap-3 p-3 bg-muted rounded-xl"
                      >
                        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-background text-primary font-semibold text-sm shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm text-foreground">
                            {section.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {section.description}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </ScrollArea>

            <div className="p-6 pt-4 border-t border-border bg-muted/50">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBackToBrowse}
                  className="sm:flex-1 h-11 border-border text-secondary-foreground hover:bg-accent hover:border-primary rounded-xl"
                >
                  Ver outros modelos
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmSelection}
                  className="sm:flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md shadow-primary/20"
                >
                  Usar este modelo
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="p-6 pb-4 mt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent shrink-0">
                    <Layers className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <DialogTitle>Escolher Modelo</DialogTitle>
                    <DialogDescription>
                      {getDocumentTypeLabel(documentType)} • {templates.length}{" "}
                      modelos disponíveis
                    </DialogDescription>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setView("create")}
                  className="flex items-center gap-1.5 border-border text-secondary-foreground hover:bg-accent hover:border-primary rounded-lg"
                  aria-label="Criar novo modelo"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Criar Modelo</span>
                </Button>
              </div>
            </DialogHeader>

            <ScrollArea className="flex-1 px-6">
              <div className="grid grid-cols-1 gap-3 pb-6">
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
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-4">
                      <FileText className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      Sem modelos disponíveis
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-xs mb-4">
                      Crie o seu primeiro modelo personalizado para começar
                    </p>
                    <Button
                      type="button"
                      onClick={() => setView("create")}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Modelo
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        )}
        </DialogContent>
      </Dialog>
    </>
  );
}
