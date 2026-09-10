"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectWorkspaceContext,
  selectWorkspaceDashboard,
  selectWorkspaceError,
  selectWorkspaceLoading,
} from "@/store/workspace/selectors";
import { fetchOrganizationDashboard } from "@/store/workspace/workspaceSlice";
import {
  BookOpenText,
  Building2,
  ChartColumn,
  FileText,
  LibraryBig,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";

type Translator = ReturnType<typeof useTranslations>;

function buildStats(t: Translator) {
  return [
    { key: "activeSeats", title: t("dashboard.stats.activeSeats"), icon: Users },
    { key: "availableSeats", title: t("dashboard.stats.availableSeats"), icon: ShieldCheck },
    { key: "activeTeachersThisMonth", title: t("dashboard.stats.activeTeachers"), icon: Building2 },
    { key: "generationsThisMonth", title: t("dashboard.stats.aiRequestsThisMonth"), icon: ChartColumn },
    { key: "totalDocuments", title: t("dashboard.stats.totalDocuments"), icon: FileText },
    { key: "sharedResources", title: t("dashboard.stats.sharedResources"), icon: LibraryBig },
  ] as const;
}

function formatDocumentType(documentType: string, tEnums: Translator): string {
  const key = `documentType.${documentType}` as Parameters<Translator["has"]>[0];
  return tEnums.has(key) ? tEnums(key) : documentType;
}

function formatRole(role: string, t: Translator): string {
  const key = `roles.${role}` as Parameters<Translator["has"]>[0];
  return t.has(key) ? t(key) : role;
}

function formatSubscriptionStatus(status: string | null | undefined, t: Translator): string {
  if (!status) {
    return t("common.notSet");
  }
  const key = `subscriptionStatus.${status}` as Parameters<Translator["has"]>[0];
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

function formatShortDay(date: string, locale: string): string {
  return new Date(date).toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
  });
}

export default function SchoolDashboardPage() {
  const dispatch = useAppDispatch();
  const workspace = useAppSelector(selectWorkspaceContext);
  const dashboard = useAppSelector(selectWorkspaceDashboard);
  const loading = useAppSelector(selectWorkspaceLoading);
  const error = useAppSelector(selectWorkspaceError);
  const t = useTranslations("school");
  const tEnums = useTranslations("enums");
  const locale = useLocale();
  const STATS = buildStats(t);

  useEffect(() => {
    void dispatch(fetchOrganizationDashboard());
  }, [dispatch]);

  const maxActivity = Math.max(
    ...(dashboard?.activityByDay?.map((point) => point.generations) ?? [0]),
    1,
  );

  return (
    <PageContainer size="xl" contentClassName="py-4 sm:py-8">
      <PageHeader
        title={workspace?.organization?.name ?? t("common.fallbackName")}
        description={t("dashboard.description")}
        icon={
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 sm:h-12 sm:w-12">
            <Building2 className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
          </div>
        }
      />

      {error && !loading && !dashboard ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.loadError")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => void dispatch(fetchOrganizationDashboard())}>
              {t("common.retry")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {STATS.map((item) => {
              const Icon = item.icon;
              const value = dashboard?.[item.key] ?? 0;

              return (
                <Card key={item.key} className="border-border/80 bg-card/95">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <CardTitle className="max-w-[10rem] text-sm font-medium leading-5 text-muted-foreground">
                      {item.title}
                    </CardTitle>
                    <div className="rounded-lg bg-primary/10 p-2 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-semibold tracking-tight">
                      {loading && !dashboard ? "..." : value}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("dashboard.planCard.title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div className="flex items-center justify-between gap-3">
                  <span>{t("dashboard.planCard.plan")}</span>
                  <span className="font-medium text-foreground">
                    {dashboard?.planCode ?? t("dashboard.planCard.manualFallback")}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>{t("dashboard.planCard.status")}</span>
                  <Badge variant="secondary">
                    {formatSubscriptionStatus(dashboard?.subscriptionStatus, t)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>{t("dashboard.planCard.seatLimit")}</span>
                  <span className="font-medium text-foreground">{dashboard?.seatLimit ?? 0}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>{t("dashboard.planCard.renewal")}</span>
                  <span className="font-medium text-foreground">
                    {formatDate(dashboard?.renewalAt, locale, t)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("dashboard.usageCard.title")}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-xl border border-border/80 px-4 py-3">
                  <p className="text-muted-foreground">{t("dashboard.usageCard.pendingInvites")}</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{dashboard?.invitedSeats ?? 0}</p>
                </div>
                <div className="rounded-xl border border-border/80 px-4 py-3">
                  <p className="text-muted-foreground">{t("dashboard.usageCard.suspendedSeats")}</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{dashboard?.suspendedSeats ?? 0}</p>
                </div>
                <div className="rounded-xl border border-border/80 px-4 py-3">
                  <p className="text-muted-foreground">{t("dashboard.usageCard.documentsCreatedThisMonth")}</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {dashboard?.documentsCreatedThisMonth ?? 0}
                  </p>
                </div>
                <div className="rounded-xl border border-border/80 px-4 py-3">
                  <p className="text-muted-foreground">{t("dashboard.usageCard.internalShares")}</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{dashboard?.sharedResources ?? 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t("dashboard.activityCard.title")}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("dashboard.activityCard.description")}
                  </p>
                </div>
                <Badge variant="outline">
                  {t("dashboard.activityCard.requestsThisMonthBadge", {
                    count: dashboard?.generationsThisMonth ?? 0,
                  })}
                </Badge>
              </CardHeader>
              <CardContent>
                {dashboard?.activityByDay?.length ? (
                  <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                    <div className="flex h-64 items-end gap-2 sm:gap-3">
                      {dashboard.activityByDay.map((point) => {
                        const barHeight = Math.max((point.generations / maxActivity) * 100, point.generations > 0 ? 12 : 4);

                        return (
                          <div key={point.date} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2">
                            <div className="text-center text-xs font-medium text-foreground">
                              {point.generations}
                            </div>
                            <div className="relative flex-1 rounded-xl bg-muted/60">
                              <div
                                className="absolute inset-x-0 bottom-0 rounded-xl bg-gradient-to-t from-primary to-primary/70 transition-all"
                                style={{ height: `${barHeight}%` }}
                                title={t("dashboard.activityCard.tooltip", {
                                  day: formatShortDay(point.date, locale),
                                  count: point.generations,
                                })}
                              />
                            </div>
                            <div className="text-center text-[11px] text-muted-foreground">
                              {formatShortDay(point.date, locale)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border/80 px-6 py-10 text-center text-sm text-muted-foreground">
                    {t("dashboard.activityCard.empty")}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("dashboard.documentTypesCard.title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {dashboard?.topDocumentTypes?.length ? (
                  dashboard.topDocumentTypes.map((item) => (
                    <div
                      key={item.documentType}
                      className="flex items-center justify-between rounded-xl border border-border/80 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2 text-primary">
                          <BookOpenText className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          {formatDocumentType(item.documentType, tEnums)}
                        </span>
                      </div>
                      <Badge variant="secondary">{item.count}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("dashboard.documentTypesCard.empty")}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>{t("dashboard.activeUsersCard.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboard?.topActiveMembers?.length ? (
                dashboard.topActiveMembers.map((member) => (
                  <div
                    key={member.userId}
                    className="flex flex-col gap-4 rounded-2xl border border-border/80 p-4 xl:flex-row xl:items-center xl:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {member.name || member.email || t("common.unnamedUser")}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {member.email ?? t("dashboard.activeUsersCard.noEmail")} ·{" "}
                        {formatRole(member.role, t)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("dashboard.activeUsersCard.lastActive", {
                          date: formatDate(member.lastActiveAt, locale, t),
                        })}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 text-sm">
                      <Badge variant="secondary">
                        {t("dashboard.activeUsersCard.aiRequestsBadge", {
                          count: member.generationsThisMonth,
                        })}
                      </Badge>
                      <Badge variant="secondary">
                        {t("dashboard.activeUsersCard.documentsThisMonthBadge", {
                          count: member.documentsCreatedThisMonth,
                        })}
                      </Badge>
                      <Badge variant="outline">
                        {t("dashboard.activeUsersCard.totalDocumentsBadge", {
                          count: member.totalDocuments,
                        })}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("dashboard.activeUsersCard.empty")}
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </PageContainer>
  );
}
