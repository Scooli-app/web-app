/**
 * Contributor Dashboard Component
 * Shows impact metrics and a full list of the contributor's submissions,
 * including rejected resources with moderator feedback.
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/shared/utils/utils";
import {
  fetchContributorStats,
  fetchMyResources,
  selectContributorStats,
  selectIsLoadingStats,
  selectMyResources,
} from "@/store/community";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { translateSubject } from "@/components/document-creation/constants";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock,
  MessageSquare,
  Share2,
  Star,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

type ResourceStatus = "PENDING" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";

/** Key under `community.contributorDashboard.status` for each backend status. */
const STATUS_LABEL_KEY: Record<ResourceStatus, string> = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  CHANGES_REQUESTED: "changesRequested",
};

const STATUS_CONFIG: Record<
  ResourceStatus,
  {
    icon: React.ReactNode;
    badgeClass: string;
    cardClass: string;
  }
> = {
  PENDING: {
    icon: <Clock className="h-4 w-4 text-amber-500" />,
    badgeClass:
      "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    cardClass: "border-amber-200 dark:border-amber-800",
  },
  APPROVED: {
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    badgeClass:
      "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    cardClass: "border-emerald-200 dark:border-emerald-800",
  },
  REJECTED: {
    icon: <XCircle className="h-4 w-4 text-red-500" />,
    badgeClass:
      "border-red-200 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-900/40 dark:text-red-300",
    cardClass:
      "border-red-200 bg-red-50/30 dark:border-red-800 dark:bg-red-950/10",
  },
  CHANGES_REQUESTED: {
    icon: <MessageSquare className="h-4 w-4 text-orange-500" />,
    badgeClass:
      "border-orange-200 bg-orange-100 text-orange-700 dark:border-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
    cardClass:
      "border-orange-200 bg-orange-50/30 dark:border-orange-800 dark:bg-orange-950/10",
  },
};

export function ContributorDashboard() {
  const t = useTranslations("community.contributorDashboard");
  const dispatch = useAppDispatch();
  const stats = useAppSelector(selectContributorStats);
  const myResources = useAppSelector(selectMyResources);
  const isLoading = useAppSelector(selectIsLoadingStats);

  useEffect(() => {
    dispatch(fetchContributorStats());
    dispatch(fetchMyResources());
  }, [dispatch]);

  const attentionResources = myResources.filter(
    (r) => r.status === "REJECTED" || r.status === "CHANGES_REQUESTED",
  );
  const pendingResources = myResources.filter((r) => r.status === "PENDING");
  const approvedResources = myResources.filter((r) => r.status === "APPROVED");

  if (isLoading) {
    return (
      <div className="w-full min-w-0 max-w-full space-y-4 overflow-x-hidden sm:space-y-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Card key={i} className="w-full min-w-0 animate-pulse p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-muted" />
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 h-6 w-12 rounded-md bg-muted" />
                  <div className="h-3 w-24 rounded-md bg-muted" />
                </div>
              </div>
            </Card>
          ))}
        </div>
        <Card className="w-full min-w-0 animate-pulse p-4 sm:p-6">
          <div className="mb-4 h-5 w-1/3 rounded-md bg-muted" />
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="h-14 rounded-lg bg-muted" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (!stats && myResources.length === 0) {
    return (
      <Card className="w-full min-w-0 border border-border p-8 text-center sm:p-12">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <Share2 className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="mb-1 text-lg font-semibold">
          {t("emptyTitle")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("emptyDescription")}
        </p>
      </Card>
    );
  }

  const avgReuses =
    stats && stats.totalReuses > 0 && stats.approvedResources > 0
      ? (stats.totalReuses / stats.approvedResources).toFixed(1)
      : "0";

  return (
    <div className="w-full min-w-0 max-w-full space-y-4 overflow-x-hidden sm:space-y-6">
      {stats && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="w-full min-w-0 overflow-hidden border border-border p-4 sm:p-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-500/10 dark:bg-blue-500/20">
                <Share2 className="h-5 w-5 text-blue-500" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-foreground">
                  {stats.totalResourcesShared}
                </p>
                <p className="break-words text-xs text-muted-foreground">
                  {t("stats.shared")}
                </p>
              </div>
            </div>
          </Card>

          <Card className="w-full min-w-0 overflow-hidden border border-border p-4 sm:p-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-foreground">
                  {stats.totalReuses}
                </p>
                <p className="break-words text-xs text-muted-foreground">
                  {t("stats.totalReuses")}
                </p>
              </div>
            </div>
          </Card>

          <Card className="w-full min-w-0 overflow-hidden border border-border p-4 sm:p-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/10 dark:bg-amber-500/20">
                <Star className="h-5 w-5 text-amber-500" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-foreground">
                  {stats.approvedResources}
                </p>
                <p className="break-words text-xs text-muted-foreground">
                  {t("stats.approved")}
                </p>
              </div>
            </div>
          </Card>

          <Card className="w-full min-w-0 overflow-hidden border border-border p-4 sm:p-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-purple-500/10 dark:bg-purple-500/20">
                <BarChart3 className="h-5 w-5 text-purple-500" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-foreground">
                  {avgReuses}
                </p>
                <p className="break-words text-xs text-muted-foreground">
                  {t("stats.avgReuses")}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {pendingResources.length > 0 && (
        <Card className="w-full min-w-0 overflow-hidden border border-border p-4 sm:p-6">
          <h3 className="mb-4 flex min-w-0 items-center gap-2 text-base font-semibold">
            <Clock className="h-4 w-4 flex-shrink-0 text-amber-500" />
            <span className="break-words">{t("pendingHeading")}</span>
          </h3>
          <div className="space-y-2">
            {pendingResources.map((resource) => (
              <div
                key={resource.id}
                className="w-full min-w-0 rounded-lg border border-border p-3 transition-colors hover:bg-muted/40"
              >
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <h4 className="line-clamp-2 break-words text-sm font-medium text-foreground">
                      {resource.title}
                    </h4>
                    <p className="mt-0.5 break-words text-xs text-muted-foreground">
                      {resource.grade} · {translateSubject(resource.subject)}
                    </p>
                  </div>
                  <Badge className="max-w-full self-start whitespace-normal break-words border border-amber-200 bg-amber-100 px-2 py-0.5 text-left text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-300 sm:self-auto sm:text-center">
                    {t("status.pending")}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {stats && stats.topResources.length > 0 && (
        <Card className="w-full min-w-0 overflow-hidden border border-border p-4 sm:p-6">
          <h3 className="mb-4 flex min-w-0 items-center gap-2 text-base font-semibold">
            <Star className="h-4 w-4 flex-shrink-0 text-amber-500" />
            <span className="break-words">{t("topResourcesHeading")}</span>
          </h3>
          <div className="space-y-2">
            {stats.topResources.map((resource, index) => (
              <div
                key={resource.resourceId}
                className="w-full min-w-0 rounded-lg border border-border p-3 transition-colors hover:bg-muted/40"
              >
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {index + 1}
                    </div>
                    <h4 className="line-clamp-2 break-words text-sm font-medium text-foreground">
                      {resource.title}
                    </h4>
                  </div>
                  <div className="self-start text-left sm:ml-3 sm:self-auto sm:text-right">
                    <p className="text-base font-bold text-primary">
                      {resource.reuseCount}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("reuseCountLabel")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {approvedResources.length > 0 &&
        stats &&
        stats.topResources.length === 0 && (
          <Card className="w-full min-w-0 overflow-hidden border border-border p-4 sm:p-6">
            <h3 className="mb-4 flex min-w-0 items-center gap-2 text-base font-semibold">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500" />
              <span className="break-words">{t("publishedHeading")}</span>
            </h3>
            <div className="space-y-2">
              {approvedResources.map((resource) => (
                <div
                  key={resource.id}
                  className="w-full min-w-0 rounded-lg border border-border p-3 transition-colors hover:bg-muted/40"
                >
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <h4 className="line-clamp-2 break-words text-sm font-medium text-foreground">
                        {resource.title}
                      </h4>
                      <p className="mt-0.5 break-words text-xs text-muted-foreground">
                        {resource.grade} · {translateSubject(resource.subject)}
                      </p>
                    </div>
                    <div className="self-start text-left sm:ml-3 sm:self-auto sm:text-right">
                      <p className="text-base font-bold text-primary">
                        {resource.reuseCount}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("reuseCountLabel")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

      {attentionResources.length > 0 && (
        <Card className="w-full min-w-0 overflow-hidden border border-border p-4 sm:p-6">
          <h3 className="mb-4 flex min-w-0 items-center gap-2 text-base font-semibold text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="break-words">{t("attentionHeading")}</span>
          </h3>
          <div className="space-y-3">
            {attentionResources.map((resource) => {
              const status = resource.status as ResourceStatus;
              const cfg = STATUS_CONFIG[status];
              const statusLabel = t(`status.${STATUS_LABEL_KEY[status]}`);
              return (
                <div
                  key={resource.id}
                  className={cn(
                    "w-full min-w-0 rounded-lg border p-4",
                    cfg.cardClass,
                  )}
                >
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-2">
                      <div className="mt-0.5 flex-shrink-0">{cfg.icon}</div>
                      <div className="min-w-0">
                        <h4 className="line-clamp-2 break-words text-sm font-medium text-foreground">
                          {resource.title}
                        </h4>
                        <p className="mt-0.5 break-words text-xs text-muted-foreground">
                          {resource.grade} · {translateSubject(resource.subject)}
                        </p>
                      </div>
                    </div>
                    <Badge
                      className={cn(
                        "max-w-full self-start whitespace-normal break-words border px-2 py-0.5 text-left text-xs sm:self-auto sm:text-center",
                        cfg.badgeClass,
                      )}
                    >
                      {statusLabel}
                    </Badge>
                  </div>
                  {resource.moderationNotes && (
                    <div className="mt-3 rounded-md border border-border bg-background/60 p-3">
                      <p className="mb-1 text-xs font-medium text-muted-foreground">
                        {t("moderatorFeedback")}
                      </p>
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                        {resource.moderationNotes}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {stats && stats.totalReuses > 0 && (
        <Card className="w-full min-w-0 overflow-hidden border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800 dark:bg-amber-900/10 sm:p-6">
          <div className="text-center">
            <Star className="mx-auto mb-3 h-10 w-10 text-amber-500" />
            <h3 className="mb-1 text-lg font-semibold text-amber-900 dark:text-amber-200">
              {t("impactTitle")}
            </h3>
            <p className="mb-1 break-words text-sm text-amber-800 dark:text-amber-300">
              {t.rich("impactDescription", {
                count: stats.totalReuses,
                b: (chunks) => <strong>{chunks}</strong>,
              })}
            </p>
            <p className="break-words text-xs text-amber-700 dark:text-amber-400">
              {t("impactSubtitle")}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
