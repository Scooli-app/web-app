"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  selectHasOrganizationWorkspace,
  selectWorkspaceDashboard,
} from "@/store/workspace/selectors";
import { fetchOrganizationDashboard } from "@/store/workspace/workspaceSlice";
import { ChartColumn } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SchoolUsagePage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const dashboard = useAppSelector(selectWorkspaceDashboard);
  const hasOrganizationWorkspace = useAppSelector(selectHasOrganizationWorkspace);

  useEffect(() => {
    if (!hasOrganizationWorkspace) {
      router.replace("/dashboard");
      return;
    }

    void dispatch(fetchOrganizationDashboard());
  }, [dispatch, hasOrganizationWorkspace, router]);

  if (!hasOrganizationWorkspace) {
    return null;
  }

  return (
    <PageContainer size="xl" contentClassName="py-4 sm:py-8">
      <PageHeader
        title="Utilização da escola"
        description="Vista inicial da utilização agregada da organização."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartColumn className="h-4 w-4 text-primary" />
            Gerações deste mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">{dashboard?.generationsThisMonth ?? 0}</p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
