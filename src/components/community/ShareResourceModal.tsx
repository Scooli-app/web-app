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
  documentId?: string;
}

export function ShareResourceModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  initialContent = "",
  documentId
}: ShareResourceModalProps) {
  
  const [formData, setFormData] = useState<ShareResourceRequest>({
    title: "",
    description: "",
    content: initialContent,
    grade: "",
    subject: "",
    resourceType: "",
    documentId
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        content: initialContent,
        documentId
      }));
    }
  }, [isOpen, initialContent, documentId]);

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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Partilhar com a Comunidade
          </DialogTitle>
          <DialogDescription>
            Partilhe o seu recurso educacional com outros professores portugueses.
            O recurso será revisado antes da publicação.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Título <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              type="text"
              placeholder="Ex: Revisão - Funções - 9º ano"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className={errors.title ? "border-red-500" : ""}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Breve descrição do recurso e como pode ser usado..."
              value={formData.description || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Grade, Subject, Type Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Grade */}
            <div className="space-y-2">
              <Label>
                Ano <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.grade}
                onValueChange={(value) => setFormData(prev => ({ ...prev, grade: value }))}
              >
                <SelectTrigger className={errors.grade ? "border-red-500" : ""}>
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
                <p className="text-sm text-red-500">{errors.grade}</p>
              )}
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label>
                Disciplina <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.subject}
                onValueChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}
              >
                <SelectTrigger className={errors.subject ? "border-red-500" : ""}>
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
                <p className="text-sm text-red-500">{errors.subject}</p>
              )}
            </div>

            {/* Resource Type */}
            <div className="space-y-2">
              <Label>
                Tipo <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.resourceType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, resourceType: value }))}
              >
                <SelectTrigger className={errors.resourceType ? "border-red-500" : ""}>
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
                <p className="text-sm text-red-500">{errors.resourceType}</p>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <p className="text-blue-800 font-medium mb-2">ℹ️ Processo de Revisão</p>
            <ul className="text-blue-700 space-y-1 text-xs">
              <li>• O recurso será revisado pela nossa equipa em 24-48 horas</li>
              <li>• Verificamos alinhamento curricular e qualidade pedagógica</li>
              <li>• Receberá notificação quando for aprovado</li>
              <li>• Recursos aprovados podem ser reutilizados e adaptados por outros professores</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
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
              {isLoading ? "Partilhando..." : "Partilhar Recurso"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}