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
        <div className="flex items-center gap-3 p-4 sm:p-6 border-b border-[#E4E4E7] shrink-0">
          <button
            type="button"
            onClick={handleBack}
            className={cn(
            "flex items-center justify-center w-9 h-9 rounded-lg",
            "text-[#6C6F80] hover:text-[#0B0D17] hover:bg-[#F4F5F8] transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-[#6753FF]"
          )}
          aria-label="Voltar"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-[#0B0D17]">
            {isEditing ? "Editar Modelo" : "Criar Novo Modelo"}
          </h2>
          <p className="text-xs sm:text-sm text-[#6C6F80]">
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
                className="block text-sm font-medium text-[#0B0D17] mb-1.5"
              >
                Nome do Modelo <span className="text-red-500">*</span>
              </label>
              <Input
                id="template-name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={TEMPLATE_PLACEHOLDERS[documentType].name}
                className="h-11 px-4 text-sm bg-[#F4F5F8] border-[#C7C9D9] rounded-xl placeholder:text-[#6C6F80] focus:border-[#6753FF] focus:ring-[#6753FF]/20"
              />
            </div>

            <div>
              <label
                htmlFor="template-description"
                className="block text-sm font-medium text-[#0B0D17] mb-1.5"
              >
                Descrição{" "}
                <span className="text-xs font-normal text-[#6C6F80]">
                  (Opcional)
                </span>
              </label>
              <textarea
                id="template-description"
                value={description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder={TEMPLATE_PLACEHOLDERS[documentType].description}
                rows={2}
                className="w-full px-4 py-3 text-sm bg-[#F4F5F8] border border-[#C7C9D9] rounded-xl placeholder:text-[#6C6F80] resize-none focus:outline-none focus:border-[#6753FF] focus:ring-2 focus:ring-[#6753FF]/20 transition-all"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-[#0B0D17]">
                  Secções do Modelo <span className="text-red-500">*</span>
                </h3>
                <p className="text-xs text-[#6C6F80]">
                  Arraste para reordenar as secções
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddSection}
                className="flex items-center gap-1.5 border-[#C7C9D9] text-[#2E2F38] hover:bg-[#EEF0FF] hover:border-[#6753FF] rounded-lg"
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
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 animate-in fade-in slide-in-from-top-2 duration-200">
              {error}
            </div>
          )}
        </div>
      </div>

        <div className="p-4 sm:p-6 border-t border-[#E4E4E7] bg-[#FAFAFA] shrink-0">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              className="sm:flex-1 h-11 border-[#C7C9D9] text-[#2E2F38] hover:bg-[#EEF0FF] hover:border-[#6753FF] rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || !isFormValid()}
              className="sm:flex-1 h-11 bg-[#6753FF] hover:bg-[#4E3BC0] text-white rounded-xl shadow-md shadow-[#6753FF]/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
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

