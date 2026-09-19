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
import { useTranslations } from "next-intl";
import { useEffect } from "react";

export default function SchoolSettingsPage() {
  const dispatch = useAppDispatch();
  const workspace = useAppSelector(selectWorkspaceContext);
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
        title={t("settings.title")}
        description={t("settings.description")}
      />

      {error && !loading && !dashboard ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.loadError")}</CardTitle>
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
            <CardTitle>{workspace?.organization?.name ?? t("common.fallbackName")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              {t("settings.currentRole")}{" "}
              <span className="font-medium text-foreground">
                {workspace?.organization?.role ?? "teacher"}
              </span>
            </p>
            <p>
              {t("settings.contractStatus")}{" "}
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
