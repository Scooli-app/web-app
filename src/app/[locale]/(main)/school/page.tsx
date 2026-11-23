"use client";

import { useFeatureAccess } from "@/components/feature/useFeatureAccess";
import { SchoolUsageOverview } from "@/components/school/SchoolUsageOverview";
import { DirectionDashboard } from "@/components/school/direction/DirectionDashboard";
import { selectIsClassStateEnabled } from "@/store/features/selectors";
import SchoolLoading from "./loading";

export default function SchoolPage() {
  const { loaded, enabled } = useFeatureAccess(selectIsClassStateEnabled);

  // Until the flags are known, don't flash the usage overview (and fetch its data) at a school that has the direction view.
  if (!loaded) return <SchoolLoading />;
  return enabled ? <DirectionDashboard /> : <SchoolUsageOverview />;
}
