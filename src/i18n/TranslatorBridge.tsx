"use client";

import { useTranslations } from "next-intl";
import { registerTranslator } from "./translate";

/**
 * Hands the provider's translator to `translate()` for non-React code.
 *
 * Registers during render rather than in an effect so it is in place before
 * any child effect can dispatch a thunk that needs it. Renders nothing.
 */
export function TranslatorBridge() {
  const t = useTranslations();
  registerTranslator((key, values) => t(key, values));
  return null;
}
