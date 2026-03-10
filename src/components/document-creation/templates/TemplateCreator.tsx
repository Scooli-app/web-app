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
    name: "Ex: Quiz Rapido de Revisao",
    description: "Descreva quando usar este modelo de quiz...",
  },
  test: {
    name: "Ex: Teste com Grupos de Dificuldade",
    description: "Descreva quando usar este modelo de teste...",
  },
  presentation: {
    name: "Ex: Apresentacao Interativa com Atividades",
    description: "Descreva quando usar este modelo de apresentacao...",
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
          })),
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
    }),
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
    value: string,
  ) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === id ? { ...section, [field]: value } : section,
      ),
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
    return Boolean(
      name.trim() && sections.length > 0 && sections.every((s) => s.title.trim()),
    );
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
      setError("Preencha o nome do modelo e o titulo de todas as seccoes");
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
          : "Ocorreu um erro ao criar o modelo. Tente novamente.",
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

      <div className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 border-b border-border p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={handleBack}
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                "text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
              )}
              aria-label="Voltar"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-foreground sm:text-xl">
                {isEditing ? "Editar Modelo" : "Criar Novo Modelo"}
              </h2>
              <p className="text-xs text-muted-foreground sm:text-sm">
                {isEditing
                  ? "Atualize a estrutura do seu modelo"
                  : "Defina a estrutura do seu modelo personalizado"}
              </p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-5 p-4 sm:space-y-6 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label
                  htmlFor="template-name"
                  className="mb-1.5 block text-sm font-medium text-foreground"
                >
                  Nome do Modelo <span className="text-destructive">*</span>
                </label>
                <Input
                  id="template-name"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder={TEMPLATE_PLACEHOLDERS[documentType].name}
                  className="h-11 rounded-xl border-input bg-input px-4 text-sm placeholder:text-muted-foreground"
                />
              </div>

              <div>
                <label
                  htmlFor="template-description"
                  className="mb-1.5 block text-sm font-medium text-foreground"
                >
                  Descricao{" "}
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
                  className="min-h-0 rounded-xl border-input bg-input px-4 py-3 text-sm placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-medium text-foreground">
                    Seccoes do Modelo <span className="text-destructive">*</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Arraste para reordenar as seccoes
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddSection}
                  className="h-9 w-full items-center gap-1.5 rounded-lg border-border text-secondary-foreground hover:border-primary hover:bg-accent sm:h-8 sm:w-auto"
                  aria-label="Adicionar seccao"
                >
                  <Plus className="h-4 w-4" />
                  <span>Adicionar</span>
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
              <div className="animate-in fade-in slide-in-from-top-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive duration-200">
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-border bg-muted/50 p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              className="h-11 rounded-xl border-border text-secondary-foreground hover:border-primary hover:bg-accent sm:flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || !isFormValid()}
              className="h-11 rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none hover:bg-primary/90 sm:flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? "A guardar..." : "A criar..."}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {isEditing ? "Guardar Alteracoes" : "Criar Modelo"}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}


