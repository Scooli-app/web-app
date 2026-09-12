"use client";

import { cn } from "@/shared/utils/utils";
import { useTranslations } from "next-intl";

/**
 * The "AI can make mistakes" notice, shown next to every control that asks the
 * model to write something the teacher will use — generating, regenerating,
 * chatting, prompting for an image.
 *
 * One component reading one message key, so the wording changes in one place and
 * cannot drift between surfaces. It used to be three copies of the same sentence
 * in three namespaces, each styled by hand.
 *
 * - `block` (default): the full sentence, centred — under a full-width button,
 *   a form, a dialog footer or a chat input.
 * - `compact`: the short sentence, for tight spots such as a toolbar or a small
 *   header button, where the full one would wrap or crowd the control.
 */
export function AiDisclaimer({
  className,
  variant = "block",
}: {
  className?: string;
  variant?: "block" | "compact";
}) {
  const t = useTranslations("common");

  return (
    <p
      className={cn(
        "text-[11px] leading-4 text-muted-foreground/70",
        variant === "block" ? "text-center" : "whitespace-nowrap text-[10px] leading-3",
        className,
      )}
    >
      {variant === "block" ? t("aiDisclaimer") : t("aiDisclaimerShort")}
    </p>
  );
}
