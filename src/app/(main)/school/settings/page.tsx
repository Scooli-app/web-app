"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  selectHasOrganizationWorkspace,
  selectWorkspaceContext,
  selectWorkspaceDashboard,
} from "@/store/workspace/selectors";
import { fetchOrganizationDashboard } from "@/store/workspace/workspaceSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SchoolSettingsPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const workspace = useAppSelector(selectWorkspaceContext);
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
        title="Definições da escola"
        description="Resumo inicial do workspace organizacional."
      />

      <Card>
        <CardHeader>
          <CardTitle>{workspace?.organization?.name ?? "Escola"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Role atual:{" "}
            <span className="font-medium text-foreground">
              {workspace?.organization?.role ?? "teacher"}
            </span>
          </p>
          <p>
            Estado do contrato:{" "}
            <span className="font-medium text-foreground">
              {dashboard?.subscriptionStatus ?? "draft"}
            </span>
          </p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
