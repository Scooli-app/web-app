"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectWorkspaceContext,
  selectWorkspaceError,
  selectWorkspaceLoading,
  selectWorkspaceMembers,
} from "@/store/workspace/selectors";
import { fetchOrganizationMembers } from "@/store/workspace/workspaceSlice";
import { Activity, Building2, FileText, Share2, Sparkles, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";

type Translator = ReturnType<typeof useTranslations>;

function formatRole(role: string, t: Translator): string {
  const key = `roles.${role}` as Parameters<Translator["has"]>[0];
  return t.has(key) ? t(key) : role;
}

function formatStatus(status: string, t: Translator): string {
  const key = `memberStatus.${status}` as Parameters<Translator["has"]>[0];
  return t.has(key) ? t(key) : status;
}

function formatDate(date: string | null | undefined, locale: string, t: Translator): string {
  if (!date) {
    return t("common.notSet");
  }

  return new Date(date).toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function SchoolMembersPage() {
  const dispatch = useAppDispatch();
  const workspace = useAppSelector(selectWorkspaceContext);
  const members = useAppSelector(selectWorkspaceMembers);
  const loading = useAppSelector(selectWorkspaceLoading);
  const error = useAppSelector(selectWorkspaceError);
  const t = useTranslations("school");
  const locale = useLocale();

  useEffect(() => {
    void dispatch(fetchOrganizationMembers());
  }, [dispatch]);

  const totalMembers = members.length;
  const activeMembers = members.filter((member) => member.status === "active").length;
  const activeThisMonth = members.filter((member) => member.generationsThisMonth > 0).length;
  const totalInternalShares = members.reduce((sum, member) => sum + member.sharedResourcesCount, 0);

  return (
    <PageContainer size="xl" contentClassName="py-4 sm:py-8">
      <PageHeader
        title={t("members.title")}
        description={t("members.description", {
          organizationName: workspace?.organization?.name ?? t("members.fallbackOrganization"),
        })}
        icon={
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 sm:h-12 sm:w-12">
            <Building2 className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
          </div>
        }
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
        <CardHeader>
          <CardTitle>{t("members.listTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && !loading && members.length === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" onClick={() => void dispatch(fetchOrganizationMembers())}>
                {t("common.retry")}
              </Button>
            </div>
          ) : loading && members.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("members.loading")}</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("members.empty")}
            </p>
          ) : (
            members.map((member) => (
              <div
                key={member.membershipId}
                className="flex flex-col gap-4 rounded-2xl border border-border/80 p-4 xl:flex-row xl:items-center xl:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {member.name || member.email || t("members.unnamedMember")}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {member.email ?? t("members.noEmail")} · {formatRole(member.role, t)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("members.joinedAndLastActive", {
                      joinedDate: formatDate(member.joinedAt, locale, t),
                      lastActiveDate: formatDate(member.lastActiveAt, locale, t),
                    })}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:min-w-[34rem]">
                  <div className="rounded-xl border border-border/70 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5" />
                      {t("members.aiRequestsLabel")}
                    </div>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {t("members.aiRequestsCount", { count: member.generationsThisMonth })}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/70 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" />
                      {t("members.documentsLabel")}
                    </div>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {t("members.documentsCount", { count: member.totalDocuments })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("members.createdThisMonth", { count: member.documentsCreatedThisMonth })}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/70 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">{t("members.statusLabel")}</span>
                      <Badge variant={member.status === "active" ? "default" : "outline"}>
                        {formatStatus(member.status, t)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {t("members.internalSharesCount", { count: member.sharedResourcesCount })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
