"use client";

import { Button } from "@/components/ui/button";
import { selectIsPresentationCreationEnabled, selectIsWorksheetCreationEnabled } from "@/store/features/selectors";
import { useAppSelector } from "@/store/hooks";
import {
  ClipboardList,
  FileText,
  FolderOpen,
  GraduationCap,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo } from "react";

type EmptyStateVariant = "no-documents" | "no-filter-results" | "no-search-results";

interface DocumentsEmptyStateProps {
  variant: EmptyStateVariant;
  searchQuery?: string;
  filterType?: string;
}

const quickActions = [
  {
    key: "lessonPlan",
    href: "/lesson-plan",
    icon: FileText,
    gradient: "from-emerald-500 to-teal-600",
    bgLight: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  {
    key: "worksheet",
    href: "/worksheet",
    icon: FileText,
    gradient: "from-teal-500 to-cyan-600",
    bgLight: "bg-teal-50 dark:bg-teal-950/30",
  },
  {
    key: "presentation",
    href: "/presentation",
    icon: GraduationCap,
    gradient: "from-blue-500 to-indigo-600",
    bgLight: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    key: "quiz",
    href: "/quiz",
    icon: GraduationCap,
    gradient: "from-amber-500 to-orange-600",
    bgLight: "bg-amber-50 dark:bg-amber-950/30",
  },
  {
    key: "test",
    href: "/test",
    icon: ClipboardList,
    gradient: "from-rose-500 to-pink-600",
    bgLight: "bg-rose-50 dark:bg-rose-950/30",
  },
];

export function DocumentsEmptyState({
  variant,
  searchQuery,
  filterType,
}: DocumentsEmptyStateProps) {
  const t = useTranslations("documents.emptyState");
  const tFilters = useTranslations("documents.filters");
  const tEnums = useTranslations("enums");
  const isPresentationCreationEnabled = useAppSelector(
    selectIsPresentationCreationEnabled
  );
  const isWorksheetCreationEnabled = useAppSelector(
    selectIsWorksheetCreationEnabled
  );

  const availableQuickActions = useMemo(
    () =>
      quickActions.filter((action) => {
        if (action.key === "presentation") {
          return isPresentationCreationEnabled;
        }
        if (action.key === "worksheet") {
          return isWorksheetCreationEnabled;
        }
        return true;
      }),
    [isPresentationCreationEnabled, isWorksheetCreationEnabled]
  );

  const content = useMemo(() => {
    const filterLabel = filterType
      ? tFilters(`types.${filterType}`)
      : t("genericDocuments");
    switch (variant) {
      case "no-search-results":
        return {
          icon: Search,
          title: t("noSearchResults.title"),
          description: t("noSearchResults.description", { query: searchQuery ?? "" }),
          showQuickActions: false,
        };
      case "no-filter-results":
        return {
          icon: FolderOpen,
          title: t("noFilterResults.title", { type: filterLabel }),
          description: t("noFilterResults.description", { type: filterLabel.toLowerCase() }),
          showQuickActions: true,
          singleAction: filterType,
        };
      default:
        return {
          icon: null,
          title: t("noDocuments.title"),
          description: t("noDocuments.description"),
          showQuickActions: true,
        };
    }
  }, [variant, searchQuery, filterType, t, tFilters]);

  const Icon = content.icon;
  const singleActionData = content.singleAction
    ? availableQuickActions.find((action) => action.key === content.singleAction)
    : null;

  return (
    <div className="flex flex-col items-center justify-center px-4 py-16">
      <div className="relative mb-8">
        {variant === "no-documents" ? (
          <div className="relative">
            <div className="absolute -inset-8 rounded-full bg-gradient-to-br from-primary/5 to-primary/10 blur-2xl" />
            <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-accent to-background" />

            <div className="relative flex h-32 w-32 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-primary/80 shadow-xl shadow-primary/25">
              <Sparkles className="h-14 w-14 text-primary-foreground" strokeWidth={1.5} />

              <div className="absolute -right-3 -top-3 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card shadow-lg">
                <FileText className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
              </div>
              <div className="absolute -bottom-2 -left-4 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card shadow-lg">
                <ClipboardList className="h-5 w-5 text-rose-500 dark:text-rose-400" />
              </div>
              <div className="absolute right-[-1.5rem] top-1/2 flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card shadow-lg">
                <GraduationCap className="h-4 w-4 text-amber-500 dark:text-amber-400" />
              </div>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute -inset-4 rounded-full bg-gradient-to-br from-muted to-muted/50 blur-xl opacity-50" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-muted to-muted/80">
              {Icon && <Icon className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />}
            </div>
          </div>
        )}
      </div>

      <div className="mb-8 max-w-md text-center">
        <h3 className="mb-2 text-xl font-semibold text-foreground">
          {content.title}
        </h3>
        <p className="text-base leading-relaxed text-muted-foreground">
          {content.description}
        </p>
      </div>

      {content.showQuickActions && availableQuickActions.length > 0 && (
        <div className="w-full max-w-2xl">
          {singleActionData ? (
            <div className="flex justify-center">
              <Link href={singleActionData.href}>
                <Button
                  size="lg"
                  className="rounded-xl bg-primary px-8 py-6 font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  {t("createAction", { type: tEnums(`documentType.${singleActionData.key}`) })}
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <p className="mb-4 text-center text-sm text-muted-foreground">
                {t("chooseType")}
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {availableQuickActions.map((action) => {
                  const ActionIcon = action.icon;
                  return (
                    <Link
                      key={action.href}
                      href={action.href}
                      className="group relative"
                    >
                      <div
                        className={`
                          relative flex flex-col items-center rounded-2xl border border-border p-4 transition-all duration-200
                          hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5
                          sm:p-5 ${action.bgLight}
                        `}
                      >
                        <div
                          className={`
                            mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br shadow-md transition-transform
                            group-hover:scale-110 ${action.gradient}
                          `}
                        >
                          <ActionIcon className="h-6 w-6 text-white" />
                        </div>

                        <span className="text-center text-sm font-medium text-foreground">
                          {tEnums(`documentType.${action.key}`)}
                        </span>

                        <span className="mt-1 hidden text-center text-xs text-muted-foreground sm:block">
                          {t(`quickActionDescriptions.${action.key}`)}
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

      {variant === "no-search-results" && (
        <div className="mt-6 max-w-md rounded-xl border border-border bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground">
            {t("searchHint")}
          </p>
        </div>
      )}
    </div>
  );
}
