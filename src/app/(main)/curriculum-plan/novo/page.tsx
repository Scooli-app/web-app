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
import {
  createDocument,
  setPendingInitialPrompt,
} from "@/store/documents/documentSlice";
import { selectIsCurriculumPlanEnabled } from "@/store/features/selectors";
import { useAppDispatch } from "@/store/hooks";
import { Routes, type CurriculumPlanningType } from "@/shared/types";
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

function buildPrompt(p: {
  planningType: CurriculumPlanningType;
  subjectLabel: string;
  schoolYear: number;
  periodStart: string;
  periodEnd: string;
  lessonsPerWeek: number;
  totalLessons: number;
}) {
  const label = PLANNING_TYPES.find((t) => t.value === p.planningType)?.label;
  return (
    `Planificação macro ${label?.toLowerCase()} de ${p.subjectLabel} para o ` +
    `${p.schoolYear}.º ano, de ${p.periodStart} a ${p.periodEnd}, com cerca de ` +
    `${p.lessonsPerWeek} aulas por semana (${p.totalLessons} aulas totais estimadas). ` +
    "Gera as 7 secções canónicas (Identificação, Perfil do Aluno, AEs, Calendarização, " +
    "Desenvolvimento por Unidades, Avaliação, Articulação Curricular)."
  );
}

function weeksBetween(startISO: string, endISO: string): number {
  const start = new Date(startISO);
  const end = new Date(endISO);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const ms = end.getTime() - start.getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24 * 7)));
}

export default function CurriculumPlanNewPage() {
  const enabled = useSelector(selectIsCurriculumPlanEnabled);
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [planningType, setPlanningType] = useState<CurriculumPlanningType>("trimester");
  const [subjectValue, setSubjectValue] = useState<string>("");
  const [schoolYear, setSchoolYear] = useState<number>(5);
  const [periodStart, setPeriodStart] = useState<string>("");
  const [periodEnd, setPeriodEnd] = useState<string>("");
  const [lessonsPerWeek, setLessonsPerWeek] = useState<number>(3);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!enabled) router.replace(Routes.DASHBOARD);
  }, [enabled, router]);

  const totalLessons = useMemo(
    () => weeksBetween(periodStart, periodEnd) * lessonsPerWeek,
    [periodStart, periodEnd, lessonsPerWeek]
  );

  const subjectLabel = useMemo(
    () => SUBJECTS.find((s) => s.value === subjectValue)?.label ?? "",
    [subjectValue]
  );

  const canSubmit =
    !!subjectValue &&
    !!periodStart &&
    !!periodEnd &&
    periodEnd > periodStart &&
    lessonsPerWeek > 0 &&
    !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);

    const prompt = buildPrompt({
      planningType,
      subjectLabel,
      schoolYear,
      periodStart,
      periodEnd,
      lessonsPerWeek,
      totalLessons,
    });

    try {
      // Seed the editor's pending prompt so the first SSE chunk renders cleanly.
      dispatch(setPendingInitialPrompt(prompt));

      const result = await dispatch(
        createDocument({
          documentType: "curriculumPlan",
          prompt,
          subject: subjectValue,
          schoolYear,
          additionalDetails: JSON.stringify({
            planningType,
            periodStart,
            periodEnd,
            lessonsPerWeek,
            totalLessonsEstimate: totalLessons,
          }),
          // PromptCatalog reuses worksheetVariant to carry planningType for curriculumPlan.
          worksheetVariant: planningType as never,
        })
      ).unwrap();

      router.push(`/lesson-plan/${result.id}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível criar a planificação.";
      toast.error(message);
      setSubmitting(false);
    }
  }

  if (!enabled) return null;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Nova planificação macro
        </h1>
        <p className="text-muted-foreground">
          A IA gera as 7 secções canónicas. Pode editar tudo depois.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parâmetros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
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
            <Label htmlFor="subject">Disciplina</Label>
            <Select value={subjectValue} onValueChange={setSubjectValue}>
              <SelectTrigger id="subject">
                <SelectValue placeholder="Seleciona a disciplina" />
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="periodStart">Início do período</Label>
              <Input
                id="periodStart"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodEnd">Fim do período</Label>
              <Input
                id="periodEnd"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lessonsPerWeek">Aulas por semana</Label>
            <Input
              id="lessonsPerWeek"
              type="number"
              min={1}
              max={20}
              value={lessonsPerWeek}
              onChange={(e) => setLessonsPerWeek(Number(e.target.value) || 1)}
            />
            {totalLessons > 0 && (
              <p className="text-sm text-muted-foreground">
                Estimativa: {totalLessons} aulas no período.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {submitting ? "A gerar..." : "Gerar planificação"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
