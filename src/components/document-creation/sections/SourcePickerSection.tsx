"use client";

import { Card } from "@/components/ui/card";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchSources } from "@/store/sources/sourcesSlice";
import { cn } from "@/shared/utils/utils";
import { Routes } from "@/shared/types/routes";
import { AlertCircle, Check, Library, Loader2, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import type { FormUpdateFn } from "../types";

interface SourcePickerSectionProps {
  sourceIds: string[];
  includeAe: boolean;
  subject?: string;
  schoolYear?: number;
  onUpdate: FormUpdateFn;
}

export function SourcePickerSection({
  sourceIds,
  includeAe,
  subject,
  schoolYear,
  onUpdate,
}: SourcePickerSectionProps) {
  const dispatch = useAppDispatch();
  const { sources, loading } = useAppSelector((state) => state.sources);

  useEffect(() => {
    dispatch(fetchSources());
  }, [dispatch]);

  const indexedSources = sources.filter(
    (s) =>
      s.status === "indexed" &&
      (!subject || !s.subject || s.subject === subject) &&
      (!schoolYear || !s.schoolYear || s.schoolYear === schoolYear)
  );

  const toggleSource = (id: string) => {
    const next = sourceIds.includes(id)
      ? sourceIds.filter((s) => s !== id)
      : [...sourceIds, id];
    onUpdate("sourceIds", next);
  };

  return (
    <Card className="p-4 sm:p-6 md:p-8 border-border shadow-sm hover:shadow-md transition-shadow">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-accent shrink-0">
              <Library className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-foreground">
                Fontes de Contexto{" "}
                <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                  (Opcional)
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Escolha quais recursos usar na geração
              </p>
            </div>
          </div>
          <Link
            href={Routes.SOURCES}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline underline-offset-2 shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            Gerir fontes
          </Link>
        </div>

        {/* AE toggle */}
        <div
          className="flex items-center gap-3 p-3 rounded-xl bg-muted cursor-pointer select-none"
          onClick={() => onUpdate("includeAe", !includeAe)}
          role="checkbox"
          aria-checked={includeAe}
          tabIndex={0}
          onKeyDown={(e) => e.key === " " && onUpdate("includeAe", !includeAe)}
        >
          <div
            className={cn(
              "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
              includeAe
                ? "bg-primary border-primary"
                : "border-border bg-background"
            )}
          >
            {includeAe && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
          </div>
          <span className="text-sm font-medium flex-1">
            Incluir Aprendizagens Essenciais (AE)
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              Recomendado
            </span>
          </span>
        </div>

        {/* User sources */}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            A carregar fontes...
          </div>
        ) : indexedSources.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              Sem fontes indexadas.{" "}
              <Link
                href={Routes.SOURCES}
                className="text-primary underline underline-offset-2"
              >
                Carregar documentos
              </Link>{" "}
              para enriquecer a geração.
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              As minhas fontes ({indexedSources.length})
            </p>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {indexedSources.map((source) => {
                const selected = sourceIds.includes(source.id);
                return (
                  <div
                    key={source.id}
                    className={cn(
                      "flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors select-none",
                      selected ? "bg-primary/10" : "hover:bg-muted"
                    )}
                    onClick={() => toggleSource(source.id)}
                    role="checkbox"
                    aria-checked={selected}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === " " && toggleSource(source.id)}
                  >
                    <div
                      className={cn(
                        "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                        selected
                          ? "bg-primary border-primary"
                          : "border-border bg-background"
                      )}
                    >
                      {selected && (
                        <Check className="w-2.5 h-2.5 text-primary-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{source.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {source.chunkCount} segmentos
                        {source.subject && ` · ${source.subject}`}
                        {source.schoolYear && ` · ${source.schoolYear}º ano`}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 uppercase">
                      {source.fileKind}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
