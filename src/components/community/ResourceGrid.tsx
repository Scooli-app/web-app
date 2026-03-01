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
}

export function ResourceGrid({
  resources,
  pagination,
  onReuse,
  onPreview,
  onPageChange,
  isLoading = false,
  isReusing = false,
  reusingResourceId
}: ResourceGridProps) {
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Loading skeleton */}
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-muted rounded-lg h-48 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground mb-4">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-semibold">Nenhum recurso encontrado</h3>
          <p className="text-sm mt-2">
            Tente ajustar os filtros ou seja o primeiro a partilhar recursos desta categoria!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resource Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resources.map((resource) => (
          <ResourceCard
            key={resource.id}
            resource={resource}
            onReuse={onReuse}
            onPreview={onPreview}
            isReusing={isReusing && reusingResourceId === resource.id}
          />
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {resources.length} de {pagination.totalCount} recursos
          </p>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Anterior
            </Button>
            
            <span className="text-sm px-4">
              Página {pagination.page + 1} de {pagination.totalPages}
            </span>
            
            <Button
              variant="outline" 
              size="sm"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages - 1}
            >
              Próximo
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}