/**
 * Resource Grid Component
 * Grid layout for displaying shared resources with pagination
 */

"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Routes } from "@/shared/types";
import type { SharedResource } from "@/services/api/community.service";
import { BookOpen, ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ResourceCard } from "./ResourceCard";

interface ResourceGridProps {
  resources: SharedResource[];
  pagination: {
    page: number;
    size: number;
    totalCount: number;
    totalPages: number;
  };
  onReuse: (resourceId: string) => void;
  onPreview: (resourceId: string) => void;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  isReusing?: boolean;
  reusingResourceId?: string;
  reusedResourceIds?: string[];
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  onShare?: () => void;
}

export function ResourceGrid({
  resources,
  pagination,
  onReuse,
  onPreview,
  onPageChange,
  isLoading = false,
  isReusing = false,
  reusingResourceId,
  reusedResourceIds = [],
  hasActiveFilters = false,
  onClearFilters,
  onShare,
}: ResourceGridProps) {
  const t = useTranslations("community.resourceGrid");

  if (isLoading) return <ResourceGridSkeleton />;

  if (resources.length === 0) {
    return hasActiveFilters && onClearFilters ? (
      <EmptyState
        icon={SearchX}
        title={t("emptyFilteredTitle")}
        description={t("emptyFilteredDescription")}
        actions={
          <Button size="sm" onClick={onClearFilters}>
            {t("clearFilters")}
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={BookOpen}
        title={t("emptyTitle")}
        description={t("emptyDescription")}
        actions={
          onShare ? (
            <Button size="sm" onClick={onShare}>
              {t("shareAction")}
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link href={Routes.DOCUMENTS}>{t("shareFromDocuments")}</Link>
            </Button>
          )
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Resource Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {resources.map((resource) => (
          <ResourceCard
            key={resource.id}
            resource={resource}
            onReuse={onReuse}
            onPreview={onPreview}
            isReusing={isReusing && reusingResourceId === resource.id}
            isAlreadyReused={reusedResourceIds.includes(resource.id)}
          />
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-sm text-muted-foreground sm:text-left">
            {t.rich("showingCount", {
              shown: resources.length,
              total: pagination.totalCount,
              b: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
            })}
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              {t("previous")}
            </Button>

            <span className="text-sm text-muted-foreground px-2">
              {pagination.page + 1} / {pagination.totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages - 1}
            >
              {t("next")}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
/** Same shell as ResourceCard: accent strip, type chip, title, tags, author row, two buttons. */
function ResourceCardSkeleton() {
  return (
    <Card className="flex h-full flex-col overflow-hidden border border-border">
      <Skeleton className="h-1 w-full rounded-none" />
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <Skeleton className="mb-3 h-5 w-24 rounded-full" />
        <Skeleton className="mb-2 h-5 w-4/5" />
        <Skeleton className="mb-4 h-5 w-1/2" />
        <div className="mb-4 mt-auto flex gap-1.5">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="mb-3 flex items-center justify-between border-t border-border pt-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-8" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 flex-1" />
        </div>
      </div>
    </Card>
  );
}

export function ResourceGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <ResourceCardSkeleton key={i} />
      ))}
    </div>
  );
}
