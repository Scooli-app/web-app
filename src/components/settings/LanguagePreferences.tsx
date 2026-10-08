"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useDetectedBrowserLocale,
  useLocalePreferences,
} from "@/hooks/useLocalePreferences";
import { LOCALE_LABELS, defaultLocale } from "@/i18n/locales";
import {
  FOLLOW_BROWSER,
  SAME_AS_INTERFACE,
  type ContentLanguagePreference,
  type InterfaceLocalePreference,
} from "@/i18n/preferences";
import { Check, ChevronDown, FileText, Languages, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

/**
 * The two language controls, each a single dropdown rather than a button
 * grid: one visible value plus a menu of the alternatives reads faster than
 * three buttons where only one differs from the others at a time.
 */

const INTERFACE_OPTIONS: InterfaceLocalePreference[] = [
  "pt-PT",
  "en",
  FOLLOW_BROWSER,
];

const CONTENT_OPTIONS: ContentLanguagePreference[] = [
  "pt-PT",
  "en",
  SAME_AS_INTERFACE,
];

function LanguageRow<Option extends string>({
  icon: Icon,
  title,
  triggerLabel,
  options,
  value,
  optionLabel,
  disabled,
  onChange,
}: {
  icon: LucideIcon;
  title: string;
  triggerLabel: string;
  options: Option[];
  value: Option;
  optionLabel: (option: Option) => string;
  disabled: boolean;
  onChange: (option: Option) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-4 bg-muted rounded-xl">
      <div className="flex items-center gap-3 min-w-0">
        <Icon className="w-5 h-5 shrink-0 text-primary" />
        <p className="truncate font-medium text-foreground">{title}</p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
          >
            {triggerLabel}
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {options.map((option) => (
            <DropdownMenuItem
              key={option}
              onClick={() => onChange(option)}
              className="flex items-center justify-between"
            >
              <span>{optionLabel(option)}</span>
              {option === value && <Check className="w-4 h-4 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function LanguagePreferences() {
  const t = useTranslations("language");
  const {
    interfacePreference,
    contentPreference,
    interfaceLocale,
    changeInterfacePreference,
    changeContentPreference,
  } = useLocalePreferences();
  const detectedLocale = useDetectedBrowserLocale();
  const [isSaving, setIsSaving] = useState(false);

  // A failed save is worth telling the teacher about, but not worth undoing:
  // the choice has already taken effect in this browser, and reverting the UI
  // under them would be the more confusing outcome.
  const persist = async (save: () => Promise<void>) => {
    setIsSaving(true);
    try {
      await save();
    } catch {
      toast.error(t("saveError"));
    } finally {
      setIsSaving(false);
    }
  };

  const interfaceTriggerLabel =
    interfacePreference === FOLLOW_BROWSER
      ? `${t("interface.followBrowserHint")} · ${LOCALE_LABELS[detectedLocale ?? defaultLocale]}`
      : t(`interface.options.${interfacePreference}`);

  const contentTriggerLabel =
    contentPreference === SAME_AS_INTERFACE
      ? `${t("content.sameAsInterfaceHint")} · ${LOCALE_LABELS[interfaceLocale]}`
      : t(`content.options.${contentPreference}`);

  return (
    <>
      <LanguageRow
        icon={Languages}
        title={t("interface.title")}
        triggerLabel={interfaceTriggerLabel}
        options={INTERFACE_OPTIONS}
        value={interfacePreference}
        optionLabel={(option) => t(`interface.options.${option}`)}
        disabled={isSaving}
        onChange={(option) => void persist(() => changeInterfacePreference(option))}
      />

      <LanguageRow
        icon={FileText}
        title={t("content.title")}
        triggerLabel={contentTriggerLabel}
        options={CONTENT_OPTIONS}
        value={contentPreference}
        optionLabel={(option) => t(`content.options.${option}`)}
        disabled={isSaving}
        onChange={(option) => void persist(() => changeContentPreference(option))}
      />

      <p className="px-1 text-xs text-muted-foreground">
        {t("content.curriculumNote")}
      </p>
    </>
  );
}
