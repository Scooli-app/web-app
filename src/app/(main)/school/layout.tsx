import { SchoolAdminGuard } from "@/components/layout/SchoolAdminGuard";
import SchoolLoading from "./loading";

export default function SchoolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SchoolAdminGuard fallback={<SchoolLoading />}>{children}</SchoolAdminGuard>;
}
