import { SchoolAdminGuard } from "@/components/layout/SchoolAdminGuard";
import { SchoolAreaNav } from "@/components/school/SchoolAreaNav";
import SchoolLoading from "./loading";

export default function SchoolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SchoolAdminGuard fallback={<SchoolLoading />}>
      <SchoolAreaNav />
      {children}
    </SchoolAdminGuard>
  );
}
