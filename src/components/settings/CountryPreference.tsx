"use client";

import { ChoiceChip } from "@/components/ui/choice-chip";
import { setCountryCode, useCountry } from "@/hooks/useCountry";
import { useLocalePreferences } from "@/hooks/useLocalePreferences";
import { COUNTRY_CODES, type CountryCode } from "@/lib/curriculum/countryCatalog";
import { userService } from "@/services/api/user.service";
import { Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

interface CountryPickerProps {
  value: CountryCode;
  onChange: (country: CountryCode) => void;
  disabled?: boolean;
}

/** The two country choices as chips. Shared by the settings page and onboarding. */
export function CountryPicker({ value, onChange, disabled = false }: CountryPickerProps) {
  const t = useTranslations("country");
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t("title")}>
      {COUNTRY_CODES.map((code) => (
        <ChoiceChip
          key={code}
          selected={value === code}
          showCheck
          disabled={disabled}
          onClick={() => onChange(code)}
        >
          {t(`options.${code}`)}
        </ChoiceChip>
      ))}
    </div>
  );
}

/** Settings row: changes the country locally at once and saves it on the profile. */
export function CountryPreference() {
  const t = useTranslations("country");
  const country = useCountry();
  const { followCountry } = useLocalePreferences();
  const [isSaving, setIsSaving] = useState(false);

  const change = async (next: CountryCode) => {
    if (next === country) return;
    setCountryCode(next);
    setIsSaving(true);
    try {
      await userService.updateCountryCode(next);
      // Best effort: the country is saved even if the language default does not land.
      await followCountry(next).catch(() => undefined);
    } catch {
      setCountryCode(country);
      toast.error(t("saveError"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3 p-4 bg-muted rounded-xl">
      <div className="flex items-center gap-3 min-w-0">
        <Globe className="w-5 h-5 shrink-0 text-primary" />
        <p className="truncate font-medium text-foreground">{t("title")}</p>
      </div>
      <CountryPicker value={country} onChange={(next) => void change(next)} disabled={isSaving} />
      <p className="text-xs text-muted-foreground">{t("note")}</p>
    </div>
  );
}
