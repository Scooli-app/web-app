/**
 * Share Resource Modal Component
 * Modal form for sharing AI-generated content with the community
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  GRADE_OPTIONS,
  RESOURCE_TYPE_OPTIONS,
  SUBJECT_OPTIONS,
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
  documentId
}: ShareResourceModalProps) {
  
  const [formData, setFormData] = useState<ShareResourceRequest>({
    title: initialTitle,
    description: "",
    content: initialContent,
    grade: initialGrade,
    subject: initialSubject,
    resourceType: initialResourceType,
    documentId
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        content: initialContent,
        title: initialTitle || prev.title,
        grade: initialGrade || prev.grade,
        subject: initialSubject || prev.subject,
        resourceType: initialResourceType || prev.resourceType,
        documentId
      }));
    }
  }, [isOpen, initialContent, initialTitle, initialGrade, initialSubject, initialResourceType, documentId]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Título é obrigatório";
    }
    if (!formData.grade) {
      newErrors.grade = "Ano é obrigatório";
    }
    if (!formData.subject) {
      newErrors.subject = "Disciplina é obrigatória";
    }
    if (!formData.resourceType) {
      newErrors.resourceType = "Tipo de recurso é obrigatório";
    }
    if (!formData.content.trim()) {
      newErrors.content = "Conteúdo é obrigatório";
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
    if (!isLoading) {
      onClose();
      setFormData({
        title: "",
        description: "",
        content: "",
        grade: "",
        subject: "",
        resourceType: "",
        documentId: undefined
      });
      setErrors({});
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Partilhar com a Comunidade
          </DialogTitle>
          <DialogDescription>
            Partilhe o seu recurso educacional com outros professores portugueses.
            O recurso será revisto antes da publicação.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5 mt-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="share-title">
              Título <span className="text-destructive">*</span>
            </Label>
            <Input
              id="share-title"
              type="text"
              placeholder="Ex: Revisão - Funções - 9º ano"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className={errors.title ? "border-destructive" : ""}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="share-description">
              Descrição <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Textarea
              id="share-description"
              placeholder="Breve descrição do recurso e como pode ser usado..."
              value={formData.description || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Grade, Subject, Type Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Grade */}
            <div className="space-y-1.5">
              <Label>
                Ano escolar <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.grade || ""}
                onValueChange={(value) => setFormData(prev => ({ ...prev, grade: value }))}
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
              {errors.grade && (
                <p className="text-xs text-destructive">{errors.grade}</p>
              )}
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <Label>
                Disciplina <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.subject || ""}
                onValueChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}
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
              {errors.subject && (
                <p className="text-xs text-destructive">{errors.subject}</p>
              )}
            </div>

            {/* Resource Type */}
            <div className="space-y-1.5">
              <Label>
                Tipo <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.resourceType || ""}
                onValueChange={(value) => setFormData(prev => ({ ...prev, resourceType: value }))}
              >
                <SelectTrigger className={errors.resourceType ? "border-destructive" : ""}>
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
              {errors.resourceType && (
                <p className="text-xs text-destructive">{errors.resourceType}</p>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-muted/50 border border-border rounded-lg p-4 text-sm">
            <p className="text-foreground font-medium mb-2">ℹ️ Processo de Revisão</p>
            <ul className="text-muted-foreground space-y-1 text-xs">
              <li>• O recurso será revisto pela nossa equipa em 24-48 horas</li>
              <li>• Verificamos alinhamento com as AEs e qualidade pedagógica</li>
              <li>• Receberá notificação quando for aprovado</li>
              <li>• Recursos aprovados podem ser reutilizados e adaptados por outros professores</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="min-w-32"
            >
              {isLoading ? "A partilhar..." : "Partilhar Recurso"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}