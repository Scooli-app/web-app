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

import { Routes } from "@/shared/types";
import { selectIsHorarioPlanosEnabled } from "@/store/features/selectors";
import { fetchTimetables, deleteTimetable } from "@/store/timetable/timetableSlice";
import { useAppDispatch } from "@/store/hooks";
import type { RootState } from "@/store/store";
import type { Timetable } from "@/services/api/timetable.service";

import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  ChevronRight,
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
              <DialogTitle>Eliminar sequência?</DialogTitle>
              <DialogDescription className="mt-1">
                Tens a certeza que queres eliminar{" "}
                <span className="font-medium text-foreground">
                  &quot;{timetable?.title}&quot;
                </span>
                ? Escolhe se pretendes manter ou eliminar os documentos gerados
                associados a esta sequência.
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
              <span className="font-medium">Eliminar apenas a sequência</span>
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
              <span className="font-medium">Eliminar sequência e documentos</span>
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

// ── Sequence card ─────────────────────────────────────────────────────────────

interface SequenceCardProps {
  timetable: Timetable;
  onDelete: (timetable: Timetable) => void;
}

function SequenceCard({ timetable, onDelete }: SequenceCardProps) {
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
            <h1 className="text-xl font-semibold">Minhas sequências</h1>
            <p className="text-sm text-muted-foreground">
              Todas as tuas sequências de aulas
            </p>
          </div>
        </div>
        <Button asChild size="sm">
          <Link href={Routes.CALENDAR_NEW}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nova sequência
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
            <p className="font-medium text-foreground">Nenhuma sequência</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Cria a tua primeira sequência de aulas para começar a planificar.
            </p>
          </div>
          <Button asChild>
            <Link href={Routes.CALENDAR_NEW}>
              <Plus className="mr-2 h-4 w-4" />
              Criar sequência
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {timetables.map((t) => (
            <SequenceCard key={t.id} timetable={t} onDelete={setPendingDelete} />
          ))}
        </div>
      )}

      <DeleteDialog
        timetable={pendingDelete}
        isDeleting={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
