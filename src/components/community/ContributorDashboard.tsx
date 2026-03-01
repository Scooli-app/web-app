/**
 * Contributor Dashboard Component
 * Ricardo's recognition dashboard showing impact metrics
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { fetchContributorStats, selectContributorStats, selectIsLoadingStats } from "@/store/community";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { BarChart3, Share2, Star, TrendingUp } from "lucide-react";
import { useEffect } from "react";

export function ContributorDashboard() {
  const dispatch = useAppDispatch();
  const stats = useAppSelector(selectContributorStats);
  const isLoading = useAppSelector(selectIsLoadingStats);

  useEffect(() => {
    dispatch(fetchContributorStats());
  }, [dispatch]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-6 bg-muted rounded w-1/3 mb-4" />
            <div className="h-12 bg-muted rounded" />
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <Card className="p-6 text-center">
        <Share2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Ainda não partilhou recursos</h3>
        <p className="text-sm text-muted-foreground">
          Comece a partilhar os seus recursos educacionais para ver as estatísticas aqui.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Share2 className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{stats.totalResourcesShared}</p>
              <p className="text-sm text-muted-foreground">Recursos Partilhados</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{stats.totalReuses}</p>
              <p className="text-sm text-muted-foreground">Total de Reutilizações</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Star className="w-8 h-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{stats.approvedResources}</p>
              <p className="text-sm text-muted-foreground">Aprovados</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">
                {stats.totalReuses > 0 ? (stats.totalReuses / stats.approvedResources).toFixed(1) : "0"}
              </p>
              <p className="text-sm text-muted-foreground">Média Reutilizações</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Top Resources */}
      {stats.topResources.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            Os Seus Recursos Mais Populares
          </h3>
          <div className="space-y-3">
            {stats.topResources.map((resource, index) => (
              <div
                key={resource.resourceId}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-medium">{resource.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge 
                        variant={resource.status === "APPROVED" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {resource.status === "APPROVED" ? "Aprovado" : "Pendente"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">{resource.reuseCount}</p>
                  <p className="text-xs text-muted-foreground">reutilizações</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recognition Section */}
      {stats.totalReuses > 0 && (
        <Card className="p-6 bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
          <div className="text-center">
            <Star className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-amber-800 mb-2">
              Impacto na Comunidade
            </h3>
            <p className="text-amber-700 mb-4">
              Os seus recursos já ajudaram <strong>{stats.totalReuses}</strong> professores!
            </p>
            <p className="text-sm text-amber-600">
              Continue a partilhar para ampliar o seu impacto na educação portuguesa.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}