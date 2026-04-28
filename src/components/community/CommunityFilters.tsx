/**
 * Community Filters Component
 * Grade, Subject, Resource Type filtering for Community Library
 */

"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GRADE_OPTIONS,
  RESOURCE_TYPE_OPTIONS,
  SUBJECT_OPTIONS,
  type DiscoverResourcesParams,
} from "@/services/api/community.service";
import { Search, X } from "lucide-react";

interface CommunityFiltersProps {
  filters: DiscoverResourcesParams;
  onFiltersChange: (filters: DiscoverResourcesParams) => void;
  onSearch: () => void;
  isLoading?: boolean;
}

export function CommunityFilters({
  filters,
  onFiltersChange,
  onSearch,
}: CommunityFiltersProps) {
  const handleFilterChange = (
    key: keyof DiscoverResourcesParams,
    value: string | undefined,
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value === "all" ? undefined : value,
    });
  };

  const handleSortChange = (value: string) => {
    onFiltersChange({
      ...filters,
      sortBy: value as "popular" | "recent",
    });
  };

  const handleSearchChange = (value: string) => {
    onFiltersChange({
      ...filters,
      search: value === "" ? undefined : value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({ sortBy: filters.sortBy || "popular" });
  };

  const hasActiveFilters =
    filters.grade || filters.subject || filters.resourceType || filters.search;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card px-3 py-3 sm:px-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="community-search"
            type="text"
            placeholder="Pesquisar recursos..."
            value={filters.search || ""}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-10 pl-9 text-sm sm:h-9"
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
          />
        </div>

        <div className="flex items-center gap-2 sm:w-auto">
          <Button
            type="button"
            onClick={onSearch}
            size="sm"
            className="h-10 flex-1 px-4 sm:h-9 sm:flex-none"
          >
            Pesquisar
          </Button>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              onClick={clearFilters}
              size="sm"
              className="h-10 px-3 sm:h-9 sm:px-2.5"
            >
              <X className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              <span className="ml-1 text-xs sm:hidden">Limpar</span>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Select
          value={filters.grade || "all"}
          onValueChange={(value) => handleFilterChange("grade", value)}
        >
          <SelectTrigger className="h-10 w-full text-sm sm:h-9 sm:text-xs">
            <SelectValue placeholder="Ano escolar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os anos</SelectItem>
            {GRADE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.subject || "all"}
          onValueChange={(value) => handleFilterChange("subject", value)}
        >
          <SelectTrigger className="h-10 w-full text-sm sm:h-9 sm:text-xs">
            <SelectValue placeholder="Disciplina" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as disciplinas</SelectItem>
            {SUBJECT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.resourceType || "all"}
          onValueChange={(value) => handleFilterChange("resourceType", value)}
        >
          <SelectTrigger className="h-10 w-full text-sm sm:h-9 sm:text-xs">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {RESOURCE_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.sortBy || "popular"} onValueChange={handleSortChange}>
          <SelectTrigger className="h-10 w-full text-sm sm:h-9 sm:text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="popular">Mais Reutilizados</SelectItem>
            <SelectItem value="recent">Mais Recentes</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
