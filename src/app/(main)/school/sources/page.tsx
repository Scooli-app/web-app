import { OrganizationSourcesGate } from "@/components/school/sources/OrganizationSourcesGate";
import { SchoolSourcesPanel } from "@/components/school/sources/SchoolSourcesPanel";

export default function SchoolSourcesPage() {
  return (
    <OrganizationSourcesGate>
      <SchoolSourcesPanel />
    </OrganizationSourcesGate>
  );
}
