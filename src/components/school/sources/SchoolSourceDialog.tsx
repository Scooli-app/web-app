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
import { ApiRequestError } from "@/services/api/client";
import { updateSchoolSource, uploadSchoolSource } from "@/services/api/school-sources.service";
import type { SchoolSource, SchoolSourceType } from "@/shared/types/sources";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { SourceTypeCards } from "./SourceTypeCards";

const YEARS = Array.from({ length: 12 }, (_, i) => i + 1);
// "Visual Arts" appears twice in SUBJECTS; one row per backend value.
const SUBJECT_OPTIONS = SUBJECTS.filter((s, i) => SUBJECTS.findIndex((o) => o.value === s.value) === i);

const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

function CheckRow({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/60 has-[:focus-visible]:bg-muted/60">
      <Checkbox checked={checked} onCheckedChange={onChange} />
      <span className="min-w-0">{children}</span>
    </label>
  );
}

interface SchoolSourceDialogProps {
  mode: "create" | "edit";
  source?: SchoolSource;
  /** Called when the dialog closes; `changed` tells the list to refetch. */
  onDone: (changed: boolean) => void;
}

/** Mounted only while open, so its fields always start from `source` (or empty). */
export function SchoolSourceDialog({ mode, source, onDone }: SchoolSourceDialogProps) {
  const t = useTranslations("schoolSources");
  const fileId = useId();
  const nameId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState(source?.name ?? "");
  const [type, setType] = useState<SchoolSourceType>(source?.type ?? "regra");
  const [subjects, setSubjects] = useState<string[]>(source?.subjects ?? []);
  const [years, setYears] = useState<number[]>(source?.schoolYears ?? []);
  const [defaultEnabled, setDefaultEnabled] = useState(source?.defaultEnabled ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = name.trim() !== "" && (mode === "edit" || file !== null) && !saving;

  const save = async () => {
    setSaving(true);
    setError(null);
    const fields = { name: name.trim(), type, subjects, schoolYears: years, defaultEnabled };
    try {
      if (mode === "create" && file) await uploadSchoolSource({ file, ...fields });
      else if (source) await updateSchoolSource(source.id, fields);
      onDone(true);
    } catch (e) {
      // 400 (limit) and 409 (duplicate / still indexing) carry the server's own message.
      setError(e instanceof ApiRequestError ? e.message : t("errors.generic"));
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onDone(false)}>
      <DialogContent className="max-w-xl">
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
              <Input
                id={fileId}
                type="file"
                accept=".pdf,.docx,.md"
                onChange={(event) => {
                  const picked = event.target.files?.[0] ?? null;
                  setFile(picked);
                  if (picked && !name) setName(picked.name.replace(/\.[^.]+$/, ""));
                }}
              />
              <p className="text-xs text-muted-foreground">{t("form.fileHint")}</p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor={nameId}>{t("form.name")}</Label>
            <Input id={nameId} value={name} onChange={(event) => setName(event.target.value)} maxLength={200} autoComplete="off" />
          </div>
          <SourceTypeCards value={type} onChange={setType} />
          <fieldset className="space-y-1">
            <legend className="text-sm font-medium">{t("form.subjects")}</legend>
            <p className="text-xs text-muted-foreground">{t("form.subjectsHint")}</p>
            <div className="max-h-44 overflow-y-auto rounded-md border border-border bg-card p-1">
              {SUBJECT_OPTIONS.map((s) => (
                <CheckRow key={s.value} checked={subjects.includes(s.value)} onChange={() => setSubjects(toggle(subjects, s.value))}>
                  {translateSubjectLabel(s.id)}
                </CheckRow>
              ))}
            </div>
          </fieldset>
          <fieldset className="space-y-1">
            <legend className="text-sm font-medium">{t("form.years")}</legend>
            <p className="text-xs text-muted-foreground">{t("form.yearsHint")}</p>
            <div className="grid grid-cols-3 gap-x-2 sm:grid-cols-4">
              {YEARS.map((y) => (
                <CheckRow key={y} checked={years.includes(y)} onChange={() => setYears(toggle(years, y))}>
                  {t("years.single", { n: y })}
                </CheckRow>
              ))}
            </div>
          </fieldset>
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
