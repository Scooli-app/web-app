"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getDocumentPreview } from "@/shared/utils/documentPreview";
import { formatClassName } from "@/shared/utils/className";
import { useAppSelector } from "@/store/hooks";
import { selectWorkspaceContext } from "@/store/workspace/selectors";
import { Routes, type Document } from "@/shared/types";
import { translateSubject } from "@/components/document-creation/constants";
import {
  Building2,
  FileText,
  GanttChart,
  Globe2,
  HelpCircle,
  MonitorPlay,
  MoreHorizontal,
  NotebookPen,
  ScrollText,
  Trash2,
  Upload,
  User,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { memo, useCallback, useMemo } from "react";

interface DocumentCardProps {
  document: Document;
  isSelected?: boolean;
  onSelect?: (documentId: string, selected: boolean) => void;
  onDelete?: (documentId: string) => void;
  selectionMode?: boolean;
  /** Shown inside its turma's section: the turma is the heading, so the card names the lesson instead. */
  inClassSection?: boolean;
}

const DOCUMENT_TYPE_COLORS: Record<Document["documentType"], string> = {
  lessonPlan: "bg-primary text-primary-foreground",
  worksheet: "bg-teal-500 text-white dark:bg-teal-600",
  test: "bg-orange-500 text-white dark:bg-orange-600",
  quiz: "bg-amber-500 text-white dark:bg-amber-600",
  presentation: "bg-rose-500 text-white dark:bg-rose-600",
  curriculumPlan: "bg-indigo-500 text-white dark:bg-indigo-600",
};

const DOCUMENT_TYPE_ICONS: Record<Document["documentType"], LucideIcon> = {
  lessonPlan: FileText,
  worksheet: ScrollText,
  test: NotebookPen,
  quiz: HelpCircle,
  presentation: MonitorPlay,
  curriculumPlan: GanttChart,
};

const ROUTE_MAP: Record<Document["documentType"], string> = {
  lessonPlan: Routes.LESSON_PLAN,
  worksheet: Routes.WORKSHEET,
  presentation: Routes.PRESENTATION,
  test: Routes.TEST,
  quiz: Routes.QUIZ,
  curriculumPlan: Routes.CURRICULUM_PLAN,
};

const dateFormatter = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function getDocumentRoute(document: Document): string {
  return `${ROUTE_MAP[document.documentType]}/${document.id}`;
}

function formatDate(dateString: string) {
  return dateFormatter.format(new Date(dateString));
}

function DocumentCardComponent({
  document,
  isSelected = false,
  onSelect,
  onDelete,
  selectionMode = false,
  inClassSection = false,
}: DocumentCardProps) {
  const t = useTranslations("documents.card");
  const tEnums = useTranslations("enums");
  const tTimetable = useTranslations("timetable");
  const tLesson = useTranslations("editor.lessonContext");
  const locale = useLocale();
  const workspace = useAppSelector(selectWorkspaceContext);
  const organizationName = workspace?.organization?.name ?? null;

  const handleCheckboxChange = useCallback(
    (checked: boolean) => {
      onSelect?.(document.id, checked);
    },
    [document.id, onSelect]
  );

  const handleDeleteSelect = useCallback(() => {
    onDelete?.(document.id);
  }, [document.id, onDelete]);

  const typeLabel = useMemo(
    () => tEnums(`documentType.${document.documentType}`) || document.documentType,
    [document.documentType, tEnums]
  );
  const typeColor = useMemo(
    () =>
      DOCUMENT_TYPE_COLORS[document.documentType] ||
      "bg-secondary text-secondary-foreground",
    [document.documentType]
  );
  const TypeIcon = useMemo(
    () => DOCUMENT_TYPE_ICONS[document.documentType] || FileText,
    [document.documentType]
  );
  const documentRoute = useMemo(() => getDocumentRoute(document), [document]);
  const createdDate = useMemo(() => formatDate(document.createdAt), [document.createdAt]);
  const noContentText = t("noContent");
  const contentPreview = useMemo(
    () => getDocumentPreview(document.content) || noContentText,
    [document.content, noContentText]
  );

  // Derive which scope chips to render. `sharedScopes` is the source of truth
  // (backend-populated), but we fall back to `sharedResourceId` so documents
  // created before the `sharedScopes` field existed still render a chip.
  const sharedScopes = useMemo(() => {
    const scopes = new Set<"community" | "organization">();
    for (const scope of document.sharedScopes ?? []) {
      if (scope === "community" || scope === "organization") {
        scopes.add(scope);
      }
    }
    // Backwards compatibility: if no scope info but the legacy pointer is set,
    // assume it was shared with the community library.
    if (scopes.size === 0 && document.sharedResourceId) {
      scopes.add("community");
    }
    return scopes;
  }, [document.sharedScopes, document.sharedResourceId]);

  const lessonDate = document.classInfo?.lessonDate
    ? new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" })
        .format(new Date(`${document.classInfo.lessonDate}T00:00:00`))
        .replace(/\./g, "")
    : null;
  const lessonLabel = [
    document.classInfo?.lessonNumber ? tLesson("lessonNumber", { number: document.classInfo.lessonNumber }) : null,
    lessonDate,
  ]
    .filter(Boolean)
    .join(" · ");

  const orgChipLabel = organizationName
    ? organizationName
    : t("schoolFallback");

  const cardContent = (
    <>
      {selectionMode && (
        <div
          className="absolute left-4 top-4 z-10"
          onClick={(event) => event.stopPropagation()}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={handleCheckboxChange}
          />
        </div>
      )}

      <div className={`flex h-full flex-col ${selectionMode ? "ml-6" : ""}`}>
        <div className="mb-4 flex w-full flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 md:flex-initial">
            <TypeIcon className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" />
            <Badge
              className={`${typeColor} shrink-0 whitespace-nowrap px-2 py-1 text-xs font-medium`}
            >
              {typeLabel}
            </Badge>
            {document.originalFormat && (
              <Badge
                title={t("importedFrom", { format: document.originalFormat.toUpperCase() })}
                className="shrink-0 whitespace-nowrap border border-violet-400/40 bg-violet-400/10 px-2 py-1 text-xs font-medium text-violet-700 dark:text-violet-300"
              >
                <Upload className="mr-1 h-3 w-3" />
                {t("imported")}
              </Badge>
            )}
            {sharedScopes.has("community") && (
              <Badge
                title={t("sharedCommunityTitle")}
                className="shrink-0 whitespace-nowrap border border-teal-500/30 bg-teal-500/15 px-2 py-1 text-xs font-medium text-teal-700 dark:text-teal-400"
              >
                <Globe2 className="mr-1 h-3 w-3" />
                {t("community")}
              </Badge>
            )}
            {sharedScopes.has("organization") && (
              <Badge
                title={t("sharedOrgTitle", { org: orgChipLabel })}
                className="shrink-0 max-w-[10rem] whitespace-nowrap border border-amber-400/40 bg-amber-400/15 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-300"
              >
                <Building2 className="mr-1 h-3 w-3" />
                <span className="truncate">{orgChipLabel}</span>
              </Badge>
            )}
          </div>
        </div>

        {document.classInfo && (
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: document.classInfo.color || "#7F77DD" }}
            />
            <span className="truncate">
              {inClassSection && lessonLabel
                ? lessonLabel
                : formatClassName(document.classInfo, {
                    gradeShort: (grade) => tTimetable("gradeShort", { grade }),
                    subject: translateSubject,
                  })}
            </span>
          </p>
        )}

        <h3 className="mb-3 line-clamp-2 text-lg font-semibold leading-tight text-foreground">
          {document.title}
        </h3>

        <p className="mb-4 flex-grow line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {contentPreview}
        </p>

        {/* A turma's document already says its subject and year in the line above. */}
        {!document.classInfo && (document.subject || document.gradeLevel) && (
          <div className="mb-4 space-y-1.5">
            {document.subject && (
              <div className="flex items-center text-xs text-muted-foreground">
                <FileText className="mr-2 h-3 w-3 shrink-0" />
                <span className="truncate">{translateSubject(document.subject)}</span>
              </div>
            )}
            {document.gradeLevel && (
              <div className="flex items-center text-xs text-muted-foreground">
                <User className="mr-2 h-3 w-3 shrink-0" />
                <span>{t("gradeYear", { grade: document.gradeLevel })}</span>
              </div>
            )}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
          <p className="truncate text-xs text-muted-foreground">
            {t("createdOn", { date: createdDate })}
          </p>
          {!selectionMode && onDelete && (
            // The card is a link: keep clicks on the menu from opening the document.
            <div onClick={(event) => { event.preventDefault(); event.stopPropagation(); }}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={t("moreActions")}
                    className="action-button h-auto w-auto shrink-0 p-1 text-muted-foreground hover:bg-accent"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={handleDeleteSelect}
                    className="gap-2 text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t("delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </>
  );

  const cardClassName = `relative flex h-full w-full flex-col border border-border p-4 transition-all duration-200 sm:p-6 ${
    selectionMode
      ? "cursor-default"
      : "cursor-pointer hover:border-primary/20 hover:shadow-lg"
  } ${isSelected ? "border-primary bg-primary/5" : ""}`;

  if (selectionMode) {
    return <Card className={cardClassName}>{cardContent}</Card>;
  }

  return (
    <Link href={documentRoute} className="block h-full">
      <Card className={cardClassName}>{cardContent}</Card>
    </Link>
  );
}

export const DocumentCard = memo(DocumentCardComponent);
