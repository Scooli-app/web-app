/**
 * Contributor Dashboard Component
 * Shows impact metrics and a full list of the contributor's submissions,
 * including rejected resources with moderator feedback.
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  fetchContributorStats,
  fetchMyResources,
  selectContributorStats,
  selectIsLoadingStats,
  selectMyResources,
} from "@/store/community";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
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
import { useEffect } from "react";

type ResourceStatus = "PENDING" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";

const STATUS_CONFIG: Record<
  ResourceStatus,
  { label: string; icon: React.ReactNode; badgeClass: string; cardClass: string }
> = {
  PENDING: {
    label: "Em revisão",
    icon: <Clock className="w-4 h-4 text-amber-500" />,
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    cardClass: "border-amber-200 dark:border-amber-800",
  },
  APPROVED: {
    label: "Publicado",
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
    badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    cardClass: "border-emerald-200 dark:border-emerald-800",
  },
  REJECTED: {
    label: "Recusado",
    icon: <XCircle className="w-4 h-4 text-red-500" />,
    badgeClass: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800",
    cardClass: "border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/10",
  },
  CHANGES_REQUESTED: {
    label: "Revisão pedida",
    icon: <MessageSquare className="w-4 h-4 text-orange-500" />,
    badgeClass: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800",
    cardClass: "border-orange-200 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-950/10",
  },
};

export function ContributorDashboard() {
  const dispatch = useAppDispatch();
  const stats = useAppSelector(selectContributorStats);
  const myResources = useAppSelector(selectMyResources);
  const isLoading = useAppSelector(selectIsLoadingStats);

  useEffect(() => {
    dispatch(fetchContributorStats());
    dispatch(fetchMyResources());
  }, [dispatch]);

  // Resources that need attention (rejected or changes requested)
  const attentionResources = myResources.filter(
    (r) => r.status === "REJECTED" || r.status === "CHANGES_REQUESTED"
  );
  const pendingResources = myResources.filter((r) => r.status === "PENDING");
  const approvedResources = myResources.filter((r) => r.status === "APPROVED");

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Card key={i} className="p-4 sm:p-5 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-xl flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-6 bg-muted rounded-md w-12 mb-1.5" />
                  <div className="h-3 bg-muted rounded-md w-24" />
                </div>
              </div>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse p-4 sm:p-6">
          <div className="h-5 bg-muted rounded-md w-1/3 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="h-14 bg-muted rounded-lg" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (!stats && myResources.length === 0) {
    return (
      <Card className="p-8 sm:p-12 text-center border border-border">
        <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Share2 className="w-7 h-7 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">Ainda não partilhou recursos</h3>
        <p className="text-sm text-muted-foreground">
          Comece a partilhar os seus recursos educacionais para ver as estatísticas aqui.
        </p>
      </Card>
    );
  }

  const avgReuses =
    stats && stats.totalReuses > 0 && stats.approvedResources > 0
      ? (stats.totalReuses / stats.approvedResources).toFixed(1)
      : "0";

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 sm:p-5 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Share2 className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalResourcesShared}</p>
                <p className="text-xs text-muted-foreground">Recursos Partilhados</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-5 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalReuses}</p>
                <p className="text-xs text-muted-foreground">Total de Reutilizações</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-5 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 dark:bg-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Star className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.approvedResources}</p>
                <p className="text-xs text-muted-foreground">Aprovados</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-5 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/10 dark:bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{avgReuses}</p>
                <p className="text-xs text-muted-foreground">Média Reutilizações</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Pending */}
      {pendingResources.length > 0 && (
        <Card className="p-4 sm:p-6 border border-border">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            Em Revisão
          </h3>
          <div className="space-y-2">
            {pendingResources.map((resource) => (
              <div
                key={resource.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors"
              >
                <div className="min-w-0">
                  <h4 className="font-medium text-sm text-foreground truncate">{resource.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {resource.grade} · {resource.subject}
                  </p>
                </div>
                <Badge className="text-xs px-2 py-0.5 border flex-shrink-0 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                  Em revisão
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Top Approved Resources */}
      {stats && stats.topResources.length > 0 && (
        <Card className="p-4 sm:p-6 border border-border">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            Os Seus Recursos Mais Populares
          </h3>
          <div className="space-y-2">
            {stats.topResources.map((resource, index) => (
              <div
                key={resource.resourceId}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-medium text-sm text-foreground truncate">{resource.title}</h4>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="text-base font-bold text-primary">{resource.reuseCount}</p>
                  <p className="text-xs text-muted-foreground">reutilizações</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Approved but no content yet */}
      {approvedResources.length > 0 && stats && stats.topResources.length === 0 && (
        <Card className="p-4 sm:p-6 border border-border">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Publicados
          </h3>
          <div className="space-y-2">
            {approvedResources.map((resource) => (
              <div
                key={resource.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors"
              >
                <div className="min-w-0">
                  <h4 className="font-medium text-sm text-foreground truncate">{resource.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {resource.grade} · {resource.subject}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="text-base font-bold text-primary">{resource.reuseCount}</p>
                  <p className="text-xs text-muted-foreground">reutilizações</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Attention Required: Rejected & Changes Requested */}
      {attentionResources.length > 0 && (
        <Card className="p-4 sm:p-6 border border-border">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            Requerem a sua atenção
          </h3>
          <div className="space-y-3">
            {attentionResources.map((resource) => {
              const cfg = STATUS_CONFIG[resource.status as ResourceStatus];
              return (
                <div
                  key={resource.id}
                  className={`p-4 rounded-lg border ${cfg.cardClass}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <div className="mt-0.5 flex-shrink-0">{cfg.icon}</div>
                      <div className="min-w-0">
                        <h4 className="font-medium text-sm text-foreground truncate">
                          {resource.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {resource.grade} · {resource.subject}
                        </p>
                      </div>
                    </div>
                    <Badge className={`text-xs px-2 py-0.5 border flex-shrink-0 ${cfg.badgeClass}`}>
                      {cfg.label}
                    </Badge>
                  </div>
                  {resource.moderationNotes && (
                    <div className="mt-3 p-3 rounded-md bg-background/60 border border-border">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Feedback do moderador:
                      </p>
                      <p className="text-sm text-foreground leading-relaxed">
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

      {/* Recognition */}
      {stats && stats.totalReuses > 0 && (
        <Card className="p-4 sm:p-6 border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
          <div className="text-center">
            <Star className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-200 mb-1">
              Impacto na Comunidade
            </h3>
            <p className="text-amber-800 dark:text-amber-300 text-sm mb-1">
              Os seus recursos já ajudaram <strong>{stats.totalReuses}</strong> professores!
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Continue a partilhar para ampliar o seu impacto na educação portuguesa.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}