"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

import { Routes, type Document } from "@/shared/types";
import { selectIsHorarioPlanosEnabled } from "@/store/features/selectors";
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

// ── Delete confirmation dialog ────────────────────────────────────────────────

interface DeleteDialogProps {
  timetable: Timetable | null;
  isDeleting: boolean;
  onConfirm: (deleteDocuments: boolean) => void;
  onCancel: () => void;
}

function DeleteDialog({ timetable, isDeleting, onConfirm, onCancel }: DeleteDialogProps) {
  return (
    <Dialog open={!!timetable} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle>Eliminar plano letivo?</DialogTitle>
              <DialogDescription className="mt-1">
                Tens a certeza que queres eliminar{" "}
                <span className="font-medium text-foreground">
                  &quot;{timetable?.title}&quot;
                </span>
                ? Escolhe se pretendes manter ou eliminar os documentos gerados
                associados a este plano letivo.
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
              <span className="font-medium">Eliminar apenas o plano letivo</span>
              <span className="text-xs text-muted-foreground font-normal">
                Os documentos gerados são mantidos
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
              <span className="font-medium">Eliminar plano letivo e documentos</span>
              <span className="text-xs text-red-200 font-normal">
                Todos os documentos associados serão apagados
              </span>
            </div>
          </Button>
          <Button
            variant="ghost"
            disabled={isDeleting}
            onClick={onCancel}
            className="w-full"
          >
            Cancelar
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

const TIMETABLE_COLORS = [
  "#7F77DD", "#2BB5A0", "#E27060", "#4A90D9",
  "#F5A623", "#5CB85C", "#E91E8C", "#9E9E9E",
];

function EditDialog({ timetable, isSaving, onSave, onCancel }: EditDialogProps) {
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
      new Date(`${iso}T00:00:00`).toLocaleDateString("pt-PT", {
        day: "numeric", month: "short", year: "numeric",
      });
    return `${fmt(timetable.periodStart)} – ${fmt(timetable.periodEnd)}`;
  })();

  return (
    <Dialog open={!!timetable} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar plano letivo</DialogTitle>
          <DialogDescription>Altera o nome, turma, cor ou planificação ligada.</DialogDescription>
        </DialogHeader>

        {/* Read-only summary */}
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground space-y-0.5">
          <p>
            <span className="font-medium text-foreground">{timetable.subject}</span>
            {" · "}
            {timetable.gradeLevel}.º ano
          </p>
          <p>{periodLabel}</p>
        </div>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={timetable.title}
            />
          </div>

          {/* Turma + Cor in a row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Turma</Label>
              <Input
                placeholder="Ex: A"
                value={classLabel}
                onChange={(e) => setClassLabel(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cor</Label>
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
            <Label>Planificação ligada</Label>
            {plansLoading ? (
              <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />A carregar…
              </div>
            ) : (
              <select
                className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                value={linkedPlanId}
                onChange={(e) => setLinkedPlanId(e.target.value)}
              >
                <option value="">Nenhuma</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                    {p.subject ? ` · ${p.subject}` : ""}
                    {p.gradeLevel ? ` · ${p.gradeLevel}.º ano` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="ghost" onClick={onCancel} disabled={isSaving}>
            Cancelar
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
            Guardar
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
  const color = timetable.color || "#7F77DD";
  const isActive = timetable.status === "active";

  const periodLabel = (() => {
    const fmt = (iso: string) =>
      new Date(`${iso}T00:00:00`).toLocaleDateString("pt-PT", {
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
            {timetable.subject}
            {timetable.gradeLevel ? ` · ${timetable.gradeLevel}.º ano` : ""}
            {timetable.classLabel ? ` · Turma ${timetable.classLabel}` : ""}
          </p>
          <p className="text-xs text-muted-foreground/70">{periodLabel}</p>
        </div>
      </Link>

      <Badge variant={isActive ? "default" : "secondary"} className="shrink-0 text-xs">
        {isActive ? "Ativa" : "Inativa"}
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
          title="Editar plano letivo"
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
  const enabled = useSelector(selectIsHorarioPlanosEnabled);
  const { timetables, isLoading } = useSelector((state: RootState) => state.timetable);
  const dispatch = useAppDispatch();
  const router = useRouter();

  const [pendingDelete, setPendingDelete] = useState<Timetable | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingEdit, setPendingEdit] = useState<Timetable | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!enabled) {
      router.replace(Routes.DASHBOARD);
      return;
    }
    dispatch(fetchTimetables());
  }, [enabled, dispatch, router]);

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

  if (!enabled) return null;

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
            <h1 className="text-xl font-semibold">Planos letivos</h1>
            <p className="text-sm text-muted-foreground">
              Todos os teus planos letivos
            </p>
          </div>
        </div>
        <Button asChild size="sm">
          <Link href={Routes.CALENDAR_NEW}>
            <Plus className="mr-1.5 h-4 w-4" />
            Novo plano letivo
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
            <p className="font-medium text-foreground">Nenhum plano letivo</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Cria o teu primeiro plano letivo para começar a planificar.
            </p>
          </div>
          <Button asChild>
            <Link href={Routes.CALENDAR_NEW}>
              <Plus className="mr-2 h-4 w-4" />
              Criar plano letivo
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {timetables.map((t) => (
            <SequenceCard
              key={t.id}
              timetable={t}
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
