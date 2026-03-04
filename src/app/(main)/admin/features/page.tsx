"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useAdmin } from "@/hooks/useAdmin";
import apiClient from "@/services/api/client";
import { AlertCircle, ArrowLeft, ChevronDown, ChevronUp, Loader2, ToggleLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type FeatureOverride = {
  id: string;
  enabled: boolean;
  userId?: string;
  role?: string;
  plan?: string;
  createdAt: string;
};

type FeatureFlag = {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  createdAt: string;
  updatedAt: string;
  overrides?: FeatureOverride[];
};

function OverrideRow({ override }: { override: FeatureOverride }) {
  const label = override.userId
    ? `User: ${override.userId}`
    : override.role
    ? `Role: ${override.role}`
    : override.plan
    ? `Plan: ${override.plan}`
    : "Unknown";

  return (
    <div className="flex items-center justify-between text-sm bg-muted/40 rounded-lg px-3 py-2">
      <span className="text-muted-foreground font-mono text-xs">{label}</span>
      <Badge variant={override.enabled ? "default" : "secondary"}>
        {override.enabled ? "ON" : "OFF"}
      </Badge>
    </div>
  );
}

function FlagCard({ flag, onToggle }: { flag: FeatureFlag; onToggle: (key: string, newValue: boolean) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = async (checked: boolean) => {
    setIsUpdating(true);
    try {
      await apiClient.patch(`/admin/features/${flag.key}`, { enabled: checked });
      onToggle(flag.key, checked);
      toast.success(`Feature '${flag.name}' ${checked ? "ativada" : "desativada"}`);
    } catch {
      toast.error(`Erro ao atualizar feature '${flag.name}'`);
    } finally {
      setIsUpdating(false);
    }
  };

  const overrideCount = flag.overrides?.length ?? 0;

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base">{flag.name}</CardTitle>
            <p className="text-xs font-mono text-muted-foreground mt-0.5">{flag.key}</p>
            {flag.description && (
              <p className="text-sm text-muted-foreground mt-1">{flag.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Switch
                id={`flag-${flag.key}`}
                checked={flag.enabled}
                onCheckedChange={handleToggle}
              />
            )}
            <Badge variant={flag.enabled ? "default" : "secondary"}>
              {flag.enabled ? "ON" : "OFF"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-2">
        {flag.rolloutPercentage > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Rollout:</span>
            <Badge variant="outline">{flag.rolloutPercentage}%</Badge>
          </div>
        )}

        {overrideCount > 0 && (
          <div>
            <button
              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {overrideCount} override{overrideCount !== 1 ? "s" : ""}
            </button>
            {expanded && (
              <div className="mt-2 space-y-1.5">
                {flag.overrides!.map((o) => (
                  <OverrideRow key={o.id} override={o} />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminFeaturesPage() {
  const { isAdmin, isLoaded } = useAdmin();
  const router = useRouter();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && !isAdmin) {
      router.push("/dashboard");
    }
  }, [isLoaded, isAdmin, router]);

  const loadFlags = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes,..._] = await Promise.all([
        apiClient.get<FeatureFlag[]>("/admin/features"),
      ]);
      const flagsData = listRes.data;
      // Fetch overrides for each flag
      const withOverrides = await Promise.all(
        flagsData.map(async (flag) => {
          try {
            const res = await apiClient.get<FeatureFlag>(`/admin/features/${flag.key}`);
            return res.data;
          } catch {
            return flag; // no overrides or error — use base flag data
          }
        })
      );
      setFlags(withOverrides);
    } catch {
      setError("Não foi possível carregar as feature flags.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadFlags();
    }
  }, [isAdmin, loadFlags]);

  const handleToggle = useCallback((key: string, newValue: boolean) => {
    setFlags((prev) =>
      prev.map((f) => (f.key === key ? { ...f, enabled: newValue } : f))
    );
  }, []);

  if (!isLoaded || !isAdmin) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-8">
      <div className="flex items-center gap-3 mb-8">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={() => router.push("/admin")}
        >
          <ArrowLeft className="h-4 w-4" />
          Admin
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <ToggleLeft className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Feature Flags</h1>
          <p className="text-muted-foreground text-sm">
            Controla a disponibilidade de features por utilizador, role ou plano.
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-destructive bg-destructive/10 rounded-lg p-4 mb-6">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && flags.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          Nenhuma feature flag configurada.
        </div>
      )}

      {!loading && (
        <div className="space-y-4">
          {flags.map((flag) => (
            <FlagCard key={flag.key} flag={flag} onToggle={handleToggle} />
          ))}
        </div>
      )}
    </div>
  );
}
