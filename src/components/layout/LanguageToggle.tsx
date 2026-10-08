"use client";

import { memo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, Languages } from "lucide-react";
import { useLocalePreferences } from "@/hooks/useLocalePreferences";
import { locales, LOCALE_LABELS, type Locale } from "@/i18n/locales";

const LOCALE_CODES: Record<Locale, string> = {
  "pt-PT": "PT",
  en: "EN",
};

function LanguageToggleComponent() {
  const t = useTranslations("layout.languageToggle");
  const { interfaceLocale, changeInterfacePreference } = useLocalePreferences();

  const handleChange = useCallback(
    (locale: Locale) => {
      if (locale === interfaceLocale) return;
      void changeInterfacePreference(locale);
    },
    [interfaceLocale, changeInterfacePreference],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-10 gap-1.5 rounded-full px-3 text-foreground hover:bg-accent hover:text-primary"
        >
          <Languages className="h-5 w-5" />
          <span className="text-sm font-semibold">
            {LOCALE_CODES[interfaceLocale]}
          </span>
          <span className="sr-only">{t("srLabel")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {locales.map((locale) => {
          const isActive = locale === interfaceLocale;
          return (
            <DropdownMenuItem
              key={locale}
              onClick={() => handleChange(locale)}
              className="flex items-center justify-between"
            >
              <span>{LOCALE_LABELS[locale]}</span>
              {isActive && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const LanguageToggle = memo(LanguageToggleComponent);
LanguageToggle.displayName = "LanguageToggle";
