"use client";

import { dashboardCache, CACHE_KEYS, CACHE_TTL } from "@/lib/dashboardCache";
import { getDocuments } from "@/services/api/document.service";
import { Routes, type Document } from "@/shared/types";
import { cn } from "@/shared/utils/utils";
import { useAuth } from "@clerk/nextjs";
import {
  FileText,
  GanttChart,
  HelpCircle,
  MonitorPlay,
  NotebookPen,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import posthog from "posthog-js";
import { useEffect, useState } from "react";

const TYPE_LABELS: Record<Document["documentType"], string> = {
  lessonPlan: "Plano de Aula",
  worksheet: "Ficha de Trabalho",
  test: "Teste",
  quiz: "Quiz",
  presentation: "Apresentação",
  curriculumPlan: "Planificação",
};

const TYPE_ICONS: Record<Document["documentType"], LucideIcon> = {
  lessonPlan: FileText,
  worksheet: ScrollText,
  test: NotebookPen,
  quiz: HelpCircle,
  presentation: MonitorPlay,
  curriculumPlan: GanttChart,
};

const TYPE_ROUTES: Record<Document["documentType"], string> = {
  lessonPlan: Routes.LESSON_PLAN,
  worksheet: Routes.WORKSHEET,
  test: Routes.TEST,
  quiz: Routes.QUIZ,
  presentation: Routes.PRESENTATION,
  curriculumPlan: Routes.CURRICULUM_PLAN,
};

const dateFormatter = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "short",
});

const RECENT_LIMIT = 5;

export function RecentDocumentsCard({ className }: { className?: string }) {
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const isAuthReady = isAuthLoaded && Boolean(isSignedIn);

  // null = loading; [] = loaded but empty
  const [documents, setDocuments] = useState<Document[] | null>(null);

  useEffect(() => {
    if (!isAuthReady) return;

    const cached = dashboardCache.get<Document[]>(CACHE_KEYS.RECENT_DOCUMENTS, CACHE_TTL.RECENT_DOCUMENTS);
    if (cached) {
      setDocuments(cached);
      return;
    }

    let cancelled = false;
    getDocuments({ page: 1, limit: RECENT_LIMIT })
      .then((result) => {
        if (!cancelled) {
          dashboardCache.set(CACHE_KEYS.RECENT_DOCUMENTS, result.documents);
          setDocuments(result.documents);
        }
      })
      .catch((error) => {
        console.error("Error fetching recent documents:", error);
        if (!cancelled) setDocuments([]);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthReady]);

  return (
    <div className={cn("rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">
          Continuar onde ficaste
        </h2>
        {documents !== null && documents.length > 0 && (
          <Link
            href={Routes.DOCUMENTS}
            className="shrink-0 text-sm font-medium text-primary hover:underline"
          >
            Ver todos
          </Link>
        )}
      </div>

      {documents === null ? (
        <div className="animate-pulse space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-muted" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-foreground">
              Ainda não tens documentos.
            </span>
          </div>
          <p className="pl-5 text-sm text-muted-foreground">
            Cria o teu primeiro plano de aula, teste ou quiz e ele aparece
            aqui para continuares onde ficaste.
          </p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {documents.map((document) => {
            const Icon = TYPE_ICONS[document.documentType] ?? FileText;
            const route = TYPE_ROUTES[document.documentType];
            if (!route) return null;
            return (
              <li key={document.id}>
                <Link
                  href={`${route}/${document.id}`}
                  onClick={() =>
                    posthog.capture("dashboard_recent_document_clicked", {
                      document_type: document.documentType,
                    })
                  }
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-accent"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {document.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {TYPE_LABELS[document.documentType] ??
                        document.documentType}
                      {" · "}
                      {dateFormatter.format(new Date(document.updatedAt))}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
