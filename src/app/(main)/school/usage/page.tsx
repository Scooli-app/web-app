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
import { useTranslations } from "next-intl";
import { useEffect } from "react";

export default function SchoolUsagePage() {
  const dispatch = useAppDispatch();
  const dashboard = useAppSelector(selectWorkspaceDashboard);
  const loading = useAppSelector(selectWorkspaceLoading);
  const error = useAppSelector(selectWorkspaceError);
  const t = useTranslations("school");

  useEffect(() => {
    void dispatch(fetchOrganizationDashboard());
  }, [dispatch]);

  return (
    <PageContainer size="xl" contentClassName="py-4 sm:py-8">
      <PageHeader
        title={t("usage.title")}
        description={t("usage.description")}
      />

      {error && !loading && !dashboard ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("usage.loadError")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              onClick={() => void dispatch(fetchOrganizationDashboard())}
            >
              {t("common.retry")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChartColumn className="h-4 w-4 text-primary" />
              {t("usage.generationsThisMonth")}
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
