/**
 * Community Filters Component
 * Grade, Subject, Resource Type filtering for Community Library
 */

"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  isLoading = false 
}: CommunityFiltersProps) {
  
  const handleFilterChange = (key: keyof DiscoverResourcesParams, value: string | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value === "" ? undefined : value
    });
  };

  const handleSearchChange = (value: string) => {
    onFiltersChange({
      ...filters,
      search: value === "" ? undefined : value
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      sortBy: filters.sortBy || "popular"
    });
  };

  const hasActiveFilters = filters.grade || filters.subject || filters.resourceType || filters.search;

  return (
    <div className="bg-card p-4 rounded-lg border space-y-4">
      {/* Search */}
      <div className="space-y-2">
        <Label htmlFor="search">Pesquisar recursos</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            id="search"
            type="text"
            placeholder="Pesquisar por título ou descrição..."
            value={filters.search || ""}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
          />
        </div>
      </div>

      {/* Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Grade Filter */}
        <div className="space-y-2">
          <Label>Ano</Label>
          <Select
            value={filters.grade || ""}
            onValueChange={(value) => handleFilterChange("grade", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecionar ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os anos</SelectItem>
              {GRADE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Subject Filter */}
        <div className="space-y-2">
          <Label>Disciplina</Label>
          <Select
            value={filters.subject || ""}
            onValueChange={(value) => handleFilterChange("subject", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecionar disciplina" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas as disciplinas</SelectItem>
              {SUBJECT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Resource Type Filter */}
        <div className="space-y-2">
          <Label>Tipo de Recurso</Label>
          <Select
            value={filters.resourceType || ""}
            onValueChange={(value) => handleFilterChange("resourceType", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecionar tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os tipos</SelectItem>
              {RESOURCE_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Sort Options */}
      <div className="flex items-center gap-4">
        <div className="space-y-2 flex-1">
          <Label>Ordenar por</Label>
          <Select
            value={filters.sortBy || "popular"}
            onValueChange={(value) => handleFilterChange("sortBy", value as "popular" | "recent")}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Mais Reutilizados</SelectItem>
              <SelectItem value="recent">Mais Recentes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 self-end">
          <Button 
            onClick={onSearch}
            disabled={isLoading}
            className="min-w-24"
          >
            <Search className="w-4 h-4 mr-2" />
            {isLoading ? "Pesquisando..." : "Pesquisar"}
          </Button>
          
          {hasActiveFilters && (
            <Button
              variant="outline"
              onClick={clearFilters}
              size="default"
            >
              <X className="w-4 h-4 mr-2" />
              Limpar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}