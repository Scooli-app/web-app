"use client";

import TimetableWizard from "@/components/timetable/TimetableWizard";

export default function TimetableNewPage() {
  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto px-4 py-8">
      <div className="w-full">
        <h1 className="text-2xl font-bold text-foreground mb-1">Novo Horário</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Configure o seu horário semanal e adicione as disciplinas.
        </p>
        <TimetableWizard />
      </div>
    </div>
  );
}
