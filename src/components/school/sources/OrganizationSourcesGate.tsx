"use client";

import { DirectionGate } from "@/components/school/direction/DirectionGate";
import { selectIsOrganizationSourcesEnabled } from "@/store/features/selectors";

/** The school sources page exists only while `organization_sources` is on for the school. */
export function OrganizationSourcesGate({ children }: { children: React.ReactNode }) {
  return <DirectionGate flag={selectIsOrganizationSourcesEnabled}>{children}</DirectionGate>;
}
