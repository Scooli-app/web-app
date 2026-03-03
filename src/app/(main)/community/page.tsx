/**
 * Community Library Page
 * Main page for discovering and browsing shared teaching resources
 * Handles Pro vs Free user experience
 */

"use client";

import { CommunityFilters as CommunityFiltersComponent } from "@/components/community/CommunityFilters";
import { CommunityUpgradePrompt } from "@/components/community/CommunityUpgradePrompt";
import { ResourceGrid } from "@/components/community/ResourceGrid";
import { ShareResourceModal } from "@/components/community/ShareResourceModal";
import { Button } from "@/components/ui/button";
import { getLibraryStats, type DiscoverResourcesParams, type ShareResourceRequest } from "@/services/api/community.service";
import {
  fetchResources,
  fetchReusedResourceIds,
  reuseSharedResource,
  selectFilters,
  selectIsLoadingResources,
  selectIsReusing,
  selectPagination,
  selectResources,
  selectReusedResourceIds,
  setFilters,
  submitResource,
  type CommunityFilters as CommunityFiltersType
} from "@/store/community";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectIsPro } from "@/store/subscription/selectors";
import { setUpgradeModalOpen } from "@/store/ui/uiSlice";
import { BarChart3, Plus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function CommunityLibraryPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  
  // Redux state
  const resources = useAppSelector(selectResources);
  const pagination = useAppSelector(selectPagination);
  const filters = useAppSelector(selectFilters);
  const isLoading = useAppSelector(selectIsLoadingResources);
  const isReusing = useAppSelector(selectIsReusing);
  const reusedResourceIds = useAppSelector(selectReusedResourceIds) as string[];

  // Local state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [totalLibraryCount, setTotalLibraryCount] = useState<number | null>(null);

  // Load initial resources and library stats
  useEffect(() => {
    dispatch(fetchResources({}));
    dispatch(fetchReusedResourceIds());
    getLibraryStats()
      .then(stats => setTotalLibraryCount(stats.totalApprovedResources))
      .catch(() => { /* stats are non-critical, ignore */ });
  }, [dispatch]);

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================

  const handleFiltersChange = (newFilters: DiscoverResourcesParams) => {
    dispatch(setFilters(newFilters as CommunityFiltersType));
    // Auto-search when filters change
    dispatch(fetchResources({ 
      ...newFilters,
      page: 0 // Reset to first page on filter change
    }));
  };

  const handleSearch = () => {
    dispatch(fetchResources({ 
      ...filters,
      page: 0 // Reset to first page on new search
    }));
  };

  const handlePageChange = (page: number) => {
    dispatch(fetchResources({ ...filters, page }));
  };

  const handleReuse = async (resourceId: string) => {
    try {
      await dispatch(reuseSharedResource({ resourceId })).unwrap();
      
      toast.success("Adicionado aos seus documentos com sucesso");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao reutilizar recurso");
    }
  };

  const handlePreview = (_resourceId: string) => {
    // TODO: Implement preview modal
    toast.info("Pré-visualização em breve disponível");
  };

  const handleShareResource = async (request: ShareResourceRequest) => {
    try {
      await dispatch(submitResource(request)).unwrap();
      setIsShareModalOpen(false);
      toast.success("Recurso submetido para revisão! Receberá notificação em 24-48h.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao partilhar recurso");
    }
  };

  const handleCreateNew = () => {
    // Navigate to document creation
    router.push("/lesson-plan");
  };

  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" />
                Biblioteca Comunitária
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Descubra e partilhe recursos educacionais criados por professores portugueses
              </p>
            </div>

            <div className="flex gap-2 flex-shrink-0">
              <Button onClick={() => router.push("/community/dashboard")} variant="outline" size="sm">
                <BarChart3 className="w-4 h-4 mr-2" />
                Meu Painel
              </Button>
              <Button onClick={handleCreateNew} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Criar Novo
              </Button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span>🎯 <span className="font-medium text-foreground">{totalLibraryCount !== null ? totalLibraryCount : "—"}</span> recursos aprovados</span>
            <span>👥 Comunidade de professores portugueses</span>
            <span>✅ Recursos alinhados com as AEs</span>
          </div>
        </div>

        <CommunityFiltersComponent
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onSearch={handleSearch}
          isLoading={isLoading}
        />

        {/* Resources Grid */}
        <ResourceGrid
          resources={resources}
          pagination={pagination}
          onReuse={handleReuse}
          onPreview={handlePreview}
          onPageChange={handlePageChange}
          isLoading={isLoading}
          isReusing={isReusing}
          reusedResourceIds={reusedResourceIds}
        />

        {/* Share Resource Modal */}
        <ShareResourceModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          onSubmit={handleShareResource}
          isLoading={false} // TODO: Connect to sharing state
        />
      </div>
    </div>
  );
}

/**
 * Main Community Page Wrapper - handles Pro vs Free user experience
 */
export default function CommunityPage() {
  const isPro = useAppSelector(selectIsPro);
  const dispatch = useAppDispatch();

  const handleUpgrade = () => {
    dispatch(setUpgradeModalOpen(true));
  };

  if (!isPro) {
    return <CommunityUpgradePrompt onUpgrade={handleUpgrade} />;
  }

  return <CommunityLibraryPage />;
}