"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/shared/utils/utils";
import type { AssessmentHeader, HeaderField } from "@/types/assessment";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useAssessmentEditor } from "./context";
import { MAX_CLASS, MAX_SCHOOL, printLabel } from "./model";

const FIELDS: HeaderField[] = ["class", "number", "name", "date", "duration", "grade", "teacher", "guardian"];

/** The printed test header (school, class, name, date…), editable in place. */
export function HeaderForm({ header, onChange }: { header: AssessmentHeader; onChange: (next: AssessmentHeader) => void }) {
  const t = useTranslations("assessmentEditor.header");
  const { studentView, phone, english } = useAssessmentEditor();
  const fieldLabel = (f: HeaderField | "school") => (english === undefined ? t(f) : printLabel(english, f));
  const [editing, setEditing] = useState(false);
  const shown = new Set(header.showFields);

  const cells: { key: string; label: string; value?: string | null }[] = [
    ...(header.school ? [{ key: "school", label: fieldLabel("school"), value: header.school }] : []),
    ...FIELDS.filter((f) => shown.has(f)).map((f) => ({
      key: f,
      label: fieldLabel(f),
      value: f === "class" ? header.gradeClass : f === "duration" && header.duration ? t("durationValue", { minutes: header.duration }) : null,
    })),
  ];

  if (editing && !studentView) {
    const toggle = (f: HeaderField, on: boolean) =>
      onChange({ ...header, showFields: on ? FIELDS.filter((x) => x === f || shown.has(x)) : header.showFields.filter((x) => x !== f) });
    return (
      <div className="paper-light flex flex-col gap-4 rounded-xl border border-border bg-card p-4 font-sans text-sm text-card-foreground shadow-lg">
        <div className="flex items-center justify-between">
          <p className="font-semibold">{t("edit")}</p>
          <Button type="button" size="sm" onClick={() => setEditing(false)}>{t("done")}</Button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">
            {t("school")}
            {/* Not on phones: opening must not pop the keyboard (as in the exercise sheet). */}
            <Input value={header.school ?? ""} maxLength={MAX_SCHOOL} placeholder={t("schoolPlaceholder")} onChange={(e) => onChange({ ...header, school: e.target.value || null })} className="h-9 text-foreground" autoFocus={!phone} />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">
            {t("class")}
            <Input value={header.gradeClass ?? ""} maxLength={MAX_CLASS} placeholder={t("classPlaceholder")} onChange={(e) => onChange({ ...header, gradeClass: e.target.value || null })} className="h-9 text-foreground" />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">
            {t("duration")}
            <Input
              type="number"
              min={1}
              max={600}
              value={header.duration ?? ""}
              placeholder={t("durationPlaceholder")}
              onChange={(e) => onChange({ ...header, duration: e.target.value ? Math.min(600, Math.max(1, Math.round(Number(e.target.value)))) : null })}
              className="h-9 text-foreground"
            />
          </label>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-muted-foreground">{t("fieldsLabel")}</span>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {FIELDS.map((f) => (
              <label key={f} className="flex items-center gap-2 text-sm max-md:min-h-11 max-md:min-w-11">
                <Checkbox checked={shown.has(f)} onCheckedChange={(on) => toggle(f, on === true)} />
                {t(f)}
              </label>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (cells.length === 0) {
    return studentView ? null : (
      <button type="button" onClick={() => setEditing(true)} className="flex w-full items-center justify-center gap-1.5 rounded border border-dashed border-neutral-300 py-2 font-sans text-xs text-neutral-500 hover:border-primary hover:text-primary">
        <Plus className="h-3.5 w-3.5" />
        {t("add")}
      </button>
    );
  }

  if (phone) {
    // One tappable line instead of the printed grid.
    const summary = cells.map((c) => (c.key === "school" ? c.value : c.label)).join(", ");
    return (
      <button
        type="button"
        disabled={studentView}
        onClick={() => setEditing(true)}
        className="flex min-h-11 w-full items-center gap-2 rounded border border-neutral-300 px-3 text-left font-sans text-xs text-neutral-600"
      >
        <span className="min-w-0 flex-1 truncate"><span className="font-semibold text-neutral-800">{t("label")}</span> · {summary}</span>
        {!studentView && <span className="shrink-0 font-medium text-primary underline">{t("editShort")}</span>}
      </button>
    );
  }

  return (
    <div
      role={studentView ? undefined : "button"}
      tabIndex={studentView ? undefined : 0}
      title={studentView ? undefined : t("edit")}
      onClick={() => !studentView && setEditing(true)}
      onKeyDown={(e) => !studentView && (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setEditing(true))}
      className={cn(
        "grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] overflow-hidden rounded border-[1.5px] border-neutral-700 font-sans text-[11px]",
        !studentView && "cursor-pointer transition-shadow hover:ring-2 hover:ring-primary/30",
      )}
    >
      {cells.map((c, i) => (
        <div
          key={c.key}
          // The last row's spare columns go to its last field, not to an empty box (as in the files).
          style={i === cells.length - 1 && cells.length % 3 !== 0 ? { gridColumn: `span ${4 - (cells.length % 3)}` } : undefined}
          className="min-h-8 border-b border-r border-neutral-400 px-2 py-1.5 last:border-r-0 [&:nth-child(3n)]:border-r-0"
        >
          <span className="font-bold">{c.label}</span> {c.value}
        </div>
      ))}
    </div>
  );
}
