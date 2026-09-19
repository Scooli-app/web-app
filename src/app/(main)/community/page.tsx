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
  type LibraryScope,
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
import {
  selectHasAccessibleOrganization,
  selectWorkspaceContext,
} from "@/store/workspace/selectors";
import { BarChart3, Plus, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import posthog from "posthog-js";

function CommunityLibraryPage() {
  const t = useTranslations("community.page");
  const dispatch = useAppDispatch();
  const router = useRouter();

  const resources = useAppSelector(selectResources);
  const pagination = useAppSelector(selectPagination);
  const filters = useAppSelector(selectFilters);
  const isLoading = useAppSelector(selectIsLoadingResources);
  const isReusing = useAppSelector(selectIsReusing);
  const reusedResourceIds = useAppSelector(selectReusedResourceIds) as string[];
  const workspace = useAppSelector(selectWorkspaceContext);
  const hasAccessibleOrganization = useAppSelector(selectHasAccessibleOrganization);
  const activeScope = (filters.scope ?? "community") as LibraryScope;

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [totalLibraryCount, setTotalLibraryCount] = useState<number | null>(null);

  useEffect(() => {
    dispatch(fetchResources({ scope: activeScope }));
    dispatch(fetchReusedResourceIds());
    getLibraryStats(activeScope)
      .then((stats) => setTotalLibraryCount(stats.totalApprovedResources))
      .catch(() => {
        // stats are non-critical
      });
  }, [activeScope, dispatch]);

  const handleScopeChange = (scope: LibraryScope) => {
    dispatch(setFilters({ scope }));
    dispatch(fetchResources({ scope, page: 0 }));
    getLibraryStats(scope)
      .then((stats) => setTotalLibraryCount(stats.totalApprovedResources))
      .catch(() => undefined);
  };

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
      posthog.capture("community_resource_reused", { resource_id: resourceId });
      toast.success(t("reuseSuccess"));
    } catch (error) {
      posthog.captureException(error);
      toast.error(
        error instanceof Error ? error.message : t("reuseError"),
      );
    }
  };

  const handlePreview = (_resourceId: string) => {
    toast.info(t("previewComingSoon"));
  };

  const handleShareResource = async (request: ShareResourceRequest) => {
    try {
      await dispatch(submitResource({ ...request, libraryScope: activeScope })).unwrap();
      setIsShareModalOpen(false);
      toast.success(
        activeScope === "organization"
          ? t("shareOrgSuccess")
          : t("shareCommunitySuccess"),
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("shareError"),
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
        {t("myDashboard")}
      </Button>
      <Button
        onClick={() => setIsShareModalOpen(true)}
        variant="outline"
        size="sm"
        className="w-full sm:w-auto"
      >
        <Users className="mr-2 h-4 w-4" />
        {t("share")}
      </Button>
      <Button
        onClick={() => router.push("/lesson-plan")}
        size="sm"
        className="w-full sm:w-auto"
      >
        <Plus className="mr-2 h-4 w-4" />
        {t("createNew")}
      </Button>
    </>
  );

  return (
    <PageContainer size="7xl" contentClassName="py-1 sm:py-2">
      <div className="space-y-5 sm:space-y-6">
        <PageHeader
          title={t("title")}
          description={t("description")}
          icon={<Users className="h-6 w-6 text-primary" />}
          actions={headerActions}
        />

        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeScope === "community" ? "default" : "outline"}
            size="sm"
            onClick={() => handleScopeChange("community")}
          >
            {t("generalLibrary")}
          </Button>
          {hasAccessibleOrganization ? (
            <Button
              variant={activeScope === "organization" ? "default" : "outline"}
              size="sm"
              onClick={() => handleScopeChange("organization")}
            >
              {workspace?.organization?.name ?? t("schoolLibraryFallback")}
            </Button>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center lg:gap-x-5 lg:gap-y-1">
          <span>
            <span className="font-medium text-foreground">
              {totalLibraryCount !== null ? totalLibraryCount : "--"}
            </span>{" "}
            {t("resourcesAvailable")}
          </span>
          <span>
            {activeScope === "organization"
              ? t("internalShares", { org: workspace?.organization?.name ?? t("schoolFallback") })
              : t("teacherCommunity")}
          </span>
          <span>{t("alignedResources")}</span>
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
          libraryScope={activeScope}
          allowOrganizationScope={hasAccessibleOrganization}
          organizationName={workspace?.organization?.name ?? null}
        />
      </div>
    </PageContainer>
  );
}

export default function CommunityPage() {
  const isPro = useAppSelector(selectIsPro);
  const dispatch = useAppDispatch();
  const hasAccessibleOrganization = useAppSelector(selectHasAccessibleOrganization);

  if (!isPro && !hasAccessibleOrganization) {
    return (
      <CommunityUpgradePrompt
        onUpgrade={() => dispatch(setUpgradeModalOpen(true))}
      />
    );
  }

  return <CommunityLibraryPage />;
}

