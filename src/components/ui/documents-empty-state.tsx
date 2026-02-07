"use client";

import { Button } from "@/components/ui/button";
import {
  FileText,
  GraduationCap,
  Presentation,
  ClipboardList,
  Search,
  FolderOpen,
  Plus,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

type EmptyStateVariant = "no-documents" | "no-filter-results" | "no-search-results";

interface DocumentsEmptyStateProps {
  variant: EmptyStateVariant;
  searchQuery?: string;
  filterType?: string;
}

const documentTypeLabels: Record<string, string> = {
  lessonPlan: "Planos de Aula",
  quiz: "Quizzes",
  presentation: "Apresentações",
  test: "Testes",
};

const quickActions = [
  {
    label: "Plano de Aula",
    href: "/lesson-plan",
    icon: FileText,
    description: "Estruture as suas aulas",
    gradient: "from-emerald-500 to-teal-600",
    bgLight: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  {
    label: "Apresentação",
    href: "/presentation",
    icon: Presentation,
    description: "Crie slides interativos",
    gradient: "from-blue-500 to-indigo-600",
    bgLight: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    label: "Quiz",
    href: "/quiz",
    icon: GraduationCap,
    description: "Avalie conhecimentos",
    gradient: "from-amber-500 to-orange-600",
    bgLight: "bg-amber-50 dark:bg-amber-950/30",
  },
  {
    label: "Teste",
    href: "/test",
    icon: ClipboardList,
    description: "Crie avaliações formais",
    gradient: "from-rose-500 to-pink-600",
    bgLight: "bg-rose-50 dark:bg-rose-950/30",
  },
];

export function DocumentsEmptyState({
  variant,
  searchQuery,
  filterType,
}: DocumentsEmptyStateProps) {
  const content = useMemo(() => {
    switch (variant) {
      case "no-search-results":
        return {
          icon: Search,
          title: "Nenhum resultado encontrado",
          description: `Não encontrámos documentos para "${searchQuery}". Tente usar termos diferentes ou verifique a ortografia.`,
          showQuickActions: false,
        };
      case "no-filter-results":
        return {
          icon: FolderOpen,
          title: `Sem ${documentTypeLabels[filterType || ""] || "documentos"}`,
          description: `Ainda não tem ${(documentTypeLabels[filterType || ""] || "documentos").toLowerCase()}. Que tal criar o primeiro?`,
          showQuickActions: true,
          singleAction: filterType,
        };
      default:
        return {
          icon: null,
          title: "Comece a criar!",
          description:
            "A sua biblioteca de documentos está vazia. Deixe a IA ajudá-lo a criar materiais de ensino em segundos.",
          showQuickActions: true,
        };
    }
  }, [variant, searchQuery, filterType]);

  const Icon = content.icon;
  const singleActionData = content.singleAction
    ? quickActions.find(
        (action) =>
          action.href === `/${content.singleAction?.replace("lessonPlan", "lesson-plan")}`
      )
    : null;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {/* Illustration Area */}
      <div className="relative mb-8">
        {variant === "no-documents" ? (
          <div className="relative">
            {/* Decorative background circles */}
            <div className="absolute -inset-8 rounded-full bg-gradient-to-br from-primary/5 to-primary/10 blur-2xl" />
            <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-accent to-background" />
            
            {/* Main icon container */}
            <div className="relative flex items-center justify-center w-32 h-32 rounded-3xl bg-gradient-to-br from-primary to-primary/80 shadow-xl shadow-primary/25">
              <Sparkles className="w-14 h-14 text-primary-foreground" strokeWidth={1.5} />
              
              {/* Floating mini icons */}
              <div className="absolute -top-3 -right-3 w-10 h-10 rounded-xl bg-card shadow-lg flex items-center justify-center border border-border">
                <FileText className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
              </div>
              <div className="absolute -bottom-2 -left-4 w-10 h-10 rounded-xl bg-card shadow-lg flex items-center justify-center border border-border">
                <Presentation className="w-5 h-5 text-blue-500 dark:text-blue-400" />
              </div>
              <div className="absolute top-1/2 -right-6 w-8 h-8 rounded-lg bg-card shadow-lg flex items-center justify-center border border-border">
                <GraduationCap className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              </div>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute -inset-4 rounded-full bg-gradient-to-br from-muted to-muted/50 blur-xl opacity-50" />
            <div className="relative flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-muted to-muted/80">
              {Icon && <Icon className="w-10 h-10 text-muted-foreground" strokeWidth={1.5} />}
            </div>
          </div>
        )}
      </div>

      {/* Text Content */}
      <div className="text-center max-w-md mb-8">
        <h3 className="text-xl font-semibold text-foreground mb-2">
          {content.title}
        </h3>
        <p className="text-muted-foreground text-base leading-relaxed">
          {content.description}
        </p>
      </div>

      {/* Quick Actions */}
      {content.showQuickActions && (
        <div className="w-full max-w-2xl">
          {singleActionData ? (
            <div className="flex justify-center">
              <Link href={singleActionData.href}>
                <Button 
                  size="lg" 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 rounded-xl font-medium shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Criar {singleActionData.label}
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Escolha um tipo de documento para começar
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {quickActions.map((action) => {
                  const ActionIcon = action.icon;
                  return (
                    <Link
                      key={action.href}
                      href={action.href}
                      className="group relative"
                    >
                      <div className={`
                        relative flex flex-col items-center p-4 sm:p-5 rounded-2xl border border-border
                        ${action.bgLight}
                        transition-all duration-200
                        hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5
                        hover:-translate-y-1
                      `}>
                        {/* Icon with gradient background */}
                        <div className={`
                          flex items-center justify-center w-12 h-12 rounded-xl mb-3
                          bg-gradient-to-br ${action.gradient}
                          shadow-md transition-transform group-hover:scale-110
                        `}>
                          <ActionIcon className="w-6 h-6 text-white" />
                        </div>
                        
                        {/* Label */}
                        <span className="font-medium text-sm text-foreground text-center">
                          {action.label}
                        </span>
                        
                        {/* Description - hidden on mobile */}
                        <span className="hidden sm:block text-xs text-muted-foreground text-center mt-1">
                          {action.description}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Search tips for no results */}
      {variant === "no-search-results" && (
        <div className="mt-6 p-4 rounded-xl bg-muted/50 border border-border max-w-md">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Sugestões:</span>
            <br />
            • Verifique se as palavras estão escritas corretamente
            <br />
            • Tente usar termos mais gerais
            <br />
            • Remova alguns filtros para ver mais resultados
          </p>
        </div>
      )}
    </div>
  );
}
