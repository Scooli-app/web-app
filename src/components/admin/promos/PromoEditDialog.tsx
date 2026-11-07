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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminTrialPromosService } from "@/services/api/admin-trial-promos.service";
import type { AdminTrialPromo, UpdateTrialPromoRequest } from "@/shared/types/trial-promo";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { endOfDayIso, isoToDateInput, parseOptionalPositiveInt } from "./promo-form";

interface PromoEditDialogProps {
  promo: AdminTrialPromo;
  onClose: () => void;
  onSaved: (promo: AdminTrialPromo) => void;
}

/** Name, valid until and max redemptions. The code and the extra days stay as created. */
export function PromoEditDialog({ promo, onClose, onSaved }: PromoEditDialogProps) {
  const t = useTranslations("adminPromos");
  const [name, setName] = useState(promo.name);
  const [validUntil, setValidUntil] = useState(isoToDateInput(promo.validUntil));
  const [max, setMax] = useState(promo.maxRedemptions === null || promo.maxRedemptions === undefined ? "" : String(promo.maxRedemptions));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    const maxValue = parseOptionalPositiveInt(max);
    if (!trimmed) return setError(t("errors.nameRequired"));
    if (maxValue === undefined) return setError(t("errors.maxInvalid"));

    const body: UpdateTrialPromoRequest = {};
    if (trimmed !== promo.name) body.name = trimmed;
    if (validUntil !== isoToDateInput(promo.validUntil)) body.validUntil = validUntil ? endOfDayIso(validUntil) : null;
    if (maxValue !== promo.maxRedemptions) body.maxRedemptions = maxValue;
    if (Object.keys(body).length === 0) return onClose();

    setSaving(true);
    setError(null);
    try {
      onSaved(await adminTrialPromosService.update(promo.code, body));
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : t("errors.generic"));
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent>
        <form onSubmit={save} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t("edit.title", { code: promo.code })}</DialogTitle>
            <DialogDescription>{t("edit.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="promo-edit-name">{t("fields.name")}</Label>
            <Input id="promo-edit-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="promo-edit-until">{t("fields.validUntil")}</Label>
            <Input id="promo-edit-until" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="promo-edit-max">{t("fields.maxRedemptions")}</Label>
            <Input
              id="promo-edit-max"
              inputMode="numeric"
              value={max}
              onChange={(e) => setMax(e.target.value)}
              placeholder={t("fields.maxPlaceholder")}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              {t("edit.cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("edit.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
