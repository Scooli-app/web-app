"use client";

import { GRADE_GROUPS, SUBJECTS, SUBJECTS_BY_GRADE } from "@/components/document-creation/constants";
import { documentTypes } from "@/components/document-creation/documentTypes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getUploadUrl, importDocument, waitForDocument } from "@/services/api/document.service";
import { cn } from "@/shared/utils/utils";
import { AlertCircle, FilePlus, Loader2, UploadCloud, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export function UploadDocumentModal({ isOpen, onClose }: UploadDocumentModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState<string>("");
  const [schoolYear, setSchoolYear] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setTitle("");
      setDocumentType("");
      setSchoolYear("");
      setSubject("");
      setError(null);
      setIsUploading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (schoolYear && subject) {
      const validSubjects = SUBJECTS_BY_GRADE[schoolYear];
      if (validSubjects && !validSubjects.includes(subject)) {
        setSubject("");
      }
    }
  }, [schoolYear, subject]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (!ALLOWED_TYPES.includes(selectedFile.type)) {
        setError("Apenas ficheiros PDF e DOCX são suportados.");
        setFile(null);
        return;
      }
      if (selectedFile.size > MAX_FILE_SIZE) {
        setError("O tamanho máximo do ficheiro é 10MB.");
        setFile(null);
        return;
      }
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (!ALLOWED_TYPES.includes(droppedFile.type)) {
        setError("Apenas ficheiros PDF e DOCX são suportados.");
        return;
      }
      if (droppedFile.size > MAX_FILE_SIZE) {
        setError("O tamanho máximo do ficheiro é 10MB.");
        return;
      }
      setFile(droppedFile);
      if (!title) {
        setTitle(droppedFile.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError("Por favor, selecione um ficheiro."); return; }
    if (!title || !documentType || !schoolYear || !subject) {
      setError("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    try {
      setIsUploading(true);
      setError(null);

      const subjectValue = SUBJECTS.find((s) => s.id === subject)?.value || subject;

      // Wrap the async flow in a promise for the toast
      const importPromise = (async () => {
        // 1. Get Presigned URL
        const { uploadUrl, fileKey } = await getUploadUrl(file.name, file.type, documentType);

        // 2. Upload file directly to R2
        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error("Falha ao carregar o ficheiro para o armazenamento.");
        }

        // 3. Trigger Import (now returns 202 Accepted with the future document ID)
        const { id } = await importDocument({
          title,
          documentType,
          subject: subjectValue,
          schoolYear: parseInt(schoolYear),
          fileKey,
        });

        // 4. Poll and wait until the document is actually generated & saved
        await waitForDocument(id);
      })();

      toast.promise(importPromise.then(() => {
        window.location.reload();
      }), {
        loading: "A fazer upload, pode demorar um pouco...",
        success: "Upload concluído! A atualizar galeria...",
        error: (err: Error) => err.message || "Ocorreu um erro ao importar o documento. Tente novamente.",
      });

      // Close immediately to unblock the user while it processes in the background!
      onClose();

    } catch (err: unknown) {
      console.error("Import failed entirely:", err);
      // Only reach here if setting up the promise itself fails synchronously which shouldn't happen
    } finally {
      setIsUploading(false);
    }
  };

  const isFormValid = file && title && documentType && schoolYear && subject;

  return (
    <Dialog open={isOpen} onOpenChange={isUploading ? undefined : onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden">

        {/* Header */}
        <div className="pt-6 pb-4 px-6 border-b border-border">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <UploadCloud className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle className="text-lg font-semibold text-foreground">
              Importar Documento
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground ml-12">
            Faça upload de um PDF ou DOCX. A IA irá converter e estruturar o conteúdo.
          </DialogDescription>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">

            {/* File Drop Zone */}
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all",
                file
                  ? "border-primary/40 bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-muted/50",
                error && !file && "border-destructive/50 bg-destructive/5"
              )}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input
                type="file"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              />
              {file ? (
                <div className="flex items-center gap-3 w-full">
                  <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FilePlus className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center gap-1.5">
                  <UploadCloud className="w-7 h-7 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">Clique ou arraste o ficheiro</p>
                  <p className="text-xs text-muted-foreground">PDF ou DOCX · Máx. 10MB</p>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg p-3">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <p className="text-xs">{error}</p>
              </div>
            )}

            {/* Warning */}
            <div className="flex items-start gap-2 bg-muted/60 rounded-lg p-3 border border-border/50">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Imagens e formatação complexa poderão não ser preservadas. Documentos digitalizados sem texto legível serão rejeitados.
              </p>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-sm">Título do Documento</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Ficha de Frações"
                disabled={isUploading}
              />
            </div>

            {/* Document Type + School Year */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="docType" className="text-sm">Converter para</Label>
                <Select value={documentType} onValueChange={setDocumentType} disabled={isUploading}>
                  <SelectTrigger id="docType">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(documentTypes).map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="schoolYear" className="text-sm">Ano Escolar</Label>
                <Select value={schoolYear} onValueChange={setSchoolYear} disabled={isUploading}>
                  <SelectTrigger id="schoolYear" className="h-10">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {GRADE_GROUPS.map((group) => (
                      <SelectGroup key={group.label}>
                        <SelectLabel className="bg-background px-2 py-2 text-xs font-bold text-primary border-b border-border/50 mb-1">
                          {group.label}
                        </SelectLabel>
                        {group.grades.map((grade) => (
                          <SelectItem key={grade.id} value={grade.id} className="py-2 px-3 text-sm cursor-pointer rounded-md focus:bg-accent focus:text-primary pl-4">
                            {grade.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <Label htmlFor="subject" className="text-sm">Disciplina</Label>
              <Select
                value={subject}
                onValueChange={setSubject}
                disabled={!schoolYear || isUploading}
              >
                <SelectTrigger id="subject" className="h-10">
                  <SelectValue placeholder={!schoolYear ? "Selecione primeiro o ano..." : "Selecione..."} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {schoolYear && (() => {
                    const validSubjectsIds = SUBJECTS_BY_GRADE[schoolYear] || [];
                    const validSubjects = SUBJECTS.filter(s => validSubjectsIds.includes(s.id));
                    const categories = [...new Set(validSubjects.map((s) => s.category))];
                    return categories.map((category) => (
                      <SelectGroup key={category}>
                        <SelectLabel className="bg-background px-2 py-2 text-xs font-bold text-primary border-b border-border/50 mb-1">
                          {category}
                        </SelectLabel>
                        {validSubjects
                          .filter((s) => s.category === category)
                          .map((s) => (
                            <SelectItem key={s.id} value={s.id} className="py-2 px-3 text-sm cursor-pointer rounded-md focus:bg-accent focus:text-primary pl-4">
                              {s.label}
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 pt-2 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isUploading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!isFormValid || isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A Importar...
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 mr-2" />
                  Importar e Converter
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
