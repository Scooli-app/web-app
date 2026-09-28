"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { VocationalUnit } from "@/shared/types/teaching-profile";
import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { normalizeSearch } from "./search";

/**
 * Group units by the common prefix before the first dash.
 *
 * In referentials a subject shows up as several units sharing a prefix —
 * "Programação em C/C++ - ciclos e decisões", "… - funções e estruturas". The
 * median is 25 units per course but the maximum is 114, and a flat list that
 * long is hostile. This recovers much of the subject grouping without needing
 * the school's own curriculum plan.
 */
function groupUnits(units: VocationalUnit[]): Array<{ prefix: string; units: VocationalUnit[] }> {
  const groups = new Map<string, VocationalUnit[]>();
  for (const unit of units) {
    const separator = unit.title.indexOf(" - ");
    const prefix = separator > 8 ? unit.title.slice(0, separator) : "";
    const bucket = groups.get(prefix);
    if (bucket) {
      bucket.push(unit);
    } else {
      groups.set(prefix, [unit]);
    }
  }
  // A prefix with a single unit is not a group — those go back to the loose list.
  const loose: VocationalUnit[] = [];
  const real: Array<{ prefix: string; units: VocationalUnit[] }> = [];
  for (const [prefix, bucket] of groups) {
    if (!prefix || bucket.length < 2) {
      loose.push(...bucket);
    } else {
      real.push({ prefix, units: bucket });
    }
  }
  if (loose.length > 0) {
    real.push({ prefix: "", units: loose });
  }
  return real;
}

interface VocationalCourseCardProps {
  title: string;
  /** Education/training area from the catalogue, shown to tell similar courses apart. */
  areaLabel?: string | null;
  /** Undefined while loading. */
  units: VocationalUnit[] | undefined;
  unitsFailed: boolean;
  selectedUnitCodes: Set<string>;
  onToggleUnit: (unit: VocationalUnit) => void;
  onSetUnits: (units: VocationalUnit[], selected: boolean) => void;
  onRemove: () => void;
}

/** One curso profissional and the UCs the teacher will teach in it. */
export function VocationalCourseCard({
  title,
  areaLabel,
  units,
  unitsFailed,
  selectedUnitCodes,
  onToggleUnit,
  onSetUnits,
  onRemove,
}: VocationalCourseCardProps) {
  const t = useTranslations("settings.teachingProfileCard");
  const [unitTerm, setUnitTerm] = useState("");

  const filteredUnitGroups = useMemo(() => {
    if (!units) return [];
    const key = normalizeSearch(unitTerm);
    const matching = key
      ? units.filter(
          (unit) =>
            normalizeSearch(unit.title).includes(key) || normalizeSearch(unit.code).includes(key)
        )
      : units;
    return groupUnits(matching);
  }, [units, unitTerm]);

  const selectedCount = units?.filter((unit) => selectedUnitCodes.has(unit.code)).length ?? 0;
  const allSelected = !!units && units.length > 0 && selectedCount === units.length;

  return (
    <article className="rounded-xl border border-border bg-background/60">
      <header className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="min-w-0">
          <h4 className="font-semibold leading-snug text-foreground">{title}</h4>
          {areaLabel && <p className="mt-0.5 text-xs text-muted-foreground">{areaLabel}</p>}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label={t("removeCourse", { course: title })}
          className="shrink-0 text-muted-foreground hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="space-y-3 border-t border-border p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="text-sm font-medium text-foreground">{t("unitsLabel")}</p>
          {units && units.length > 0 && (
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {t("unitsSummary", { selected: selectedCount, total: units.length })}
            </p>
          )}
        </div>

        {unitsFailed ? (
          <p className="text-sm text-destructive">{t("unitsError")}</p>
        ) : !units ? (
          <div className="space-y-2" aria-hidden>
            <div className="h-9 animate-pulse rounded-lg bg-muted" />
            <div className="h-24 animate-pulse rounded-lg bg-muted" />
          </div>
        ) : units.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noUnitsInCourse")}</p>
        ) : (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  value={unitTerm}
                  onChange={(event) => setUnitTerm(event.target.value)}
                  placeholder={t("unitsSearchPlaceholder")}
                  aria-label={t("unitsSearchPlaceholder")}
                  className="h-9 pl-9"
                  autoComplete="off"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onSetUnits(units, !allSelected)}
              >
                {allSelected ? t("deselectAllUnits") : t("selectAllUnits")}
              </Button>
            </div>

            <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg border border-border p-2">
              {filteredUnitGroups.length === 0 ? (
                <p className="p-1.5 text-sm text-muted-foreground">{t("noUnitsFound")}</p>
              ) : (
                filteredUnitGroups.map((group, index) => (
                  <div key={group.prefix || `loose-${index}`}>
                    {group.prefix && (
                      <p className="mb-1 px-1.5 text-xs font-medium text-muted-foreground">
                        {group.prefix}
                      </p>
                    )}
                    <div className="space-y-0.5">
                      {group.units.map((unit) => (
                        <label
                          key={unit.code}
                          className="flex cursor-pointer items-start gap-2.5 rounded-md p-1.5 text-sm hover:bg-accent/60"
                        >
                          <Checkbox
                            checked={selectedUnitCodes.has(unit.code)}
                            onCheckedChange={() => onToggleUnit(unit)}
                            className="mt-0.5"
                          />
                          <span className="text-foreground">
                            {unit.title}
                            <span className="ml-1.5 text-xs text-muted-foreground">{unit.code}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </article>
  );
}
