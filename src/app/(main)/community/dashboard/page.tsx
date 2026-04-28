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
import Link from "next/link";

export default function ContributorDashboardPage() {
  return (
    <PageContainer
      size="7xl"
      className="min-w-0 overflow-x-hidden"
      contentClassName="min-w-0 py-3 sm:py-6"
    >
      <PageHeader
        title="Dashboard do Contribuidor"
        description="Acompanhe o impacto dos seus recursos na comunidade"
        actions={
          <Link href="/community" className="w-full sm:w-auto">
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar a Biblioteca
            </Button>
          </Link>
        }
      />

      <ContributorDashboard />
    </PageContainer>
  );
}
