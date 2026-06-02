"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { selectIsCurriculumPlanEnabled } from "@/store/features/selectors";
import { Routes } from "@/shared/types";
import { CalendarDays, Sparkles, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSelector } from "react-redux";

export default function CurriculumPlanLandingPage() {
  const enabled = useSelector(selectIsCurriculumPlanEnabled);
  const router = useRouter();

  useEffect(() => {
    if (!enabled) {
      router.replace(Routes.DASHBOARD);
    }
  }, [enabled, router]);

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
    </div>
  );
}
