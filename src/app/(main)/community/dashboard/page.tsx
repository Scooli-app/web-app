/**
 * Contributor Dashboard Page
 * Ricardo's personal impact and analytics dashboard
 */

"use client";

import { ContributorDashboard } from "@/components/community";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export default function ContributorDashboardPage() {
  const t = useTranslations("community.dashboardPage");
  return (
    <PageContainer
      size="7xl"
      className="min-w-0 overflow-x-hidden"
      contentClassName="min-w-0 py-3 sm:py-6"
    >
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Link href="/community" className="w-full sm:w-auto">
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("backToLibrary")}
            </Button>
          </Link>
        }
      />

      <ContributorDashboard />
    </PageContainer>
  );
}
