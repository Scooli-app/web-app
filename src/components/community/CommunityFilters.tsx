/**
 * Community Filters Component
 * Grade, Subject, Resource Type filtering for Community Library
 */

"use client";

import { translateSubject } from "@/components/document-creation/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("community.filters");
  const tResourceTypes = useTranslations("community.resourceCard.resourceTypes");

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

  const extraActive = [filters.resourceType, filters.sortBy === "recent" ? "recent" : undefined].filter(Boolean).length;

  // One bar, like "Os meus documentos": search, year, subject; type and order under "Mais filtros".
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[12rem] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="community-search"
          type="text"
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          value={filters.search || ""}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="h-9 pl-9 text-sm"
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
        />
      </div>
      <Button type="button" onClick={onSearch} size="sm" variant="outline" className="h-9 px-3">
        {t("searchButton")}
      </Button>

        <Select
          value={filters.grade || "all"}
          onValueChange={(value) => handleFilterChange("grade", value)}
        >
          <SelectTrigger className="h-9 w-auto min-w-[8rem] text-sm" aria-label={t("gradePlaceholder")}>
            <SelectValue placeholder={t("gradePlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allGrades")}</SelectItem>
            {GRADE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t("gradeOption", { n: option.value })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.subject || "all"}
          onValueChange={(value) => handleFilterChange("subject", value)}
        >
          <SelectTrigger className="h-9 w-auto min-w-[10rem] text-sm" aria-label={t("subjectPlaceholder")}>
            <SelectValue placeholder={t("subjectPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allSubjects")}</SelectItem>
            {SUBJECT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {translateSubject(option.value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-9">
            <SlidersHorizontal className="mr-1.5 h-4 w-4" aria-hidden />
            {t("moreFilters")}
            {extraActive > 0 && (
              <span className="ml-1.5 rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                {extraActive}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 space-y-3">
          <Select
            value={filters.resourceType || "all"}
            onValueChange={(value) => handleFilterChange("resourceType", value)}
          >
            <SelectTrigger className="h-9" aria-label={t("typePlaceholder")}>
              <SelectValue placeholder={t("typePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allTypes")}</SelectItem>
              {RESOURCE_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {tResourceTypes(`${option.value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.sortBy || "popular"} onValueChange={handleSortChange}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">{t("sortPopular")}</SelectItem>
              <SelectItem value="recent">{t("sortRecent")}</SelectItem>
            </SelectContent>
          </Select>
        </PopoverContent>
      </Popover>

      {hasActiveFilters && (
        <Button type="button" variant="ghost" onClick={clearFilters} size="sm" className="h-9 px-2.5">
          <X className="mr-1 h-3.5 w-3.5" />
          {t("clear")}
        </Button>
      )}
    </div>
  );
}
