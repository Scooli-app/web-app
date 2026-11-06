"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

/**
 * While the account is read-only, printing shows only "Atualiza para Pro para imprimir"
 * (`@media print` rules on `body[data-print-locked]` in globals.css). Best effort: the browser's
 * print dialog cannot be blocked, only what it prints.
 */
export function AccountPrintLock({ locked }: { locked: boolean }) {
  const t = useTranslations("billing.lock");
  const message = t("printMessage");

  useEffect(() => {
    if (!locked) return;
    const { body } = document;
    body.dataset.printLocked = message;
    return () => {
      delete body.dataset.printLocked;
    };
  }, [locked, message]);

  return null;
}
