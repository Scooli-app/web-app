"use client";

import { ExternalLink, FileText, HardDrive, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Routes } from "@/shared/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectIndexedUserSources,
  selectUserSourcesLoading,
} from "@/store/user-sources/selectors";
import { fetchUserSources } from "@/store/user-sources/userSourcesSlice";
import type { FormUpdateFn } from "../types";

interface SourcePickerSectionProps {
  selectedSourceIds: string[];
  includeAe: boolean;
  onUpdate: FormUpdateFn;
}

export function SourcePickerSection({
  selectedSourceIds,
  includeAe,
  onUpdate,
}: SourcePickerSectionProps) {
  const dispatch = useAppDispatch();
  const indexedSources = useAppSelector(selectIndexedUserSources);
  const loading = useAppSelector(selectUserSourcesLoading);

  useEffect(() => {
    dispatch(fetchUserSources());
  }, [dispatch]);

  const handleToggleSource = (id: string) => {
    const updated = selectedSourceIds.includes(id)
      ? selectedSourceIds.filter((sid) => sid !== id)
      : [...selectedSourceIds, id];
    onUpdate("sourceIds", updated);
  };

  return (
    <Card className="p-4 sm:p-6 md:p-8 border-border shadow-sm hover:shadow-md transition-shadow">
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-accent shrink-0">
              <HardDrive className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-foreground">
                Fontes de contexto{" "}
                <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                  (Opcional)
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Adiciona os teus recursos como contexto para a geração
              </p>
            </div>
          </div>
          <Link
            href={Routes.MY_SOURCES}
            className="shrink-0 flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Gerir
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        {/* Include AE curriculum toggle */}
        <div
          className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border cursor-pointer select-none"
          onClick={() => onUpdate("includeAe", !includeAe)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") onUpdate("includeAe", !includeAe);
          }}
          aria-label={`Currículo nacional ${includeAe ? "ativado" : "desativado"}`}
        >
          <div>
            <p className="text-sm font-medium text-foreground">
              Currículo nacional (AE)
            </p>
            <p className="text-xs text-muted-foreground">
              Incluir as Aprendizagens Essenciais na geração
            </p>
          </div>
          <div
            className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 shrink-0 ${
              includeAe ? "bg-primary" : "bg-muted-foreground/30"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                includeAe ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </div>
        </div>

        {/* User sources list */}
        {loading && indexedSources.length === 0 ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : indexedSources.length === 0 ? (
          <div className="text-center py-3">
            <p className="text-sm text-muted-foreground mb-1.5">
              Nenhum recurso disponível
            </p>
            <Link
              href={Routes.MY_SOURCES}
              className="text-xs text-primary hover:underline"
            >
              Carregar o primeiro ficheiro →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {indexedSources.map((source) => {
              const isSelected = selectedSourceIds.includes(source.id);
              return (
                <div
                  key={source.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-primary/5 border-primary/20"
                      : "bg-background border-border hover:bg-muted/50"
                  }`}
                  onClick={() => handleToggleSource(source.id)}
                  role="checkbox"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter")
                      handleToggleSource(source.id);
                  }}
                >
                  <div
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/40 bg-background"
                    }`}
                  >
                    {isSelected && (
                      <svg
                        className="w-2.5 h-2.5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {source.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {source.subject && (
                        <Badge
                          variant="secondary"
                          className="text-xs px-1.5 py-0"
                        >
                          {source.subject}
                        </Badge>
                      )}
                      {source.schoolYear && (
                        <Badge
                          variant="secondary"
                          className="text-xs px-1.5 py-0"
                        >
                          {source.schoolYear}º
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {source.chunkCount} secções
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
