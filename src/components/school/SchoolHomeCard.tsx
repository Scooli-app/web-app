"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getDirectionOverview } from "@/services/api/school-direction.service";
import { Routes } from "@/shared/types";
import type { DirectionOverview } from "@/shared/types/school-direction";
import { selectIsClassStateEnabled } from "@/store/features/selectors";
import { useAppSelector } from "@/store/hooks";
import {
  selectHasOrganizationWorkspace,
  selectIsOrganizationAdmin,
  selectWorkspaceContext,
} from "@/store/workspace/selectors";
import { ArrowRight, School } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";

/** On Início, a school admin's door into the school view, with its headline figures. */
export function SchoolHomeCard() {
  const t = useTranslations("schoolDirection.homeCard");
  const hasOrganization = useAppSelector(selectHasOrganizationWorkspace);
  const isAdmin = useAppSelector(selectIsOrganizationAdmin);
  const enabled = useAppSelector(selectIsClassStateEnabled);
  const schoolName = useAppSelector(selectWorkspaceContext)?.organization?.name;
  const visible = hasOrganization && isAdmin && enabled;
  const [overview, setOverview] = useState<DirectionOverview | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    // The figures are a bonus: if they fail, the card is still the way in.
    getDirectionOverview()
      .then((data) => !cancelled && setOverview(data))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <Card className="flex-row flex-wrap items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <School className="size-4 text-primary" aria-hidden />
      </div>
      {/* basis-48: on a phone the button wraps below rather than squeezing the text. */}
      <div className="min-w-0 flex-1 basis-48">
        <p className="truncate text-sm font-semibold">{schoolName ?? t("fallbackName")}</p>
        <p className="text-sm text-muted-foreground">
          {overview && overview.turmas.length > 0
            ? t("figures", { percent: overview.executionPercent ?? 0, behind: overview.counts.behind })
            : t("hint")}
        </p>
      </div>
      <Button asChild size="sm" className="shrink-0">
        <Link href={Routes.SCHOOL}>
          {t("open")}
          <ArrowRight aria-hidden />
        </Link>
      </Button>
    </Card>
  );
}
