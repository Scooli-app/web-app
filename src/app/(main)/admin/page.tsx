"use client";

import StatusCard from "@/components/admin/StatusCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdmin } from "@/hooks/useAdmin";
import { LayoutDashboard, Library, MessageSquare, Shield, ToggleLeft, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

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
        title="Admin Console"
        description="Manage the Scooli platform and users."
        icon={
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 sm:h-12 sm:w-12">
            <Shield className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="text-sm font-medium uppercase tracking-wider">Total Users</span>
          </div>
          <p className="text-3xl font-bold">1,284</p>
          <p className="mt-1 text-xs font-medium text-emerald-500">+12% this week</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-2 text-muted-foreground">
            <LayoutDashboard className="h-4 w-4" />
            <span className="text-sm font-medium uppercase tracking-wider">Active Sessions</span>
          </div>
          <p className="text-3xl font-bold">86</p>
          <p className="mt-1 text-xs text-muted-foreground">Live tracking enabled</p>
        </div>

        <StatusCard />
      </div>

      <div className="mt-8 sm:mt-10">
        <h2 className="mb-4 text-xl font-bold sm:mb-6 sm:text-2xl">Management</h2>
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card
            className="group cursor-pointer border-border transition-colors hover:bg-muted/50"
            onClick={() => router.push("/admin/feedback")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 transition-colors group-hover:text-primary">
                <MessageSquare className="h-5 w-5" />
                Feedback
              </CardTitle>
              <CardDescription>
                Manage user feedback, bug reports, and suggestions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                View submitted tickets, update status, and respond to users.
              </div>
            </CardContent>
          </Card>

          <Card
            className="group cursor-pointer border-border transition-colors hover:bg-muted/50"
            onClick={() => router.push("/admin/moderation")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 transition-colors group-hover:text-primary">
                <Library className="h-5 w-5" />
                Community Moderation
              </CardTitle>
              <CardDescription>
                Review and approve community-shared resources.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Manage curriculum-aligned teaching resources before publication.
              </div>
            </CardContent>
          </Card>

          <Card
            className="group cursor-pointer border-border transition-colors hover:bg-muted/50"
            onClick={() => router.push("/admin/features")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 transition-colors group-hover:text-primary">
                <ToggleLeft className="h-5 w-5" />
                Feature Flags
              </CardTitle>
              <CardDescription>
                Control feature availability across users and plans.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Toggle features globally, by rollout %, or with per-user/role overrides.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
