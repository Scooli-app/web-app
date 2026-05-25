"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUBJECTS } from "@/components/document-creation/constants";
import apiClient from "@/services/api/client";
import { getUploadUrl, waitForDocument } from "@/services/api/document.service";
import { selectIsCurriculumPlanEnabled } from "@/store/features/selectors";
import { Routes, type CurriculumPlanningType } from "@/shared/types";
import { cn } from "@/shared/utils/utils";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";

const PLANNING_TYPES: { value: CurriculumPlanningType; label: string }[] = [
  { value: "annual", label: "Anual" },
  { value: "semester", label: "Semestral" },
  { value: "trimester", label: "Trimestral" },
  { value: "custom", label: "Personalizado" },
];

const SCHOOL_YEARS = Array.from({ length: 12 }, (_, i) => i + 1);

const ACCEPTED_EXTENSIONS = [".docx", ".xlsx", ".pdf", ".txt"];
const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.join(",");

type StepStatus = "pending" | "active" | "done" | "error";

interface ImportStep {
  id: string;
  label: string;
  status: StepStatus;
}

const INITIAL_STEPS: ImportStep[] = [
  { id: "upload", label: "A enviar ficheiro", status: "pending" },
  { id: "import", label: "A iniciar importação", status: "pending" },
  { id: "normalize", label: "A normalizar com IA", status: "pending" },
  { id: "done", label: "Concluído", status: "pending" },
];

function StepIndicatorList({ steps }: { steps: ImportStep[] }) {
  return (
    <div className="flex flex-col gap-4">
      {steps.map((step) => (
        <div key={step.id} className="flex items-center gap-3">
          {step.status === "done" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
          ) : step.status === "active" ? (
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
          ) : step.status === "error" ? (
            <Circle className="h-5 w-5 shrink-0 text-destructive" />
          ) : (
            <Circle className="h-5 w-5 shrink-0 text-muted-foreground/40" />
          )}
          <span
            className={cn(
              "text-sm",
              step.status === "active" && "font-medium text-foreground",
              step.status === "done" && "text-muted-foreground",
              step.status === "pending" && "text-muted-foreground/60",
              step.status === "error" && "text-destructive"
            )}
          >
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function detectFormat(filename: string): string {
  const lower = filename.toLowerCase();
  for (const ext of ACCEPTED_EXTENSIONS) {
    if (lower.endsWith(ext)) return ext.slice(1);
  }
  return "";
}

function detectContentType(filename: string): string {
  if (filename.toLowerCase().endsWith(".docx"))
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (filename.toLowerCase().endsWith(".xlsx"))
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (filename.toLowerCase().endsWith(".pdf")) return "application/pdf";
  if (filename.toLowerCase().endsWith(".txt")) return "text/plain";
  return "application/octet-stream";
}

export default function CurriculumPlanImportPage() {
  const enabled = useSelector(selectIsCurriculumPlanEnabled);
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [planningType, setPlanningType] = useState<CurriculumPlanningType>("trimester");
  const [subjectValue, setSubjectValue] = useState("");
  const [schoolYear, setSchoolYear] = useState<number>(5);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [steps, setSteps] = useState<ImportStep[]>(INITIAL_STEPS);

  useEffect(() => {
    if (!enabled) router.replace(Routes.DASHBOARD);
  }, [enabled, router]);

  const detectedFormat = useMemo(() => (file ? detectFormat(file.name) : ""), [file]);

  const canSubmit =
    !!file &&
    !!detectedFormat &&
    !!title.trim() &&
    !!subjectValue &&
    !submitting;

  function setStepStatus(id: string, status: StepStatus) {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );
  }

  async function handleSubmit() {
    if (!canSubmit || !file) return;
    setSubmitting(true);
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: "pending" as StepStatus })));

    try {
      // Step 1: Upload to R2
      setStepStatus("upload", "active");
      const { uploadUrl, fileKey } = await getUploadUrl(
        file.name,
        detectContentType(file.name),
        "curriculumPlan"
      );
      const putResp = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": detectContentType(file.name) },
        body: file,
      });
      if (!putResp.ok) {
        throw new Error("Falha ao enviar o ficheiro para o armazenamento.");
      }
      setStepStatus("upload", "done");

      // Step 2: Kick off backend import
      setStepStatus("import", "active");
      const importResp = await apiClient.post<{
        documentId: string;
        message: string;
      }>("/curriculum-plans/import", {
        title: title.trim(),
        subject: subjectValue,
        schoolYear,
        planningType,
        periodStart: periodStart || undefined,
        periodEnd: periodEnd || undefined,
        fileKey,
        originalFilename: file.name,
        originalFormat: detectedFormat,
      });
      const docId = importResp.data.documentId;
      setStepStatus("import", "done");

      // Step 3: Wait for AI normalisation
      setStepStatus("normalize", "active");
      await waitForDocument(docId);
      setStepStatus("normalize", "done");

      // Step 4: Done — brief pause then redirect
      setStepStatus("done", "done");
      await new Promise((resolve) => setTimeout(resolve, 600));
      router.push(`/lesson-plan/${docId}`);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível importar a planificação.";
      // Mark the currently-active step as errored
      setSteps((prev) =>
        prev.map((s) => (s.status === "active" ? { ...s, status: "error" } : s))
      );
      toast.error(message);
      setSubmitting(false);
    }
  }

  if (!enabled) return null;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Importar planificação existente
        </h1>
        <p className="text-muted-foreground">
          Aceita DOCX, XLSX, PDF e TXT. O Scooli normaliza o conteúdo para o
          formato canónico de 7 secções.
        </p>
      </div>

      {submitting ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-8 py-12">
            <div className="text-center">
              <p className="text-base font-medium">A importar a tua planificação…</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Isto pode demorar até um minuto.
              </p>
            </div>
            <StepIndicatorList steps={steps} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Ficheiro e metadados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">Ficheiro</Label>
              <Input
                id="file"
                type="file"
                accept={ACCEPT_ATTR}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file && !detectedFormat && (
                <p className="text-sm text-destructive">
                  Formato não suportado. Usa DOCX, XLSX, PDF ou TXT.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Título da planificação</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Planificação Trimestral Matemática 5.º ano"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="subject">Disciplina</Label>
                <Select value={subjectValue} onValueChange={setSubjectValue}>
                  <SelectTrigger id="subject">
                    <SelectValue placeholder="Seleciona" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((s) => (
                      <SelectItem key={s.id} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="schoolYear">Ano de escolaridade</Label>
                <Select
                  value={String(schoolYear)}
                  onValueChange={(v) => setSchoolYear(Number(v))}
                >
                  <SelectTrigger id="schoolYear">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHOOL_YEARS.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}.º ano
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="planningType">Tipo de período</Label>
              <Select
                value={planningType}
                onValueChange={(v) => setPlanningType(v as CurriculumPlanningType)}
              >
                <SelectTrigger id="planningType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLANNING_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="periodStart">Início (opcional)</Label>
                <Input
                  id="periodStart"
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="periodEnd">Fim (opcional)</Label>
                <Input
                  id="periodEnd"
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => router.back()}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={!canSubmit}>
                Importar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
