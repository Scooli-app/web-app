"use client";

import { Button } from "@/components/ui/button";
import { ChoiceChip } from "@/components/ui/choice-chip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { VocationalClass } from "@/shared/types/teaching-profile";
import { Loader2, Pencil, Plus, Trash2, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface VocationalClassesSectionProps {
  qualificationCode: string;
  courseTitle: string;
  /** The UCs the teacher has saved as taught in this course — the only ones a class may pick from. */
  savedUnits: { code: string; label: string }[];
  classes: VocationalClass[];
  classesStatus: "loading" | "error" | "ready";
  onCreate: (request: { qualificationCode: string; name: string; units: { code: string; label: string }[] }) => Promise<VocationalClass>;
  onUpdate: (id: string, request: { qualificationCode: string; name: string; units: { code: string; label: string }[] }) => Promise<VocationalClass>;
  onDelete: (id: string) => Promise<void>;
}

interface EditorState {
  id?: string;
  name: string;
  unitCodes: Set<string>;
}

/**
 * Lets a vocational teacher hand-pick a named group of the UCs they already
 * saved for this course into one "turma"/class (SCOOL-154) — so curriculum-
 * plan creation can reference the group instead of a UC at a time. Lives
 * inside each {@link VocationalCourseCard} since a class always belongs to
 * exactly one curso profissional.
 */
export function VocationalClassesSection({
  qualificationCode,
  courseTitle,
  savedUnits,
  classes,
  classesStatus,
  onCreate,
  onUpdate,
  onDelete,
}: VocationalClassesSectionProps) {
  const t = useTranslations("settings.teachingProfileCard.vocationalClasses");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // A class can only be edited with UCs the teacher still has saved — if one
  // was removed from the course after the class was created, drop it from
  // the editable set rather than silently keep an invalid selection.
  useEffect(() => {
    if (!editor) return;
    const savedCodes = new Set(savedUnits.map((unit) => unit.code));
    const filtered = new Set([...editor.unitCodes].filter((code) => savedCodes.has(code)));
    if (filtered.size !== editor.unitCodes.size) {
      setEditor({ ...editor, unitCodes: filtered });
    }
    // Only react to savedUnits changes — re-filtering on every editor keystroke is unnecessary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedUnits]);

  if (savedUnits.length === 0) return null;

  const openCreate = () => setEditor({ name: "", unitCodes: new Set() });
  const openEdit = (vocClass: VocationalClass) =>
    setEditor({
      id: vocClass.id,
      name: vocClass.name,
      unitCodes: new Set(vocClass.units.map((unit) => unit.code)),
    });
  const closeEditor = () => {
    if (isSaving) return;
    setEditor(null);
  };

  const toggleUnit = (code: string) => {
    if (!editor) return;
    const next = new Set(editor.unitCodes);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setEditor({ ...editor, unitCodes: next });
  };

  const handleSave = async () => {
    if (!editor) return;
    const name = editor.name.trim();
    if (!name || editor.unitCodes.size === 0) return;
    const units = savedUnits.filter((unit) => editor.unitCodes.has(unit.code));

    setIsSaving(true);
    try {
      if (editor.id) {
        await onUpdate(editor.id, { qualificationCode, name, units });
      } else {
        await onCreate({ qualificationCode, name, units });
      }
      setEditor(null);
      toast.success(t("saveSuccess"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("saveError"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (vocClass: VocationalClass) => {
    if (!vocClass.id) return;
    setDeletingId(vocClass.id);
    try {
      await onDelete(vocClass.id);
      toast.success(t("deleteSuccess"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("deleteError"));
    } finally {
      setDeletingId(null);
    }
  };

  const isEditorValid = !!editor && editor.name.trim().length > 0 && editor.unitCodes.size > 0;

  return (
    <div className="space-y-3 border-t border-border pt-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-medium text-foreground">{t("label")}</p>
        <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {t("addClass")}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{t("description")}</p>

      {classesStatus === "loading" ? (
        <div className="h-9 animate-pulse rounded-lg bg-muted" aria-hidden />
      ) : classesStatus === "error" ? (
        <p className="text-xs text-destructive">{t("loadError")}</p>
      ) : classes.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="space-y-1.5">
          {classes.map((vocClass) => (
            <li
              key={vocClass.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="truncate text-sm text-foreground">{vocClass.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {t("unitsCount", { count: vocClass.units.length })}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => openEdit(vocClass)}
                  aria-label={t("editClass", { name: vocClass.name })}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => void handleDelete(vocClass)}
                  disabled={deletingId === vocClass.id}
                  aria-label={t("removeClass", { name: vocClass.name })}
                >
                  {deletingId === vocClass.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!editor} onOpenChange={(open) => !open && closeEditor()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editor?.id ? t("editDialogTitle") : t("createDialogTitle")}</DialogTitle>
            <DialogDescription>{t("dialogDescription", { course: courseTitle })}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 p-6 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="vocational-class-name">{t("nameLabel")}</Label>
              <Input
                id="vocational-class-name"
                value={editor?.name ?? ""}
                onChange={(event) => editor && setEditor({ ...editor, name: event.target.value })}
                placeholder={t("namePlaceholder")}
                maxLength={120}
                autoFocus
                disabled={isSaving}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("unitsLabel")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {savedUnits.map((unit) => (
                  <ChoiceChip
                    key={unit.code}
                    selected={!!editor?.unitCodes.has(unit.code)}
                    showCheck
                    disabled={isSaving}
                    onClick={() => toggleUnit(unit.code)}
                  >
                    {unit.label}
                  </ChoiceChip>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={closeEditor} disabled={isSaving}>
              {t("cancel")}
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={!isEditorValid || isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {isSaving ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
