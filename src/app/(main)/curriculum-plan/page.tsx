"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { selectIsCurriculumPlanEnabled } from "@/store/features/selectors";
import { Routes, type Document } from "@/shared/types";
import { getDocuments } from "@/services/api/document.service";
import { CalendarDays, ChevronRight, Loader2, Sparkles, Upload } from "lucide-react";
import { translateSubject } from "@/components/document-creation/constants";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";

export default function CurriculumPlanLandingPage() {
  const enabled = useSelector(selectIsCurriculumPlanEnabled);
  const router = useRouter();
  const [plans, setPlans] = useState<Document[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      router.replace(Routes.DASHBOARD);
    }
  }, [enabled, router]);

  useEffect(() => {
    if (!enabled) return;
    setPlansLoading(true);
    getDocuments({ page: 1, limit: 50, filters: { documentType: "curriculum_plan" } })
      .then((res) => setPlans(res.documents ?? []))
      .catch(() => setPlans([]))
      .finally(() => setPlansLoading(false));
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
      <div className="flex items-center gap-3">
        <CalendarDays className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Planificações
          </h1>
          <p className="text-muted-foreground">
            Cria ou importa uma planificação curricular para um período letivo
            completo.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="transition hover:border-primary hover:shadow-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle>Gerar com IA</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              A IA produz uma grelha estruturada em 7 secções, alinhada com as
              Aprendizagens Essenciais e calibrada ao período escolhido
              (anual / semestral / trimestral).
            </p>
            <Button asChild className="w-full">
              <Link href={Routes.CURRICULUM_PLAN_NEW}>Começar</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="transition hover:border-primary hover:shadow-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              <CardTitle>Importar existente</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Já tens uma planificação em DOCX, XLSX, PDF ou TXT? O Scooli
              normaliza-a para o mesmo formato canónico, pronta a editar e
              ligar a futuros planos de aula.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href={Routes.CURRICULUM_PLAN_IMPORT}>Importar</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Existing plans */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">As tuas planificações</h2>

        {plansLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : plans.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            Ainda não tens planificações. Cria ou importa a primeira acima.
          </div>
        ) : (
          <div className="space-y-2">
            {plans.map((plan) => (
              <Link
                key={plan.id}
                href={`${Routes.CURRICULUM_PLAN}/${plan.id}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition hover:border-primary/50 hover:shadow-sm"
              >
                <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">
                    {plan.title}
                  </p>
                  {(plan.subject ?? plan.gradeLevel) && (
                    <p className="text-xs text-muted-foreground">
                      {[
                        plan.subject ? translateSubject(plan.subject) : null,
                        plan.gradeLevel ? `${plan.gradeLevel}.º ano` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>
                <p className="shrink-0 text-xs text-muted-foreground">
                  {new Date(plan.createdAt).toLocaleDateString("pt-PT", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
