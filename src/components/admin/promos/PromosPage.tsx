"use client";

import { AdminBackButton } from "@/components/admin/AdminBackButton";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadError } from "@/components/ui/load-error";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdmin } from "@/hooks/useAdmin";
import { ApiRequestError } from "@/services/api/client";
import { adminTrialPromosService } from "@/services/api/admin-trial-promos.service";
import type { AdminTrialPromo, CreateTrialPromoRequest } from "@/shared/types/trial-promo";
import { Copy, Gift, Loader2, Pencil, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PromoEditDialog } from "./PromoEditDialog";
import { PromoQr } from "./PromoQr";
import { endOfDayIso, formatRedemptions, parseOptionalPositiveInt } from "./promo-form";

const DEFAULT_EXTRA_DAYS = "30";

export function PromosPage() {
  const t = useTranslations("adminPromos");
  const locale = useLocale();
  const { isAdmin, isLoaded } = useAdmin();
  const router = useRouter();

  const [promos, setPromos] = useState<AdminTrialPromo[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState<AdminTrialPromo | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [extraDays, setExtraDays] = useState(DEFAULT_EXTRA_DAYS);
  const [validUntil, setValidUntil] = useState("");
  const [max, setMax] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && !isAdmin) router.push("/dashboard");
  }, [isLoaded, isAdmin, router]);

  const load = useCallback(async () => {
    try {
      setPromos(await adminTrialPromosService.list());
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  if (!isLoaded || !isAdmin) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" }) : t("table.noExpiry");

  const replace = (updated: AdminTrialPromo) =>
    setPromos((current) => current?.map((p) => (p.code === updated.code ? updated : p)) ?? current);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const days = parseOptionalPositiveInt(extraDays);
    const maxValue = parseOptionalPositiveInt(max);
    if (!trimmedName) return setCreateError(t("errors.nameRequired"));
    if (!days) return setCreateError(t("errors.extraDaysInvalid"));
    if (maxValue === undefined) return setCreateError(t("errors.maxInvalid"));

    const body: CreateTrialPromoRequest = { name: trimmedName, extraDays: days };
    if (code.trim()) body.code = code.trim().toUpperCase();
    if (validUntil) body.validUntil = endOfDayIso(validUntil);
    if (maxValue !== null) body.maxRedemptions = maxValue;

    setCreating(true);
    setCreateError(null);
    try {
      await adminTrialPromosService.create(body);
      setName("");
      setCode("");
      setExtraDays(DEFAULT_EXTRA_DAYS);
      setValidUntil("");
      setMax("");
      toast.success(t("create.created"));
      await load();
    } catch (e) {
      if (e instanceof ApiRequestError && e.code === "promo_code_taken") setCreateError(t("errors.codeTaken"));
      else if (e instanceof ApiRequestError && e.code === "invalid_promo") setCreateError(t("errors.invalid", { detail: e.message }));
      else setCreateError(t("errors.generic"));
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (promo: AdminTrialPromo, active: boolean) => {
    setToggling(promo.code);
    try {
      replace(await adminTrialPromosService.update(promo.code, { active }));
    } catch {
      toast.error(t("errors.toggleFailed"));
    } finally {
      setToggling(null);
    }
  };

  const copyLink = async (promo: AdminTrialPromo) => {
    try {
      await navigator.clipboard.writeText(promo.signupUrl);
      toast.success(t("row.copied"));
    } catch {
      toast.error(t("row.copyFailed"));
    }
  };

  return (
    <PageContainer size="xl" contentClassName="py-4 sm:py-8">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 sm:h-12 sm:w-12">
            <Gift className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
          </div>
        }
        actions={<AdminBackButton />}
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("create.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={create} className="space-y-4" aria-label={t("create.title")}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="promo-name">{t("fields.name")}</Label>
                  <Input id="promo-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="promo-code">{t("fields.code")}</Label>
                  <Input id="promo-code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={32} />
                  <p className="text-xs text-muted-foreground">{t("fields.codeHint")}</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="promo-days">{t("fields.extraDays")}</Label>
                  <Input id="promo-days" inputMode="numeric" value={extraDays} onChange={(e) => setExtraDays(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="promo-until">{t("fields.validUntil")}</Label>
                  <Input id="promo-until" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="promo-max">{t("fields.maxRedemptions")}</Label>
                  <Input
                    id="promo-max"
                    inputMode="numeric"
                    value={max}
                    onChange={(e) => setMax(e.target.value)}
                    placeholder={t("fields.maxPlaceholder")}
                  />
                </div>
              </div>
              {createError && (
                <p role="alert" className="text-sm text-destructive">
                  {createError}
                </p>
              )}
              <Button type="submit" disabled={creating}>
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                {t("create.submit")}
              </Button>
            </form>
          </CardContent>
        </Card>

        {failed && <LoadError message={t("loadFailed")} onRetry={() => void load()} />}
        {!failed && promos === null && <Skeleton className="h-40 w-full" />}
        {promos && promos.length === 0 && <p className="text-sm text-muted-foreground">{t("empty")}</p>}
        {promos && promos.length > 0 && (
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("table.code")}</TableHead>
                    <TableHead>{t("table.name")}</TableHead>
                    <TableHead>{t("table.extraDays")}</TableHead>
                    <TableHead>{t("table.validUntil")}</TableHead>
                    <TableHead>{t("table.active")}</TableHead>
                    <TableHead>{t("table.redemptions")}</TableHead>
                    <TableHead className="w-12">
                      <span className="sr-only">{t("table.actions")}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promos.map((promo) => (
                    <Fragment key={promo.code}>
                      <TableRow data-testid={`promo-row-${promo.code}`}>
                        <TableCell className="font-mono font-medium">{promo.code}</TableCell>
                        <TableCell>{promo.name}</TableCell>
                        <TableCell>{promo.extraDays}</TableCell>
                        <TableCell>{formatDate(promo.validUntil)}</TableCell>
                        <TableCell>
                          <Switch
                            checked={promo.active}
                            disabled={toggling === promo.code}
                            onCheckedChange={(checked) => void toggleActive(promo, checked)}
                            aria-label={t("table.toggleActive", { code: promo.code })}
                          />
                        </TableCell>
                        <TableCell>{formatRedemptions(promo)}</TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditing(promo)}
                            aria-label={t("row.edit", { code: promo.code })}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={7} className="space-y-3 bg-muted/30">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-muted-foreground">{t("row.link")}</span>
                            <code className="min-w-0 break-all rounded bg-muted px-2 py-1 text-xs">{promo.signupUrl}</code>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => void copyLink(promo)}
                              aria-label={t("row.copy", { code: promo.code })}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              {t("row.copyLabel")}
                            </Button>
                          </div>
                          <PromoQr code={promo.code} signupUrl={promo.signupUrl} />
                        </TableCell>
                      </TableRow>
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {editing && (
        <PromoEditDialog
          promo={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            replace(updated);
            setEditing(null);
          }}
        />
      )}
    </PageContainer>
  );
}
