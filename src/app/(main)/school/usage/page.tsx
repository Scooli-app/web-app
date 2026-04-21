"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  selectWorkspaceError,
  selectWorkspaceDashboard,
  selectWorkspaceLoading,
} from "@/store/workspace/selectors";
import { fetchOrganizationDashboard } from "@/store/workspace/workspaceSlice";
import { ChartColumn } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useEffect } from "react";

export default function SchoolUsagePage() {
  const dispatch = useAppDispatch();
  const dashboard = useAppSelector(selectWorkspaceDashboard);
  const loading = useAppSelector(selectWorkspaceLoading);
  const error = useAppSelector(selectWorkspaceError);

  useEffect(() => {
    void dispatch(fetchOrganizationDashboard());
  }, [dispatch]);

  return (
    <PageContainer size="xl" contentClassName="py-4 sm:py-8">
      <PageHeader
        title="Utilização da escola"
        description="Vista inicial da utilização agregada da organização."
      />

      {error && !loading && !dashboard ? (
        <Card>
          <CardHeader>
            <CardTitle>Não foi possível carregar a utilização da escola</CardTitle>
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
            <CardTitle className="flex items-center gap-2">
              <ChartColumn className="h-4 w-4 text-primary" />
              Gerações deste mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {loading && !dashboard ? "..." : dashboard?.generationsThisMonth ?? 0}
            </p>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
