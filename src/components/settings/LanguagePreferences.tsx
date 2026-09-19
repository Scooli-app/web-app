"use client";

import { Button } from "@/components/ui/button";
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
import { cn } from "@/shared/utils/utils";
import { Check, FileText, Globe, Languages, MonitorSmartphone } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

/**
 * The two language controls, built on the same three-button grid the theme
 * control uses. Both are three-state for the same reason the theme is: the third
 * option defers to something else rather than naming a value, and it is the
 * default.
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

function ChoiceButton({
  isSelected,
  onClick,
  disabled,
  children,
}: {
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      variant="outline"
      className={cn(
        "flex items-center justify-center gap-2 px-3 py-2 rounded-xl",
        isSelected
          ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
          : "border-border text-foreground bg-background hover:bg-accent",
      )}
    >
      {children}
      {isSelected && <Check className="w-4 h-4 hidden sm:block" />}
    </Button>
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

  const interfaceHint =
    interfacePreference === FOLLOW_BROWSER
      ? `${t("interface.followBrowserHint")} · ${LOCALE_LABELS[detectedLocale ?? defaultLocale]}`
      : LOCALE_LABELS[interfacePreference];

  const contentHint =
    contentPreference === SAME_AS_INTERFACE
      ? `${t("content.sameAsInterfaceHint")} · ${LOCALE_LABELS[interfaceLocale]}`
      : LOCALE_LABELS[contentPreference];

  return (
    <>
      {/* Interface language */}
      <div className="p-4 bg-muted rounded-xl">
        <div className="flex items-center gap-3 mb-4">
          <Languages className="w-5 h-5 text-primary" />
          <div>
            <p className="font-medium text-foreground">
              {t("interface.title")}
            </p>
            <p className="text-sm text-muted-foreground">{interfaceHint}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {INTERFACE_OPTIONS.map((option) => (
            <ChoiceButton
              key={option}
              isSelected={interfacePreference === option}
              disabled={isSaving}
              onClick={() =>
                void persist(() => changeInterfacePreference(option))
              }
            >
              {option === FOLLOW_BROWSER ? (
                <MonitorSmartphone className="w-4 h-4" />
              ) : (
                <Globe className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {t(`interface.options.${option}`)}
              </span>
            </ChoiceButton>
          ))}
        </div>
      </div>

      {/* Content language */}
      <div className="p-4 bg-muted rounded-xl">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-5 h-5 text-primary" />
          <div>
            <p className="font-medium text-foreground">{t("content.title")}</p>
            <p className="text-sm text-muted-foreground">{contentHint}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {CONTENT_OPTIONS.map((option) => (
            <ChoiceButton
              key={option}
              isSelected={contentPreference === option}
              disabled={isSaving}
              onClick={() => void persist(() => changeContentPreference(option))}
            >
              {option === SAME_AS_INTERFACE ? (
                <Languages className="w-4 h-4" />
              ) : (
                <Globe className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {t(`content.options.${option}`)}
              </span>
            </ChoiceButton>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {t("content.curriculumNote")}
        </p>
      </div>
    </>
  );
}
