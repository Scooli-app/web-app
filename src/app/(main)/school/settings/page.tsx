"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  selectWorkspaceError,
  selectWorkspaceContext,
  selectWorkspaceDashboard,
  selectWorkspaceLoading,
} from "@/store/workspace/selectors";
import { fetchOrganizationDashboard } from "@/store/workspace/workspaceSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useEffect } from "react";

export default function SchoolSettingsPage() {
  const dispatch = useAppDispatch();
  const workspace = useAppSelector(selectWorkspaceContext);
  const dashboard = useAppSelector(selectWorkspaceDashboard);
  const loading = useAppSelector(selectWorkspaceLoading);
  const error = useAppSelector(selectWorkspaceError);

  useEffect(() => {
    void dispatch(fetchOrganizationDashboard());
  }, [dispatch]);

  return (
    <PageContainer size="xl" contentClassName="py-4 sm:py-8">
      <PageHeader
        title="Definições da escola"
        description="Resumo inicial do workspace organizacional."
      />

      {error && !loading && !dashboard ? (
        <Card>
          <CardHeader>
            <CardTitle>Não foi possível carregar as definições da escola</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              onClick={() => void dispatch(fetchOrganizationDashboard())}
            >
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : (
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
      )}
    </PageContainer>
  );
}
