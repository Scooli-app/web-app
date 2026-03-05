/**
 * Resource Grid Component
 * Grid layout for displaying shared resources with pagination
 */

"use client";

import { Button } from "@/components/ui/button";
import type { SharedResource } from "@/services/api/community.service";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  reusedResourceIds = []
}: ResourceGridProps) {
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="animate-pulse rounded-xl border border-border bg-card p-4 sm:p-5 h-52">
            <div className="h-4 bg-muted rounded-md w-3/4 mb-3" />
            <div className="h-3 bg-muted rounded-md w-full mb-1.5" />
            <div className="h-3 bg-muted rounded-md w-2/3 mb-4" />
            <div className="flex gap-2 mb-4">
              <div className="h-5 bg-muted rounded-full w-16" />
              <div className="h-5 bg-muted rounded-full w-20" />
              <div className="h-5 bg-muted rounded-full w-14" />
            </div>
            <div className="flex gap-2 mt-auto pt-3 border-t border-border">
              <div className="h-8 bg-muted rounded-md flex-1" />
              <div className="h-8 bg-muted rounded-md flex-1" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">📚</div>
        <h3 className="text-lg font-semibold text-foreground mb-1">Nenhum recurso encontrado</h3>
        <p className="text-sm text-muted-foreground">
          Tente ajustar os filtros ou seja o primeiro a partilhar recursos desta categoria!
        </p>
      </div>
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
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Mostrando <span className="font-medium text-foreground">{resources.length}</span> de <span className="font-medium text-foreground">{pagination.totalCount}</span> recursos
          </p>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Anterior
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
              Próximo
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}