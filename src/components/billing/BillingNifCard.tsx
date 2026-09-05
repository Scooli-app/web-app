"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { userService } from "@/services/api/user.service";
import { FileText, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * Billing NIF.
 *
 * Kept here rather than left to Stripe: Stripe's tax ID field is documented as
 * business-only and Checkout hides it behind an "I'm purchasing as a business"
 * checkbox next to a company-name field, which a teacher buying in their own
 * name will not tick. The NIF saved here is the one the fatura carries, and it
 * applies to every renewal from now on.
 */
export function BillingNifCard() {
  const [nif, setNif] = useState("");
  const [savedNif, setSavedNif] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    userService
      .getCurrentUser()
      .then((user) => {
        if (cancelled) return;
        setNif(user.nif ?? "");
        setSavedNif(user.nif ?? "");
      })
      .catch(() => {
        if (!cancelled) toast.error("Não foi possível carregar os dados de faturação.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const trimmed = nif.trim();
  const hasChanged = trimmed !== savedNif;

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      // Empty clears it: someone who entered a NIF by mistake has to be able to
      // take it off future faturas.
      await userService.updateNif(trimmed === "" ? null : trimmed);
      setSavedNif(trimmed);
      toast.success(
        trimmed === ""
          ? "NIF removido. As próximas faturas saem como consumidor final."
          : "NIF guardado. Será usado nas próximas faturas.",
      );
    } catch (e) {
      // The backend checks the control digit and returns the reason, so show
      // that rather than a generic failure — the person can still fix it.
      const message =
        e instanceof Error ? e.message : "Não foi possível guardar o NIF.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-card p-4 sm:p-6 md:p-8 rounded-2xl shadow-md border border-border">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          Dados de faturação
        </h2>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-4 bg-muted rounded-lg w-40 animate-pulse" />
          <div className="h-9 bg-muted rounded-md w-full max-w-xs animate-pulse" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2 max-w-xs">
            <label
              htmlFor="nif"
              className="text-sm font-medium text-foreground block"
            >
              NIF
            </label>
            <Input
              id="nif"
              inputMode="numeric"
              autoComplete="off"
              maxLength={9}
              placeholder="123456789"
              value={nif}
              aria-invalid={error !== null}
              aria-describedby="nif-hint"
              onChange={(e) => {
                // Only digits: people paste NIFs with spaces and dots, and the
                // backend wants nine bare digits.
                setNif(e.target.value.replace(/\D/g, "").slice(0, 9));
                setError(null);
              }}
            />
            <p id="nif-hint" className="text-sm text-muted-foreground">
              {error ?? "Opcional. Sem NIF, a fatura sai como consumidor final."}
            </p>
          </div>

          <Button
            onClick={handleSave}
            disabled={!hasChanged || isSaving}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-3 rounded-xl font-medium disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />A guardar...
              </>
            ) : (
              "Guardar"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
