import { SchoolAdminGuard } from "@/components/layout/SchoolAdminGuard";

export default function SchoolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SchoolAdminGuard>{children}</SchoolAdminGuard>;
}
