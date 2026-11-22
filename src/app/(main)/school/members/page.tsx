"use client";

import { SkeletonRows } from "@/components/ui/page-skeleton";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { SchoolMembersPanel } from "@/components/school/members/SchoolMembersPanel";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectWorkspaceContext,
  selectWorkspaceDashboard,
  selectWorkspaceError,
  selectWorkspaceInvitations,
  selectWorkspaceInvitationsError,
  selectWorkspaceLoading,
  selectWorkspaceMembers,
} from "@/store/workspace/selectors";
import {
  fetchOrganizationDashboard,
  fetchOrganizationInvitations,
  fetchOrganizationMembers,
} from "@/store/workspace/workspaceSlice";
import { Activity, Share2, Sparkles, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect } from "react";

export default function SchoolMembersPage() {
  const dispatch = useAppDispatch();
  const workspace = useAppSelector(selectWorkspaceContext);
  const members = useAppSelector(selectWorkspaceMembers);
  const invitations = useAppSelector(selectWorkspaceInvitations);
  const invitationsError = useAppSelector(selectWorkspaceInvitationsError);
  const dashboard = useAppSelector(selectWorkspaceDashboard);
  const loading = useAppSelector(selectWorkspaceLoading);
  const error = useAppSelector(selectWorkspaceError);
  const t = useTranslations("school");

  const refresh = useCallback(() => {
    void dispatch(fetchOrganizationMembers());
    void dispatch(fetchOrganizationInvitations());
  }, [dispatch]);

  useEffect(() => {
    refresh();
    // Only for the seat limit.
    void dispatch(fetchOrganizationDashboard());
  }, [dispatch, refresh]);

  const totalMembers = members.length;
  const activeMembers = members.filter((member) => member.status === "active").length;
  // Active = used Scooli this month (lastActiveAt is the latest successful interaction); no per-teacher counts.
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const activeThisMonth = members.filter(
    (member) => !!member.lastActiveAt && new Date(member.lastActiveAt) >= monthStart,
  ).length;
  const totalInternalShares = members.reduce((sum, member) => sum + member.sharedResourcesCount, 0);

  return (
    <PageContainer size="xl" contentClassName="py-4 sm:py-8">
      <PageHeader
        title={t("members.title")}
        description={t("members.description", {
          organizationName: workspace?.organization?.name ?? t("members.fallbackOrganization"),
        })}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("members.stats.total")}</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">{totalMembers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("members.stats.active")}</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">{activeMembers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("members.stats.aiActivity")}</CardTitle>
            <Sparkles className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">{activeThisMonth}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("members.stats.internalShares")}</CardTitle>
            <Share2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">{totalInternalShares}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardContent className="pt-6">
          {error && !loading && members.length === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" onClick={refresh}>
                {t("common.retry")}
              </Button>
            </div>
          ) : loading && members.length === 0 ? (
            <SkeletonRows rows={3} />
          ) : members.length === 0 ? (
            <EmptyState
              size="inline"
              icon={Users}
              title={t("members.emptyTitle")}
              description={t("members.empty")}
            />
          ) : (
            <SchoolMembersPanel
              members={members}
              invitations={invitations}
              seatLimit={dashboard?.seatLimit ?? 0}
              invitationsError={invitationsError}
              onChanged={refresh}
            />
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
