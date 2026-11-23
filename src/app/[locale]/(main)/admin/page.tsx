"use client";

import { ActivityPanel } from "@/components/admin/ActivityPanel";
import StatusCard from "@/components/admin/StatusCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useAdmin } from "@/hooks/useAdmin";
import { Activity, DollarSign, Gift, Library, MapPin, MessageSquare, Shield, ToggleLeft, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const SECTIONS = [
  { href: "/admin/users", label: "Utilizadores", icon: Users },
  { href: "/admin/onboarding", label: "Onboarding", icon: MapPin },
  { href: "/admin/feedback", label: "Opiniões", icon: MessageSquare },
  { href: "/admin/pilot", label: "Piloto", icon: Activity },
  { href: "/admin/costs", label: "Custos AI", icon: DollarSign },
  { href: "/admin/features", label: "Funcionalidades", icon: ToggleLeft },
  { href: "/admin/promos", label: "Ofertas", icon: Gift },
  { href: "/admin/moderation", label: "Moderação", icon: Library },
];

export default function AdminPage() {
  const { isAdmin, isLoaded } = useAdmin();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isAdmin) {
      router.push("/dashboard");
    }
  }, [isLoaded, isAdmin, router]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <PageContainer size="xl" contentClassName="py-4 sm:py-8">
      <PageHeader
        title="Consola de Administração"
        description="Atividade da plataforma e acesso às ferramentas de gestão."
        icon={
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 sm:h-12 sm:w-12">
            <Shield className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
          </div>
        }
      />

      <nav aria-label="Secções de administração" className="mb-6 flex flex-wrap gap-2">
        {SECTIONS.map(({ href, label, icon: Icon }) => (
          <Button key={href} variant="outline" size="sm" onClick={() => router.push(href)}>
            <Icon className="mr-2 h-4 w-4" />
            {label}
          </Button>
        ))}
      </nav>

      <div className="space-y-6">
        <ActivityPanel />
        <div className="max-w-md">
          <StatusCard />
        </div>
      </div>
    </PageContainer>
  );
}
