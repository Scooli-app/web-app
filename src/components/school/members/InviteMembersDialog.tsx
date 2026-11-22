"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Textarea } from "@/components/ui/textarea";
import { inviteToCurrentOrganization } from "@/services/api/workspace.service";
import type { OrganizationInviteRole } from "@/shared/types/workspace";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { toast } from "sonner";
import { membersErrorMessage } from "./membersErrors";

/** Same limit as the backend (OrganizationResource.MAX_EMAILS_PER_INVITE). */
const MAX_EMAILS = 50;
const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

/** The distinct, lower-cased emails in `text` (one per line, or separated by commas/semicolons) and the invalid ones. */
export function parseEmails(text: string): { valid: string[]; invalid: string[] } {
  const tokens = [...new Set(text.split(/[\s,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean))];
  return { valid: tokens.filter((s) => EMAIL.test(s)), invalid: tokens.filter((s) => !EMAIL.test(s)) };
}

interface InviteMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Seats still free, or null when the school has no seat limit. */
  freeSeats: number | null;
  onInvited: () => void;
}

export function InviteMembersDialog({ open, onOpenChange, freeSeats, onInvited }: InviteMembersDialogProps) {
  const t = useTranslations("school.members.manage");
  const emailsId = useId();
  const problemId = useId();
  const [text, setText] = useState("");
  const [role, setRole] = useState<OrganizationInviteRole>("teacher");
  const [sending, setSending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { valid, invalid } = parseEmails(text);
  const problem =
    invalid.length > 0
      ? t("dialog.invalidEmails", { emails: invalid.join(", ") })
      : valid.length > MAX_EMAILS
        ? t("dialog.tooMany", { max: MAX_EMAILS })
        : freeSeats !== null && valid.length > freeSeats
          ? t("dialog.notEnoughSeats", { free: freeSeats })
          : serverError;
  const canSend = valid.length > 0 && !problem && !sending;

  const close = (next: boolean) => {
    if (sending) return;
    onOpenChange(next);
    if (!next) {
      setText("");
      setRole("teacher");
      setServerError(null);
    }
  };

  const send = async () => {
    setSending(true);
    setServerError(null);
    try {
      const created = await inviteToCurrentOrganization(valid, role);
      toast.success(t("invitedToast", { count: created.length }));
      setSending(false);
      close(false);
      onInvited();
    } catch (error) {
      setServerError(membersErrorMessage(error, t));
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("dialog.title")}</DialogTitle>
          <DialogDescription>{t("dialog.hint")}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4 px-6 pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (canSend) void send();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor={emailsId}>{t("dialog.emailsLabel")}</Label>
            <Textarea
              id={emailsId}
              rows={3}
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setServerError(null);
              }}
              placeholder={t("dialog.emailsPlaceholder")}
              aria-invalid={invalid.length > 0 || undefined}
              aria-describedby={problem ? problemId : undefined}
              autoComplete="off"
            />
            {problem && (
              <p id={problemId} role="alert" className="break-words text-sm text-destructive">
                {problem}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <span className="text-sm font-medium">{t("dialog.roleLabel")}</span>
            <SegmentedControl
              value={role}
              onChange={setRole}
              ariaLabel={t("dialog.roleLabel")}
              options={[
                { value: "teacher", label: t("roleTeacher") },
                { value: "admin", label: t("roleAdmin") },
              ]}
            />
          </div>
          <DialogFooter className="-mx-6 gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => close(false)} disabled={sending}>
              {t("dialog.cancel")}
            </Button>
            <Button type="submit" disabled={!canSend}>
              {sending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {t("dialog.send")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
