"use client";

import { SchoolUsageOverview } from "@/components/school/SchoolUsageOverview";
import { selectIsClassStateEnabled } from "@/store/features/selectors";
import { useAppSelector } from "@/store/hooks";
import { useTranslations } from "next-intl";

export default function SchoolUsagePage() {
  const t = useTranslations("nav.items");
  // Under the school area header, which already names the school.
  const inSchoolArea = useAppSelector(selectIsClassStateEnabled);
  return <SchoolUsageOverview title={inSchoolArea ? t("schoolUsage.title") : undefined} />;
}
