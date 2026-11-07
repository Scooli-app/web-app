"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { captureTrialPromo, normalizePromoCode } from "@/lib/trialPromo/promoStorage";
import { trialPromoService } from "@/services/api/trial-promo.service";
import type { TrialPromoCheck } from "@/shared/types/trial-promo";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useId, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";

/** The form area of Clerk's first sign-up / sign-in step (Clerk documents its `cl-*` classes as stable). */
const CLERK_START_MAIN = ".cl-card.cl-signUp-start .cl-main, .cl-card.cl-signIn-start .cl-main";

/**
 * Puts {@link TrialPromoCodeField} inside Clerk's card, under its form. Clerk's `<SignUp>` /
 * `<SignIn>` take no custom fields, so the field is portalled into Clerk's own form area and
 * re-attached whenever Clerk re-renders it. Only on the first step: on email verification or the
 * SSO callback there is no slot, so nothing shows.
 */
export function TrialPromoCodeFieldInClerk() {
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let current: HTMLElement | null = null;
    const attach = () => {
      const main = document.querySelector<HTMLElement>(CLERK_START_MAIN);
      if (current && main && current.parentElement === main) return;
      current?.remove();
      current = null;
      if (main) {
        current = document.createElement("div");
        current.setAttribute("data-trial-promo-slot", "");
        current.className = "flex justify-center";
        main.appendChild(current);
      }
      setSlot(current);
    };
    attach();
    const observer = new MutationObserver(attach);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      current?.remove();
    };
  }, []);

  return slot ? createPortal(<TrialPromoCodeField />, slot) : null;
}

/** Fired on `window` with the check of a code typed by hand; the offer banner listens for it. */
export const TRIAL_PROMO_ENTERED_EVENT = "scooli:trial-promo-entered";

type Status = "idle" | "checking" | "invalid" | "error" | "saved";

/**
 * "Tens um código de oferta?" under Clerk's form on `/sign-up` and `/sign-in` (ENG-360), for
 * teachers who can't use the promo link or QR. A valid code is stored exactly as the link stores
 * it, so `TrialPromoApplier` applies it once the account is on its trial.
 */
export function TrialPromoCodeField() {
  const t = useTranslations("billing.trialPromo");
  const pathname = usePathname();
  const inputId = useId();
  const messageId = useId();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [savedCode, setSavedCode] = useState<string | null>(null);

  if (pathname.endsWith("/sso-callback")) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = normalizePromoCode(value);
    if (!code) {
      setStatus("invalid");
      return;
    }
    setStatus("checking");
    let check: TrialPromoCheck;
    try {
      check = await trialPromoService.check(code);
    } catch {
      setStatus("error");
      return;
    }
    posthog.capture("promo_code_entered", { code, valid: check.valid === true });
    if (check.valid !== true) {
      setStatus("invalid");
      return;
    }
    captureTrialPromo(code);
    setSavedCode(code);
    setStatus("saved");
    window.dispatchEvent(new CustomEvent<TrialPromoCheck>(TRIAL_PROMO_ENTERED_EVENT, { detail: check }));
  }

  if (status === "saved" && savedCode) {
    return (
      <p role="status" data-testid="trial-promo-code-saved" className="w-full max-w-[25rem] text-center text-sm text-muted-foreground">
        {t("codeSaved", { code: savedCode })}
      </p>
    );
  }

  if (!open) {
    return (
      <Button type="button" variant="link" size="sm" className="h-auto p-0 text-sm" onClick={() => setOpen(true)}>
        {t("codeToggle")}
      </Button>
    );
  }

  const failed = status === "invalid" || status === "error";
  return (
    <form onSubmit={submit} noValidate className="flex w-full max-w-[25rem] flex-col gap-2 text-left" data-testid="trial-promo-code-form">
      <Label htmlFor={inputId}>{t("codeLabel")}</Label>
      <div className="flex gap-2">
        <Input
          id={inputId}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (failed) setStatus("idle");
          }}
          placeholder={t("codePlaceholder")}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={32}
          autoFocus
          aria-invalid={failed || undefined}
          aria-describedby={failed ? messageId : undefined}
        />
        <Button type="submit" disabled={status === "checking" || value.trim() === ""}>
          {status === "checking" ? t("codeChecking") : t("codeSubmit")}
        </Button>
      </div>
      {failed && (
        <p id={messageId} role="alert" className="text-sm text-destructive">
          {status === "invalid" ? t("codeInvalid") : t("codeError")}
        </p>
      )}
    </form>
  );
}
