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
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import {
  getLibraryStats,
  type DiscoverResourcesParams,
  type ShareResourceRequest,
} from "@/services/api/community.service";
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
  type CommunityFilters as CommunityFiltersType,
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

  const resources = useAppSelector(selectResources);
  const pagination = useAppSelector(selectPagination);
  const filters = useAppSelector(selectFilters);
  const isLoading = useAppSelector(selectIsLoadingResources);
  const isReusing = useAppSelector(selectIsReusing);
  const reusedResourceIds = useAppSelector(selectReusedResourceIds) as string[];

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [totalLibraryCount, setTotalLibraryCount] = useState<number | null>(null);

  useEffect(() => {
    dispatch(fetchResources({}));
    dispatch(fetchReusedResourceIds());
    getLibraryStats()
      .then((stats) => setTotalLibraryCount(stats.totalApprovedResources))
      .catch(() => {
        // stats are non-critical
      });
  }, [dispatch]);

  const handleFiltersChange = (newFilters: DiscoverResourcesParams) => {
    dispatch(setFilters(newFilters as CommunityFiltersType));
    dispatch(
      fetchResources({
        ...newFilters,
        page: 0,
      }),
    );
  };

  const handleSearch = () => {
    dispatch(
      fetchResources({
        ...filters,
        page: 0,
      }),
    );
  };

  const handlePageChange = (page: number) => {
    dispatch(fetchResources({ ...filters, page }));
  };

  const handleReuse = async (resourceId: string) => {
    try {
      await dispatch(reuseSharedResource({ resourceId })).unwrap();
      toast.success("Adicionado aos seus documentos com sucesso");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao reutilizar recurso",
      );
    }
  };

  const handlePreview = (_resourceId: string) => {
    toast.info("Pre-visualizacao em breve disponivel");
  };

  const handleShareResource = async (request: ShareResourceRequest) => {
    try {
      await dispatch(submitResource(request)).unwrap();
      setIsShareModalOpen(false);
      toast.success(
        "Recurso submetido para revisao! Recebera notificacao em 24-48h.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao partilhar recurso",
      );
    }
  };

  const headerActions = (
    <>
      <Button
        onClick={() => router.push("/community/dashboard")}
        variant="outline"
        size="sm"
        className="w-full sm:w-auto"
      >
        <BarChart3 className="mr-2 h-4 w-4" />
        Meu Painel
      </Button>
      <Button
        onClick={() => router.push("/lesson-plan")}
        size="sm"
        className="w-full sm:w-auto"
      >
        <Plus className="mr-2 h-4 w-4" />
        Criar Novo
      </Button>
    </>
  );

  return (
    <PageContainer size="7xl" contentClassName="py-1 sm:py-2">
      <div className="space-y-5 sm:space-y-6">
        <PageHeader
          title="Biblioteca Comunitaria"
          description="Descubra e partilhe recursos educacionais criados por professores portugueses"
          icon={<Users className="h-6 w-6 text-primary" />}
          actions={headerActions}
        />

        <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center lg:gap-x-5 lg:gap-y-1">
          <span>
            <span className="font-medium text-foreground">
              {totalLibraryCount !== null ? totalLibraryCount : "--"}
            </span>{" "}
            recursos aprovados
          </span>
          <span>Comunidade de professores portugueses</span>
          <span>Recursos alinhados com as AEs</span>
        </div>

        <CommunityFiltersComponent
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onSearch={handleSearch}
          isLoading={isLoading}
        />

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

        <ShareResourceModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          onSubmit={handleShareResource}
          isLoading={false}
        />
      </div>
    </PageContainer>
  );
}

export default function CommunityPage() {
  const isPro = useAppSelector(selectIsPro);
  const dispatch = useAppDispatch();

  if (!isPro) {
    return (
      <CommunityUpgradePrompt
        onUpgrade={() => dispatch(setUpgradeModalOpen(true))}
      />
    );
  }

  return <CommunityLibraryPage />;
}
