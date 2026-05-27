"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import TimetableWizard from "@/components/timetable/TimetableWizard";

function TimetableNewContent() {
  const params = useSearchParams();
  const curriculumPlanId = params.get("curriculumPlanId") ?? undefined;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Novo horário</h1>
        <p className="text-muted-foreground">
          Configura o período, liga uma planificação e define o horário semanal.
        </p>
      </div>
      <TimetableWizard initialCurriculumPlanId={curriculumPlanId} />
    </div>
  );
}

export default function TimetableNewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <TimetableNewContent />
    </Suspense>
  );
}
