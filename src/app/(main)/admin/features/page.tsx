"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useAdmin } from "@/hooks/useAdmin";
import apiClient from "@/services/api/client";
import { FeatureFlag as FeatureFlagKey } from "@/shared/types/featureFlags";
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

const FEATURE_FLAG_METADATA: Record<string, { name: string; description: string; order: number }> = {
  [FeatureFlagKey.COMMUNITY_LIBRARY]: {
    name: "Biblioteca Comunitaria",
    description: "Ativa a partilha e descoberta de recursos na biblioteca da comunidade.",
    order: 10,
  },
  [FeatureFlagKey.DOCUMENT_REVIEW]: {
    name: "Revisao de Documentos",
    description:
      "Quando ativa, recursos partilhados aguardam moderacao de admin antes de publicacao.",
    order: 20,
  },
  [FeatureFlagKey.PRESENTATION_CREATION]: {
    name: "Criacao de Apresentacoes",
    description:
      "Controla se os utilizadores podem criar apresentacoes a partir da plataforma.",
    order: 30,
  },
  [FeatureFlagKey.WORKSHEET_CREATION]: {
    name: "Criacao de Fichas de Trabalho",
    description:
      "Controla se os utilizadores podem criar fichas de trabalho a partir da plataforma.",
    order: 35,
  },
  [FeatureFlagKey.TEMPLATE_FROM_DOCUMENT]: {
    name: "Modelo a partir de Documento",
    description:
      "Controla se os utilizadores podem fazer upload de um documento e convertê-lo num modelo personalizado.",
    order: 37,
  },
  [FeatureFlagKey.DOCUMENT_IMAGES]: {
    name: "Imagens em Documentos",
    description:
      "Controla a geracao e inclusao de imagens automaticas em testes, quizzes, fichas e planos de aula.",
    order: 40,
  },
};

const applyFlagMetadata = (flag: FeatureFlag): FeatureFlag => {
  const metadata = FEATURE_FLAG_METADATA[flag.key];
  if (!metadata) {
    return flag;
  }

  return {
    ...flag,
    name: metadata.name,
    description: metadata.description,
  };
};

const compareFlagOrder = (a: FeatureFlag, b: FeatureFlag): number => {
  const orderA = FEATURE_FLAG_METADATA[a.key]?.order ?? Number.MAX_SAFE_INTEGER;
  const orderB = FEATURE_FLAG_METADATA[b.key]?.order ?? Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) {
    return orderA - orderB;
  }

  return a.name.localeCompare(b.name, "pt-PT");
};

function OverrideRow({ override }: { override: FeatureOverride }) {
  const label = override.userId
    ? `Utilizador: ${override.userId}`
    : override.role
      ? `Perfil: ${override.role}`
      : override.plan
        ? `Plano: ${override.plan}`
        : "Desconhecido";

  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
      <span className="font-mono text-xs text-muted-foreground">{label}</span>
      <Badge variant={override.enabled ? "default" : "secondary"}>
        {override.enabled ? "Ativo" : "Inativo"}
      </Badge>
    </div>
  );
}

function FlagCard({
  flag,
  onToggle,
}: {
  flag: FeatureFlag;
  onToggle: (key: string, newValue: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = async (checked: boolean) => {
    setIsUpdating(true);
    try {
      await apiClient.patch(`/admin/features/${flag.key}`, { enabled: checked });
      onToggle(flag.key, checked);
      toast.success(`Funcionalidade '${flag.name}' ${checked ? "ativada" : "desativada"}`);
    } catch {
      toast.error(`Erro ao atualizar a funcionalidade '${flag.name}'`);
    } finally {
      setIsUpdating(false);
    }
  };

  const overrideCount = flag.overrides?.length ?? 0;

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base">{flag.name}</CardTitle>
            <p className="mt-0.5 text-xs font-mono text-muted-foreground">{flag.key}</p>
            {flag.description && (
              <p className="mt-1 text-sm text-muted-foreground">{flag.description}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
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
              {flag.enabled ? "Ativo" : "Inativo"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 pt-0">
        {flag.rolloutPercentage > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Distribuição:</span>
            <Badge variant="outline">{flag.rolloutPercentage}%</Badge>
          </div>
        )}

        {overrideCount > 0 && (
          <div>
            <button
              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              {overrideCount} {overrideCount === 1 ? "exceção" : "exceções"}
            </button>
            {expanded && (
              <div className="mt-2 space-y-1.5">
                {flag.overrides?.map((o) => (
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
      const [listRes] = await Promise.all([apiClient.get<FeatureFlag[]>("/admin/features")]);
      const flagsData = listRes.data;
      const withOverrides = await Promise.all(
        flagsData.map(async (flag) => {
          try {
            const res = await apiClient.get<FeatureFlag>(`/admin/features/${flag.key}`);
            return res.data;
          } catch {
            return flag;
          }
        }),
      );
      setFlags(withOverrides.map(applyFlagMetadata).sort(compareFlagOrder));
    } catch {
      setError("Não foi possível carregar as configurações de funcionalidades.");
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
    setFlags((prev) => prev.map((f) => (f.key === key ? { ...f, enabled: newValue } : f)));
  }, []);

  if (!isLoaded || !isAdmin) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <PageContainer size="lg" contentClassName="py-4 sm:py-8">
      <PageHeader
        title="Controlo de Funcionalidades"
        description="Controla a disponibilidade de funcionalidades por utilizador, perfil ou plano."
        icon={
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 sm:h-12 sm:w-12">
            <ToggleLeft className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
          </div>
        }
        actions={
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => router.push("/admin")}
          >
            <ArrowLeft className="h-4 w-4" />
            Administração
          </Button>
        }
      />

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-destructive/10 p-4 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && flags.length === 0 && (
        <div className="py-16 text-center text-muted-foreground">
          Nenhuma funcionalidade configurada.
        </div>
      )}

      {!loading && (
        <div className="space-y-4">
          {flags.map((flag) => (
            <FlagCard key={flag.key} flag={flag} onToggle={handleToggle} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
