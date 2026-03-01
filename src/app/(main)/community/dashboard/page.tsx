/**
 * Contributor Dashboard Page
 * Ricardo's personal impact and analytics dashboard
 */

"use client";

import { ContributorDashboard } from "@/components/community";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ContributorDashboardPage() {
  return (
    <div className="w-full min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/community">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar à Biblioteca
              </Button>
            </Link>
            <div>
              <h1 className="text-4xl font-bold text-primary">
                Painel do Contribuidor
              </h1>
              <p className="text-lg text-muted-foreground mt-2">
                Acompanhe o impacto dos seus recursos na comunidade
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard */}
        <ContributorDashboard />
      </div>
    </div>
  );
}