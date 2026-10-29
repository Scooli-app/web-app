"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useReplan } from "@/hooks/useReplan";
import { useTranslations } from "next-intl";
import { useState } from "react";

/** The note the replanning agent reads with the lesson. The backend refuses longer ones. */
const NOTE_MAX = 500;

interface ReplanRequestDialogProps {
  timetableId: string;
  /** The lesson the teacher is reajusting from. Absent when the request is for the whole turma. */
  triggerSlotId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fires once the proposal is being prepared, so the caller can say so where the teacher is looking. */
  onStarted?: () => void;
  /** Fires when that proposal is ready or failed (the toast that says which may be gone by then). */
  onSettled?: () => void;
}

/** From a lesson, "O que se passou nesta aula?"; for the whole turma, "O que mudou na turma?". Asks for a proposal, with an optional note. Pro only; the entry point hides it otherwise. */
export function ReplanRequestDialog({ timetableId, triggerSlotId, open, onOpenChange, onStarted, onSettled }: ReplanRequestDialogProps) {
  const t = useTranslations("replan");
  const { requestReplan } = useReplan();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const started = await requestReplan(
      timetableId,
      { triggerSlotId, note: note.trim() || undefined },
      onSettled,
    );
    setBusy(false);
    if (!started) return;
    setNote("");
    onOpenChange(false);
    onStarted?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          {/* Named after where it was opened, so the teacher knows whether the note is about this lesson or the turma. */}
          <DialogTitle>{t(triggerSlotId ? "requestTitle" : "requestTitleTurma")}</DialogTitle>
          <DialogDescription>{t(triggerSlotId ? "requestDescription" : "requestDescriptionTurma")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 px-6 pt-4">
          <Label htmlFor="replan-note">{t("requestNoteLabel")}</Label>
          <Textarea
            id="replan-note"
            value={note}
            maxLength={NOTE_MAX}
            placeholder={t("requestNotePlaceholder")}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {t("requestCancel")}
          </Button>
          <Button onClick={() => void submit()} disabled={busy}>
            {t("requestSubmit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
