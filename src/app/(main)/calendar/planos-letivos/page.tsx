"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

import { translateSubject, TIMETABLE_COLORS } from "@/components/document-creation/constants";
import { Routes, type Document } from "@/shared/types";
import { selectIsHorarioPlanosEnabled } from "@/store/features/selectors";
import { useFeatureAccess } from "@/components/feature/useFeatureAccess";
import { FeatureUnavailable } from "@/components/feature/FeatureUnavailable";
import { fetchTimetables, deleteTimetable, updateTimetable } from "@/store/timetable/timetableSlice";
import { useAppDispatch } from "@/store/hooks";
import type { RootState } from "@/store/store";
import type { Timetable } from "@/services/api/timetable.service";
import { getDocuments } from "@/services/api/document.service";

import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Edit2,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { isSupportedLocale, defaultLocale } from "@/i18n/locales";
import { toIntlLocale } from "@/shared/utils/calendar";

// ── Delete confirmation dialog ────────────────────────────────────────────────

interface DeleteDialogProps {
  timetable: Timetable | null;
  isDeleting: boolean;
  onConfirm: (deleteDocuments: boolean) => void;
  onCancel: () => void;
}

function DeleteDialog({ timetable, isDeleting, onConfirm, onCancel }: DeleteDialogProps) {
  const t = useTranslations("calendar.classesList");
  return (
    <Dialog open={!!timetable} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle>{t("deleteDialog.title")}</DialogTitle>
              <DialogDescription className="mt-1">
                {t.rich("deleteDialog.description", {
                  title: timetable?.title ?? "",
                  strong: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
                })}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          <Button
            variant="outline"
            disabled={isDeleting}
            onClick={() => onConfirm(false)}
            className="w-full justify-start text-left h-auto py-3 px-4"
          >
            <div className="flex flex-col items-start">
              <span className="font-medium">{t("deleteDialog.deleteOnlyTitle")}</span>
              <span className="text-xs text-muted-foreground font-normal">
                {t("deleteDialog.deleteOnlySubtitle")}
              </span>
            </div>
          </Button>
          <Button
            variant="destructive"
            disabled={isDeleting}
            onClick={() => onConfirm(true)}
            className="w-full justify-start text-left h-auto py-3 px-4"
          >
            {isDeleting ? (
              <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4 shrink-0" />
            )}
            <div className="flex flex-col items-start">
              <span className="font-medium">{t("deleteDialog.deleteWithDocsTitle")}</span>
              <span className="text-xs text-red-200 font-normal">
                {t("deleteDialog.deleteWithDocsSubtitle")}
              </span>
            </div>
          </Button>
          <Button
            variant="ghost"
            disabled={isDeleting}
            onClick={onCancel}
            className="w-full"
          >
            {t("deleteDialog.cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit dialog ───────────────────────────────────────────────────────────────

interface EditDialogProps {
  timetable: Timetable | null;
  isSaving: boolean;
  onSave: (data: { title: string; classLabel: string; color: string; linkedCurriculumPlan: string | null }) => void;
  onCancel: () => void;
}

function EditDialog({ timetable, isSaving, onSave, onCancel }: EditDialogProps) {
  const t = useTranslations("calendar.classesList");
  const tTimetable = useTranslations("timetable");
  const rawLocale = useLocale();
  const locale = isSupportedLocale(rawLocale) ? rawLocale : defaultLocale;
  const [title, setTitle] = useState("");
  const [classLabel, setClassLabel] = useState("");
  const [color, setColor] = useState("");
  const [plans, setPlans] = useState<Document[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [linkedPlanId, setLinkedPlanId] = useState<string>("");

  useEffect(() => {
    if (!timetable) return;
    setTitle(timetable.title);
    setClassLabel(timetable.classLabel ?? "");
    setColor(timetable.color ?? "#7F77DD");
    setLinkedPlanId(timetable.linkedCurriculumPlan ?? "");
    setPlansLoading(true);
    getDocuments({ page: 1, limit: 50, filters: { documentType: "curriculum_plan" } })
      .then((res) => setPlans(res.documents ?? []))
      .catch(() => setPlans([]))
      .finally(() => setPlansLoading(false));
  }, [timetable?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!timetable) return null;

  const periodLabel = (() => {
    const fmt = (iso: string) =>
      new Date(`${iso}T00:00:00`).toLocaleDateString(toIntlLocale(locale), {
        day: "numeric", month: "short", year: "numeric",
      });
    return `${fmt(timetable.periodStart)} – ${fmt(timetable.periodEnd)}`;
  })();

  return (
    <Dialog open={!!timetable} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("editDialog.title")}</DialogTitle>
          <DialogDescription>{t("editDialog.description")}</DialogDescription>
        </DialogHeader>

        {/* Read-only summary */}
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground space-y-0.5">
          <p>
            <span className="font-medium text-foreground">{translateSubject(timetable.subject)}</span>
            {" · "}
            {tTimetable("gradeYear", { grade: timetable.gradeLevel })}
          </p>
          <p>{periodLabel}</p>
        </div>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label>{t("editDialog.nameLabel")}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={timetable.title}
            />
          </div>

          {/* Turma + Cor in a row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("editDialog.classLabel")}</Label>
              <Input
                placeholder={t("editDialog.classPlaceholder")}
                value={classLabel}
                onChange={(e) => setClassLabel(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("editDialog.colorLabel")}</Label>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {TIMETABLE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${
                      color === c ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Planificação ligada */}
          <div className="space-y-1.5">
            <Label>{t("editDialog.linkedPlanLabel")}</Label>
            {plansLoading ? (
              <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />{t("editDialog.loadingPlans")}
              </div>
            ) : (
              <select
                className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                value={linkedPlanId}
                onChange={(e) => setLinkedPlanId(e.target.value)}
              >
                <option value="">{t("editDialog.none")}</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                    {p.subject ? ` · ${translateSubject(p.subject)}` : ""}
                    {p.gradeLevel ? ` · ${tTimetable("gradeYear", { grade: p.gradeLevel })}` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="ghost" onClick={onCancel} disabled={isSaving}>
            {t("editDialog.cancel")}
          </Button>
          <Button
            onClick={() =>
              onSave({
                title: title.trim() || timetable.title,
                classLabel: classLabel.trim(),
                color,
                linkedCurriculumPlan: linkedPlanId || null,
              })
            }
            disabled={isSaving || !title.trim()}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("editDialog.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Sequence card ─────────────────────────────────────────────────────────────

interface SequenceCardProps {
  timetable: Timetable;
  onDelete: (timetable: Timetable) => void;
  onEdit: (timetable: Timetable) => void;
}

function SequenceCard({ timetable, onDelete, onEdit }: SequenceCardProps) {
  const t = useTranslations("calendar.classesList");
  const tShared = useTranslations("calendar.shared");
  const tTimetable = useTranslations("timetable");
  const rawLocale = useLocale();
  const locale = isSupportedLocale(rawLocale) ? rawLocale : defaultLocale;
  const color = timetable.color || "#7F77DD";
  const isActive = timetable.status === "active";

  const periodLabel = (() => {
    const fmt = (iso: string) =>
      new Date(`${iso}T00:00:00`).toLocaleDateString(toIntlLocale(locale), {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    return `${fmt(timetable.periodStart)} – ${fmt(timetable.periodEnd)}`;
  })();

  return (
    <div
      className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-sm"
      style={{ borderLeftWidth: "4px", borderLeftColor: color }}
    >
      <div
        className="h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />

      <Link href={`${Routes.CALENDAR}/${timetable.id}`} className="min-w-0 flex-1">
        <div className="flex flex-col gap-0.5">
          <p className="truncate font-medium text-foreground transition-colors group-hover:text-primary">
            {timetable.title}
          </p>
          <p className="text-sm text-muted-foreground">
            {translateSubject(timetable.subject)}
            {timetable.gradeLevel ? ` · ${tTimetable("gradeYear", { grade: timetable.gradeLevel })}` : ""}
            {timetable.classLabel ? ` · ${tShared("classInline", { label: timetable.classLabel })}` : ""}
          </p>
          <p className="text-xs text-muted-foreground/70">{periodLabel}</p>
        </div>
      </Link>

      <Badge variant={isActive ? "default" : "secondary"} className="shrink-0 text-xs">
        {isActive ? t("card.active") : t("card.inactive")}
      </Badge>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:bg-muted"
          onClick={(e) => {
            e.preventDefault();
            onEdit(timetable);
          }}
          title={t("card.editTitle")}
        >
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={(e) => {
            e.preventDefault();
            onDelete(timetable);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <Link href={`${Routes.CALENDAR}/${timetable.id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SequenciasPage() {
  const t = useTranslations("calendar");
  const { loaded: featuresLoaded, enabled } = useFeatureAccess(selectIsHorarioPlanosEnabled);
  const { timetables, isLoading } = useSelector((state: RootState) => state.timetable);
  const dispatch = useAppDispatch();

  const [pendingDelete, setPendingDelete] = useState<Timetable | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingEdit, setPendingEdit] = useState<Timetable | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!enabled) return; // gated users get the FeatureUnavailable screen below
    dispatch(fetchTimetables());
  }, [enabled, dispatch]);

  const handleDeleteConfirm = async (deleteDocuments: boolean) => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await dispatch(deleteTimetable({ id: pendingDelete.id, deleteDocuments })).unwrap();
    } finally {
      setIsDeleting(false);
      setPendingDelete(null);
    }
  };

  const handleEditSave = async (data: {
    title: string;
    classLabel: string;
    color: string;
    linkedCurriculumPlan: string | null;
  }) => {
    if (!pendingEdit) return;
    setIsSaving(true);
    try {
      await dispatch(
        updateTimetable({
          id: pendingEdit.id,
          params: {
            title: data.title,
            classLabel: data.classLabel,
            color: data.color,
            linkedCurriculumPlan: data.linkedCurriculumPlan ?? undefined,
          },
        })
      ).unwrap();
    } finally {
      setIsSaving(false);
      setPendingEdit(null);
    }
  };

  if (!featuresLoaded) return null;
  if (!enabled)
    return (
      <FeatureUnavailable
        title={t("shared.featureTitle")}
        description={t("shared.featureDescription")}
      />
    );

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={Routes.CALENDAR}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{t("classesList.header.title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("classesList.header.subtitle")}
            </p>
          </div>
        </div>
        <Button asChild size="sm">
          <Link href={Routes.CALENDAR_NEW}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t("shared.newClassLink")}
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : timetables.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border py-20 text-center">
          <CalendarDays className="h-12 w-12 text-muted-foreground" />
          <div>
            <p className="font-medium text-foreground">{t("shared.emptyTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("shared.emptyDescription")}
            </p>
          </div>
          <Button asChild>
            <Link href={Routes.CALENDAR_NEW}>
              <Plus className="mr-2 h-4 w-4" />
              {t("shared.createClass")}
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {timetables.map((tt) => (
            <SequenceCard
              key={tt.id}
              timetable={tt}
              onDelete={setPendingDelete}
              onEdit={setPendingEdit}
            />
          ))}
        </div>
      )}

      <DeleteDialog
        timetable={pendingDelete}
        isDeleting={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPendingDelete(null)}
      />

      <EditDialog
        timetable={pendingEdit}
        isSaving={isSaving}
        onSave={handleEditSave}
        onCancel={() => setPendingEdit(null)}
      />
    </div>
  );
}
