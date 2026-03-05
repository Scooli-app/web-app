/**
 * Community Filters Component
 * Grade, Subject, Resource Type filtering for Community Library
 */

"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  GRADE_OPTIONS,
  RESOURCE_TYPE_OPTIONS,
  SUBJECT_OPTIONS,
  type DiscoverResourcesParams
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
  
  const handleFilterChange = (key: keyof DiscoverResourcesParams, value: string | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value === "all" ? undefined : value
    });
  };

  const handleSortChange = (value: string) => {
    onFiltersChange({
      ...filters,
      sortBy: value as "popular" | "recent"
    });
  };

  const handleSearchChange = (value: string) => {
    onFiltersChange({
      ...filters,
      search: value === "" ? undefined : value
    });
  };

  const clearFilters = () => {
    onFiltersChange({ sortBy: filters.sortBy || "popular" });
  };

  const hasActiveFilters = filters.grade || filters.subject || filters.resourceType || filters.search;

  return (
    <div className="bg-card px-3 py-3 sm:px-4 rounded-xl border border-border space-y-2">
      {/* Row 1: Search + action buttons */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5 pointer-events-none" />
          <Input
            id="community-search"
            type="text"
            placeholder="Pesquisar recursos..."
            value={filters.search || ""}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8 h-8 text-sm"
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
          />
        </div>

        {hasActiveFilters && (
          <Button variant="ghost" onClick={clearFilters} size="sm" className="h-8 px-2.5 flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Row 2: Dropdowns — 2 cols mobile → 4 cols desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Select
          value={filters.grade || "all"}
          onValueChange={(value) => handleFilterChange("grade", value)}
        >
          <SelectTrigger className="h-8 text-xs w-full">
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
          <SelectTrigger className="h-8 text-xs w-full">
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
          <SelectTrigger className="h-8 text-xs w-full">
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

        <Select
          value={filters.sortBy || "popular"}
          onValueChange={handleSortChange}
        >
          <SelectTrigger className="h-8 text-xs w-full">
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