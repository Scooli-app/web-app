/**
 * Share Resource Modal Component
 * Modal form for sharing AI-generated content with the community or school library.
 */

"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  GRADE_OPTIONS,
  RESOURCE_TYPE_OPTIONS,
  SUBJECT_OPTIONS,
  type LibraryScope,
  type ShareResourceRequest,
} from "@/services/api/community.service";
import { Share2 } from "lucide-react";
import { useEffect, useState } from "react";

interface ShareResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (request: ShareResourceRequest) => void;
  isLoading?: boolean;
  initialContent?: string;
  initialTitle?: string;
  initialGrade?: string;
  initialSubject?: string;
  initialResourceType?: string;
  libraryScope?: LibraryScope;
  allowOrganizationScope?: boolean;
  organizationName?: string | null;
  documentId?: string;
}

export function ShareResourceModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  initialContent = "",
  initialTitle = "",
  initialGrade = "",
  initialSubject = "",
  initialResourceType = "",
  libraryScope = "community",
  allowOrganizationScope = false,
  organizationName = null,
  documentId,
}: ShareResourceModalProps) {
  const [formData, setFormData] = useState<ShareResourceRequest>({
    title: initialTitle,
    description: "",
    content: initialContent,
    grade: initialGrade,
    subject: initialSubject,
    resourceType: initialResourceType,
    libraryScope,
    documentId,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const currentScope = formData.libraryScope ?? libraryScope;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      content: initialContent,
      title: initialTitle || prev.title,
      grade: initialGrade || prev.grade,
      subject: initialSubject || prev.subject,
      resourceType: initialResourceType || prev.resourceType,
      libraryScope: prev.libraryScope ?? libraryScope,
      documentId,
    }));
  }, [
    documentId,
    initialContent,
    initialGrade,
    initialResourceType,
    initialSubject,
    initialTitle,
    isOpen,
    libraryScope,
  ]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Titulo e obrigatorio";
    }
    if (!formData.grade) {
      newErrors.grade = "Ano e obrigatorio";
    }
    if (!formData.subject) {
      newErrors.subject = "Disciplina e obrigatoria";
    }
    if (!formData.resourceType) {
      newErrors.resourceType = "Tipo de recurso e obrigatorio";
    }
    if (!formData.content.trim()) {
      newErrors.content = "Conteudo e obrigatorio";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSubmit(formData);
  };

  const handleClose = () => {
    if (isLoading) {
      return;
    }

    onClose();
    setFormData({
      title: "",
      description: "",
      content: "",
      grade: "",
      subject: "",
      resourceType: "",
      libraryScope,
      documentId: undefined,
    });
    setErrors({});
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            {currentScope === "organization"
              ? `Partilhar com ${organizationName ?? "a escola"}`
              : "Partilhar com a Comunidade"}
          </DialogTitle>
          <DialogDescription>
            {allowOrganizationScope
              ? "Escolha primeiro onde quer partilhar este recurso."
              : currentScope === "organization"
                ? `Este recurso ficara disponivel para os membros de ${organizationName ?? "a sua escola"}.`
                : "Partilhe o seu recurso educacional com outros professores portugueses. O recurso sera revisto antes da publicacao."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-5 px-6 pb-6">
          {allowOrganizationScope ? (
            <div className="space-y-1.5">
              <Label>
                Destino <span className="text-destructive">*</span>
              </Label>
              <Select
                value={currentScope}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    libraryScope: value as LibraryScope,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar destino" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="community">Biblioteca comunitaria</SelectItem>
                  <SelectItem value="organization">
                    {organizationName
                      ? `Biblioteca de ${organizationName}`
                      : "Biblioteca da escola"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="share-title">
              Titulo <span className="text-destructive">*</span>
            </Label>
            <Input
              id="share-title"
              type="text"
              placeholder="Ex: Revisao - Funcoes - 9 ano"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              className={errors.title ? "border-destructive" : ""}
            />
            {errors.title ? (
              <p className="text-xs text-destructive">{errors.title}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="share-description">
              Descricao{" "}
              <span className="text-xs font-normal text-muted-foreground">
                (opcional)
              </span>
            </Label>
            <Textarea
              id="share-description"
              placeholder="Breve descricao do recurso e como pode ser usado..."
              value={formData.description || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>
                Ano escolar <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.grade || ""}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, grade: value }))
                }
              >
                <SelectTrigger className={errors.grade ? "border-destructive" : ""}>
                  <SelectValue placeholder="Selecionar ano" />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.grade ? (
                <p className="text-xs text-destructive">{errors.grade}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label>
                Disciplina <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.subject || ""}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, subject: value }))
                }
              >
                <SelectTrigger className={errors.subject ? "border-destructive" : ""}>
                  <SelectValue placeholder="Selecionar disciplina" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.subject ? (
                <p className="text-xs text-destructive">{errors.subject}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label>
                Tipo <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.resourceType || ""}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, resourceType: value }))
                }
              >
                <SelectTrigger
                  className={errors.resourceType ? "border-destructive" : ""}
                >
                  <SelectValue placeholder="Selecionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.resourceType ? (
                <p className="text-xs text-destructive">{errors.resourceType}</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm">
            <p className="mb-2 font-medium text-foreground">
              {currentScope === "organization" ? "Biblioteca da escola" : "Processo de revisao"}
            </p>
            {currentScope === "organization" ? (
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>• O recurso fica disponivel imediatamente para a organizacao ativa</li>
                <li>• So membros da escola vao conseguir ver e reutilizar</li>
                <li>• Pode continuar a partilhar outro recurso na biblioteca comunitaria depois</li>
              </ul>
            ) : (
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>• O recurso sera revisto pela nossa equipa em 24-48 horas</li>
                <li>• Verificamos alinhamento com as AEs e qualidade pedagogica</li>
                <li>• Recebera notificacao quando for aprovado</li>
                <li>• Recursos aprovados podem ser reutilizados e adaptados por outros professores</li>
              </ul>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="min-w-32">
              {isLoading
                ? "A partilhar..."
                : currentScope === "organization"
                  ? "Partilhar na escola"
                  : "Partilhar recurso"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
