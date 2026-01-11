"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UnsavedChangesDialog } from "@/components/ui/confirmation-dialog";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import type { DocumentTemplate, DocumentType } from "@/shared/types";
import { cn } from "@/shared/utils/utils";
import { ArrowLeft, Loader2, Plus, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createTemplate, updateTemplate } from "@/services/api/template.service";
import { SortableSection, type SectionItem } from "./SortableSection";

const TEMPLATE_PLACEHOLDERS: Record<
  DocumentType,
  { name: string; description: string }
> = {
  lessonPlan: {
    name: "Ex: Aula Expositiva com Debate",
    description: "Descreva quando usar este modelo de plano de aula...",
  },
  quiz: {
    name: "Ex: Quiz Rápido de Revisão",
    description: "Descreva quando usar este modelo de quiz...",
  },
  test: {
    name: "Ex: Teste com Grupos de Dificuldade",
    description: "Descreva quando usar este modelo de teste...",
  },
  presentation: {
    name: "Ex: Apresentação Interativa com Atividades",
    description: "Descreva quando usar este modelo de apresentação...",
  },
};

interface TemplateCreatorProps {
  documentType: DocumentType;
  onBack: () => void;
  onTemplateSaved: (template: DocumentTemplate, isUpdate: boolean) => void;
  editingTemplate?: DocumentTemplate | null;
  onDirtyStateChange?: (isDirty: boolean) => void;
}

export function TemplateCreator({
  documentType,
  onBack,
  onTemplateSaved,
  editingTemplate,
  onDirtyStateChange,
}: TemplateCreatorProps) {
  const isEditing = !!editingTemplate;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sections, setSections] = useState<SectionItem[]>([
    { id: "section-1", title: "", description: "" },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const {
    isDirty,
    markAsDirty: _markAsDirty,
    markAsClean,
    showConfirmDialog,
    handleAttemptLeave,
    handleConfirmLeave,
    handleCancelLeave,
  } = useUnsavedChanges();

  const markAsDirty = useCallback(() => {
    _markAsDirty();
    onDirtyStateChange?.(true);
  }, [_markAsDirty, onDirtyStateChange]);

  useEffect(() => {
    onDirtyStateChange?.(isDirty);
  }, [isDirty, onDirtyStateChange]);

  useEffect(() => {
    if (editingTemplate) {
      setName(editingTemplate.name);
      setDescription(editingTemplate.description);
      setSections(
        editingTemplate.sections
          .sort((a, b) => a.order - b.order)
          .map((s) => ({
            id: s.id,
            title: s.title,
            description: s.description,
          }))
      );
      markAsClean();
    }
  }, [editingTemplate, markAsClean]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      markAsDirty();
    }
  };

  const handleAddSection = () => {
    const newSection: SectionItem = {
      id: `section-${Date.now()}`,
      title: "",
      description: "",
    };
    setSections((prev) => [...prev, newSection]);
    markAsDirty();
  };

  const handleUpdateSection = (
    id: string,
    field: "title" | "description",
    value: string
  ) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === id ? { ...section, [field]: value } : section
      )
    );
    markAsDirty();
  };

  const handleDeleteSection = (id: string) => {
    if (sections.length > 1) {
      setSections((prev) => prev.filter((section) => section.id !== id));
      markAsDirty();
    }
  };

  const handleNameChange = (value: string) => {
    setName(value);
    markAsDirty();
  };

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    markAsDirty();
  };

  const handleBack = () => {
    handleAttemptLeave(onBack);
  };

  const isFormValid = () => {
    return (
      name.trim() &&
      sections.length > 0 &&
      sections.every((s) => s.title.trim())
    );
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
      setError("Preencha o nome do modelo e o título de todas as secções");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const templateData = {
        name: name.trim(),
        description: description.trim(),
        documentType,
        sections: sections.map((s, index) => ({
          title: s.title.trim(),
          description: s.description.trim(),
          order: index,
        })),
      };

      let template: DocumentTemplate;
      const isUpdate = isEditing && !!editingTemplate;

      if (isUpdate) {
        template = await updateTemplate(editingTemplate.id, templateData);
      } else {
        template = await createTemplate(templateData);
      }

      onTemplateSaved(template, isUpdate);
    } catch (err) {
      console.error("Failed to save template:", err);
      setError(
        isEditing
          ? "Ocorreu um erro ao guardar o modelo. Tente novamente."
          : "Ocorreu um erro ao criar o modelo. Tente novamente."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <UnsavedChangesDialog
        isOpen={showConfirmDialog}
        onClose={handleCancelLeave}
        onConfirm={handleConfirmLeave}
      />

      <div className="flex flex-col h-full min-h-0">
        <div className="flex items-center gap-3 p-4 sm:p-6 border-b border-border shrink-0">
          <button
            type="button"
            onClick={handleBack}
            className={cn(
            "flex items-center justify-center w-9 h-9 rounded-lg",
            "text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
            "focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          )}
          aria-label="Voltar"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-foreground">
            {isEditing ? "Editar Modelo" : "Criar Novo Modelo"}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {isEditing
              ? "Atualize a estrutura do seu modelo"
              : "Defina a estrutura do seu modelo personalizado"}
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label
                htmlFor="template-name"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                Nome do Modelo <span className="text-destructive">*</span>
              </label>
              <Input
                id="template-name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={TEMPLATE_PLACEHOLDERS[documentType].name}
                className="h-11 px-4 text-sm bg-input border-input rounded-xl placeholder:text-muted-foreground"
              />
            </div>

            <div>
              <label
                htmlFor="template-description"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                Descrição{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  (Opcional)
                </span>
              </label>
              <Textarea
                id="template-description"
                value={description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder={TEMPLATE_PLACEHOLDERS[documentType].description}
                rows={2}
                className="px-4 py-3 text-sm bg-input border-input rounded-xl placeholder:text-muted-foreground min-h-0"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-foreground">
                  Secções do Modelo <span className="text-destructive">*</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Arraste para reordenar as secções
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddSection}
                className="flex items-center gap-1.5 border-border text-secondary-foreground hover:bg-accent hover:border-primary rounded-lg"
                aria-label="Adicionar secção"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Adicionar</span>
              </Button>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sections.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {sections.map((section) => (
                    <SortableSection
                      key={section.id}
                      section={section}
                      onUpdate={handleUpdateSection}
                      onDelete={handleDeleteSection}
                      canDelete={sections.length > 1}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive animate-in fade-in slide-in-from-top-2 duration-200">
              {error}
            </div>
          )}
        </div>
      </div>

        <div className="p-4 sm:p-6 border-t border-border bg-muted/50 shrink-0">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              className="sm:flex-1 h-11 border-border text-secondary-foreground hover:bg-accent hover:border-primary rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || !isFormValid()}
              className="sm:flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? "A guardar..." : "A criar..."}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {isEditing ? "Guardar Alterações" : "Criar Modelo"}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
