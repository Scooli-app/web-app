"use client";

import { SUBJECTS, translateSubjectLabel } from "@/components/document-creation/constants";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSchoolSource, uploadSchoolSource } from "@/services/api/school-sources.service";
import {
  SOURCE_NAME_MAX,
  clipName,
  nameLength,
  type SchoolSource,
  type SchoolSourceType,
} from "@/shared/types/sources";
import { cn } from "@/shared/utils/utils";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";
import { SourceTypeCards } from "./SourceTypeCards";
import { formatSize, schoolSourceError } from "./schoolSourceFormat";

const YEARS = Array.from({ length: 12 }, (_, i) => i + 1);
// "Visual Arts" appears twice in SUBJECTS; one row per backend value.
const SUBJECT_OPTIONS = SUBJECTS.filter((s, i) => SUBJECTS.findIndex((o) => o.value === s.value) === i);
const SUBJECT_VALUES = SUBJECT_OPTIONS.map((s) => s.value);

const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

function CheckRow({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    // relative: Radix renders a hidden absolute <input> per box; positioned here, it can't stretch a scroll box.
    <label className="relative flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/60 has-[:focus-visible]:bg-muted/60">
      <Checkbox checked={checked} onCheckedChange={onChange} />
      <span className="min-w-0">{children}</span>
    </label>
  );
}

/** A tick list headed by a small "all" row. Ticking "all" selects every option; unticking it clears them. */
function PickList<T>({
  legend,
  allLabel,
  emptyHint,
  options,
  selected,
  onChange,
  className,
  render,
}: {
  legend: string;
  allLabel: string;
  emptyHint: string;
  options: T[];
  selected: T[];
  onChange: (next: T[]) => void;
  className: string;
  render: (option: T) => React.ReactNode;
}) {
  const all = options.every((o) => selected.includes(o));
  const none = !options.some((o) => selected.includes(o));
  return (
    <fieldset className="space-y-1">
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="rounded-md border border-border bg-card p-1">
        <CheckRow checked={all} onChange={() => onChange(all ? [] : options)}>
          <span className="font-medium">{allLabel}</span>
        </CheckRow>
        <div className={cn("relative border-t border-border/70 pt-1", className)}>
          {options.map((o) => (
            <CheckRow key={String(o)} checked={selected.includes(o)} onChange={() => onChange(toggle(selected, o))}>
              {render(o)}
            </CheckRow>
          ))}
        </div>
      </div>
      {none && <p className="text-xs text-destructive">{emptyHint}</p>}
    </fieldset>
  );
}

interface SchoolSourceDialogProps {
  mode: "create" | "edit";
  source?: SchoolSource;
  /** The per-file limit from the quota; a bigger file is refused on pick. */
  maxFileBytes?: number;
  /** Called when the dialog closes; `changed` tells the list to refetch. */
  onDone: (changed: boolean) => void;
}

/** Mounted only while open, so its fields always start from `source` (or empty). */
export function SchoolSourceDialog({ mode, source, maxFileBytes, onDone }: SchoolSourceDialogProps) {
  const t = useTranslations("schoolSources");
  const fileId = useId();
  const nameId = useId();
  const fileNameId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  // The name taken from the last picked file: a new pick replaces it, a name the admin typed stays.
  const autoName = useRef<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState(source?.name ?? "");
  const [type, setType] = useState<SchoolSourceType>(source?.type ?? "regra");
  // A source tagged with nothing applies to everything, so it opens with every box ticked.
  const [subjects, setSubjects] = useState<string[]>(source?.subjects.length ? source.subjects : SUBJECT_VALUES);
  const [years, setYears] = useState<number[]>(source?.schoolYears.length ? source.schoolYears : YEARS);
  const [defaultEnabled, setDefaultEnabled] = useState(source?.defaultEnabled ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave =
    name.trim() !== "" && subjects.length > 0 && years.length > 0 && (mode === "edit" || file !== null) && !saving;

  const save = async () => {
    setSaving(true);
    setError(null);
    // Everything ticked is saved as "all" (empty), so it also covers subjects added later.
    const fields = {
      name: name.trim(),
      type,
      subjects: SUBJECT_VALUES.every((v) => subjects.includes(v)) ? [] : subjects,
      schoolYears: YEARS.every((y) => years.includes(y)) ? [] : years,
      defaultEnabled,
    };
    try {
      if (mode === "create" && file) await uploadSchoolSource({ file, ...fields });
      else if (source) await updateSchoolSource(source.id, fields);
      onDone(true);
    } catch (e) {
      setError(schoolSourceError(e, t));
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onDone(false)}>
      <DialogContent className="max-w-xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("addTitle") : t("editTitle")}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4 px-6 pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (canSave) void save();
          }}
        >
          {mode === "create" && (
            <div className="space-y-2">
              <Label htmlFor={fileId}>{t("form.file")}</Label>
              {/* The native input shows the browser's own (English) button: it stays hidden behind ours. */}
              <input
                ref={fileInput}
                id={fileId}
                type="file"
                accept=".pdf,.docx,.md"
                className="sr-only"
                tabIndex={-1}
                onChange={(event) => {
                  const picked = event.target.files?.[0] ?? null;
                  if (picked && maxFileBytes && picked.size > maxFileBytes) {
                    setFile(null);
                    setError(t("errors.fileTooBig", { max: formatSize(maxFileBytes, t) }));
                    event.target.value = "";
                    return;
                  }
                  setError(null);
                  setFile(picked);
                  if (picked && (!name || name === autoName.current)) {
                    autoName.current = clipName(picked.name.replace(/\.[^.]+$/, ""));
                    setName(autoName.current);
                  }
                }}
              />
              <div className="flex min-w-0 items-center gap-3">
                <Button type="button" variant="outline" className="shrink-0" aria-describedby={fileNameId} onClick={() => fileInput.current?.click()}>
                  {t("form.chooseFile")}
                </Button>
                <span id={fileNameId} className="min-w-0 truncate text-sm text-muted-foreground" title={file?.name}>
                  {file?.name ?? t("form.noFile")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{t("form.fileHint")}</p>
            </div>
          )}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <Label htmlFor={nameId}>{t("form.name")}</Label>
              <span className="text-xs tabular-nums text-muted-foreground" aria-hidden>
                {nameLength(name)}/{SOURCE_NAME_MAX}
              </span>
            </div>
            <Input
              id={nameId}
              value={name}
              onChange={(event) => setName(clipName(event.target.value))}
              // The real cap is 200 code points (clipName); this hard cap only lets emoji (2 units each) reach it.
              maxLength={SOURCE_NAME_MAX * 2}
              autoComplete="off"
            />
          </div>
          <SourceTypeCards value={type} onChange={setType} />
          <PickList
            legend={t("form.subjects")}
            allLabel={t("scope.allSubjects")}
            emptyHint={t("form.pickSubject")}
            options={SUBJECT_VALUES}
            selected={subjects}
            onChange={setSubjects}
            className="max-h-44 overflow-y-auto"
            render={(v) => translateSubjectLabel(SUBJECT_OPTIONS.find((o) => o.value === v)?.id ?? v)}
          />
          <PickList
            legend={t("form.years")}
            allLabel={t("scope.allYears")}
            emptyHint={t("form.pickYear")}
            options={YEARS}
            selected={years}
            onChange={setYears}
            className="grid grid-cols-3 gap-x-2 sm:grid-cols-4"
            render={(y) => t("years.option", { n: y })}
          />
          <CheckRow checked={defaultEnabled} onChange={() => setDefaultEnabled(!defaultEnabled)}>
            {t("defaultEnabled")}
          </CheckRow>
          {error && (
            <p role="alert" className="break-words text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter className="-mx-6 gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => onDone(false)} disabled={saving}>
              {t("form.cancel")}
            </Button>
            <Button type="submit" disabled={!canSave}>
              {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {mode === "create" ? t("form.upload") : t("form.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
