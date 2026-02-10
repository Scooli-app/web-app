"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdmin } from "@/hooks/useAdmin";
import { LayoutDashboard, Lock, MessageSquare, Shield, Users } from "lucide-react";
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
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="w-full max-w-5xl mx-auto p-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-foreground">Admin Console</h1>
          <p className="text-muted-foreground">Manage the Scooli platform and users.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Placeholder Stats */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium uppercase tracking-wider">Total Users</span>
          </div>
          <p className="text-3xl font-bold">1,284</p>
          <p className="text-xs text-emerald-500 font-medium mt-1">+12% this week</p>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-muted-foreground">
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-sm font-medium uppercase tracking-wider">Active Sessions</span>
          </div>
          <p className="text-3xl font-bold">86</p>
          <p className="text-xs text-muted-foreground mt-1">Live tracking enabled</p>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-muted-foreground">
            <Lock className="w-4 h-4" />
            <span className="text-sm font-medium uppercase tracking-wider">System Health</span>
          </div>
          <p className="text-3xl font-bold text-emerald-500">Optimal</p>
          <p className="text-xs text-muted-foreground mt-1">All services operational</p>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-2xl font-bold mb-6">Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card 
            className="hover:bg-muted/50 transition-colors cursor-pointer border-border group"
            onClick={() => router.push("/admin/feedback")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 group-hover:text-primary transition-colors">
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
        </div>
      </div>
    </div>
  );
}
