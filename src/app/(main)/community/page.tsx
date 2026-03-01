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
import type { DiscoverResourcesParams, ShareResourceRequest } from "@/services/api/community.service";
import {
  fetchResources,
  reuseSharedResource,
  selectFilters,
  selectIsLoadingResources,
  selectIsReusing,
  selectPagination,
  selectResources,
  setFilters,
  submitResource,
  type CommunityFilters as CommunityFiltersType,
} from "@/store/community";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
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

  // Local state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Load initial resources
  useEffect(() => {
    dispatch(fetchResources({}));
  }, [dispatch]);

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================

  const handleFiltersChange = (newFilters: DiscoverResourcesParams) => {
    dispatch(setFilters(newFilters as CommunityFiltersType));
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
      const result = await dispatch(reuseSharedResource({ resourceId })).unwrap();
      
      // Navigate to editor with the reused content
      // TODO: Integrate with existing editor routing
      toast.success(`Recurso reutilizado! Reuso #${result.reuseCount}`);
      
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao reutilizar recurso");
    }
  };

  const handlePreview = (resourceId: string) => {
    router.push(`/community/resource/${resourceId}/preview`);
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
    <div className="w-full min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-primary flex items-center gap-3">
                <Users className="w-8 h-8" />
                Biblioteca Comunitária
              </h1>
              <p className="text-lg text-muted-foreground mt-2">
                Descubra e partilhe recursos educacionais criados por professores portugueses
              </p>
            </div>

            <div className="flex gap-3">
              <Button onClick={() => router.push("/community/dashboard")} variant="outline">
                <BarChart3 className="w-4 h-4 mr-2" />
                Meu Painel
              </Button>
              <Button onClick={handleCreateNew} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Criar Novo Recurso
              </Button>
              <Button onClick={() => setIsShareModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Partilhar Recurso
              </Button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span>🎯 {pagination.totalCount} recursos aprovados</span>
            <span>👥 Comunidade de professores portugueses</span>
            <span>✅ Todos os recursos são revistos e alinhados com o currículo</span>
          </div>
        </div>

        <div className="mb-6">
          <CommunityFiltersComponent
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onSearch={handleSearch}
            isLoading={isLoading}
          />
        </div>

        {/* Resources Grid */}
        <ResourceGrid
          resources={resources}
          pagination={pagination}
          onReuse={handleReuse}
          onPreview={handlePreview}
          onPageChange={handlePageChange}
          isLoading={isLoading}
          isReusing={isReusing}
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
  // TODO: Check if user has Pro subscription
  const isPro = false; // Temporary - should check actual subscription

  const handleUpgrade = () => {
    // TODO: Integrate with existing upgrade modal/flow
  };

  if (!isPro) {
    return <CommunityUpgradePrompt onUpgrade={handleUpgrade} />;
  }

  return <CommunityLibraryPage />;
}