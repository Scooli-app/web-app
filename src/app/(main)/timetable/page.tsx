"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/store";
import { fetchSessions } from "@/store/timetable/timetableSlice";
import { useRouter } from "next/navigation";
import { Plus, CalendarDays, Loader2 } from "lucide-react";
import type { TimetableSession } from "@/shared/types/timetable";

function SessionCard({ session }: { session: TimetableSession }) {
  const router = useRouter();

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" });

  return (
    <button
      type="button"
      onClick={() => router.push(`/timetable/${session.id}`)}
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 text-left shadow-sm hover:shadow-md hover:border-primary/40 transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 shrink-0 text-primary" />
          <span className="font-semibold text-foreground line-clamp-1">{session.title}</span>
        </div>
        {session.schoolYearLabel && (
          <span className="shrink-0 text-xs rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
            {session.schoolYearLabel}
          </span>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        {formatDate(session.periodStart)} – {formatDate(session.periodEnd)}
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            session.status === "active"
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : session.status === "draft"
              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {session.status === "active" ? "Ativo" : session.status === "draft" ? "Rascunho" : session.status}
        </span>
      </div>
    </button>
  );
}

export default function TimetablePage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { sessions, isLoadingSessions, error } = useSelector(
    (state: RootState) => state.timetable
  );

  useEffect(() => {
    dispatch(fetchSessions());
  }, [dispatch]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Horário & Planos de Aula</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gere o seu horário semanal e crie planos de aula com IA.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/timetable/new")}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo horário
        </button>
      </div>

      {/* Content */}
      {isLoadingSessions ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-20 text-center">
          <CalendarDays className="h-10 w-10 text-muted-foreground/50" />
          <div>
            <p className="font-medium text-foreground">Nenhum horário criado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crie o seu primeiro horário para começar a gerar planos de aula.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/timetable/new")}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Criar horário
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}
