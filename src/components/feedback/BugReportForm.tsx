import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { feedbackService } from "@/services/api/feedback.service";
import { BugSeverity, FeedbackType } from "@/shared/types/feedback";
import { FileText, Loader2, Upload, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface BugReportFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function BugReportForm({ onSuccess, onCancel }: BugReportFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [bugType, setBugType] = useState("");
  const [severity, setSeverity] = useState<BugSeverity | "">("");
  const [description, setDescription] = useState("");
  const [reproductionSteps, setReproductionSteps] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      addFiles(newFiles);
    }
  };

  const addFiles = (newFiles: File[]) => {
    // Validate files (images only, < 5MB)
    const validFiles = newFiles.filter((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} não é uma imagem válida.`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} excede o limite de 5MB.`);
        return false;
      }
      return true;
    });

    setFiles((prev) => [...prev, ...validFiles]);

    // Create previews
    const newPreviews = validFiles.map((file) => URL.createObjectURL(file));
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index]); // Cleanup memory
      return prev.filter((_, i) => i !== index);
    });
  };

  // Handle paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        e.preventDefault();
        const pastedFiles = Array.from(e.clipboardData.files);
        addFiles(pastedFiles);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      addFiles(droppedFiles);
    }
  };

  const isValid = title.trim().length > 0 && bugType.length > 0 && severity.length > 0 && description.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setIsSubmitting(true);
    try {
      const feedbackId = crypto.randomUUID();
      const uploadedAttachments: { fileUrl: string; filePath: string; fileType: string }[] = [];

      // Upload files
      for (const file of files) {
        try {
          const result = await feedbackService.uploadFile(file, feedbackId);
          uploadedAttachments.push({
            fileUrl: result.fileUrl,
            filePath: result.filePath,
            fileType: file.type,
          });
        } catch (error) {
          console.error("Failed to upload file:", file.name, error);
          toast.error(`Falha ao enviar o ficheiro ${file.name}`);
        }
      }

      await feedbackService.createFeedback({
        id: feedbackId,
        type: FeedbackType.BUG,
        title,
        bugType,
        severity: severity as BugSeverity,
        description,
        reproductionSteps,
        attachments: uploadedAttachments,
      });

      toast.success("Bug reportado com sucesso!");
      onSuccess();
    } catch (error) {
      console.error("Failed to report bug:", error);
      toast.error("Ocorreu um erro ao reportar o bug.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-6 pt-0">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="bugType">
            Tipo de erro <span className="text-red-500">*</span>
          </Label>
          <Select value={bugType} onValueChange={setBugType}>
            <SelectTrigger className="border-white/10 bg-muted/50">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UI/Visual">UI / Visual</SelectItem>
              <SelectItem value="Performance">Performance</SelectItem>
              <SelectItem value="Funcionalidade">Funcionalidade</SelectItem>
              <SelectItem value="Autenticação">Autenticação</SelectItem>
              <SelectItem value="Outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="severity">
            Gravidade <span className="text-red-500">*</span>
          </Label>
          <Select value={severity} onValueChange={(val) => setSeverity(val as BugSeverity)}>
            <SelectTrigger className="border-white/10 bg-muted/50">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={BugSeverity.LOW}>Baixa</SelectItem>
              <SelectItem value={BugSeverity.MEDIUM}>Média</SelectItem>
              <SelectItem value={BugSeverity.HIGH}>Alta</SelectItem>
              <SelectItem value={BugSeverity.CRITICAL}>Crítica</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">
          Título do erro <span className="text-red-500">*</span>
        </Label>
        <Input
          id="title"
          placeholder="Ex: Botão de login não funciona"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border-white/10 bg-muted/50"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">
          O que aconteceu? <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="description"
          placeholder="Descreva o erro em detalhe..."
          className="min-h-[100px] border-white/10 bg-muted/50"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reproductionSteps">Passo a passo para reproduzir (Opcional)</Label>
        <Textarea
          id="reproductionSteps"
          placeholder="1. Aceder à página X&#10;2. Clicar no botão Y..."
          className="min-h-[80px] border-white/10 bg-muted/50"
          value={reproductionSteps}
          onChange={(e) => setReproductionSteps(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Anexos (Screenshots)</Label>
        <div
          className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Arraste screenshots ou clique para selecionar.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Também pode colar imagens (Ctrl+V).
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {files.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
            {files.map((file, index) => (
              <div key={index} className="relative group border rounded-md overflow-hidden bg-muted">
                {previews[index] ? (
                  <Image
                    src={previews[index]}
                    alt="Preview"
                    width={200}
                    height={80}
                    className="w-full h-20 object-cover"
                  />
                ) : (
                  <div className="w-full h-20 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
                <div className="p-1 text-xs truncate w-full px-2" title={file.name}>
                  {file.name}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 pt-2">
        <p className="text-xs text-muted-foreground">* Campos obrigatórios</p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting || !isValid} variant="destructive">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reportar Bug
          </Button>
        </div>
      </div>
    </form>
  );
}
