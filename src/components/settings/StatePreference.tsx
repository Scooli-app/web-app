"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCountry } from "@/hooks/useCountry";
import { BRAZIL_STATES, isBrazilStateCode, STATES_WITH_CURRICULUM } from "@/lib/curriculum/brazilStates";
import { userService } from "@/services/api/user.service";
import { MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface StatePickerProps {
  value: string | null;
  onChange: (stateCode: string) => void;
  disabled?: boolean;
}

/** Dropdown of the 27 Brazilian UFs. Shared by the settings page and onboarding. */
export function StatePicker({ value, onChange, disabled = false }: StatePickerProps) {
  const t = useTranslations("country");
  return (
    <Select value={value ?? undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full sm:w-72" aria-label={t("stateTitle")}>
        <SelectValue placeholder={t("statePlaceholder")} />
      </SelectTrigger>
      <SelectContent>
        {BRAZIL_STATES.map((state) => (
          <SelectItem key={state.code} value={state.code}>
            {state.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Whether a state's own curriculum is used, or the BNCC alone. */
export function StateCurriculumNote({ stateCode }: { stateCode: string | null }) {
  const t = useTranslations("country");
  if (!stateCode) return <p className="text-xs text-muted-foreground">{t("stateNote")}</p>;
  const withCurriculum = STATES_WITH_CURRICULUM.some((code) => code === stateCode);
  return (
    <p className="text-xs text-muted-foreground">
      {withCurriculum ? t("stateWithCurriculum") : t("stateBnccOnly")}
    </p>
  );
}

/** Settings row, shown to Brazilian teachers only: the state adds its curriculum on top of the BNCC. */
export function StatePreference() {
  const t = useTranslations("country");
  const country = useCountry();
  const [stateCode, setStateCode] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    userService
      .getCurrentUser()
      .then((profile) => {
        if (!cancelled) setStateCode(isBrazilStateCode(profile.stateCode) ? profile.stateCode : null);
      })
      .catch(() => {
        // The picker stays empty; choosing a state still saves.
      });
    return () => {
      cancelled = true;
    };
  }, [country]);

  if (country !== "BR") return null;

  const change = async (next: string) => {
    if (next === stateCode) return;
    const previous = stateCode;
    setStateCode(next);
    setIsSaving(true);
    try {
      await userService.updateStateCode(next);
    } catch {
      setStateCode(previous);
      toast.error(t("stateSaveError"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3 p-4 bg-muted rounded-xl">
      <div className="flex items-center gap-3 min-w-0">
        <MapPin className="w-5 h-5 shrink-0 text-primary" />
        <p className="truncate font-medium text-foreground">{t("stateTitle")}</p>
      </div>
      <StatePicker value={stateCode} onChange={(next) => void change(next)} disabled={isSaving} />
      <StateCurriculumNote stateCode={stateCode} />
    </div>
  );
}
