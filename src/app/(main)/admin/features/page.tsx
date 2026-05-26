"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAdmin } from "@/hooks/useAdmin";
import {
  type AdminFeatureFlag,
  type FeatureOverrideDto,
  type OrganizationSearchResult,
  type OverrideTargetType,
  type PlanOption,
  type UserSearchResult,
  getFlag,
  getOrganizationById,
  getUserById,
  listFlags,
  listPlans,
  removeOrganizationOverride,
  removePlanOverride,
  removeRoleOverride,
  removeUserOverride,
  searchOrganizations,
  searchUsers,
  setOrganizationOverride,
  setPlanOverride,
  setRoleOverride,
  setUserOverride,
  updateFlag as updateFlagApi,
} from "@/services/api/admin-features.service";
import { FeatureFlag as FeatureFlagKey } from "@/shared/types/featureFlags";
import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  ToggleLeft,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const FEATURE_FLAG_METADATA: Record<
  string,
  { name: string; description: string; order: number }
> = {
  [FeatureFlagKey.COMMUNITY_LIBRARY]: {
    name: "Biblioteca Comunitária",
    description:
      "Ativa a partilha e descoberta de recursos na biblioteca da comunidade.",
    order: 10,
  },
  [FeatureFlagKey.DOCUMENT_REVIEW]: {
    name: "Revisão de Documentos",
    description:
      "Quando ativa, recursos partilhados aguardam moderação de admin antes de publicação.",
    order: 20,
  },
  [FeatureFlagKey.PRESENTATION_CREATION]: {
    name: "Criação de Apresentações",
    description:
      "Controla se os utilizadores podem criar apresentações a partir da plataforma.",
    order: 30,
  },
  [FeatureFlagKey.WORKSHEET_CREATION]: {
    name: "Criação de Fichas de Trabalho",
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
      "Controla a geração e inclusão de imagens automáticas em testes, quizzes, fichas e planos de aula.",
    order: 40,
  },
  [FeatureFlagKey.CURRICULUM_PLAN_ENABLED]: {
    name: "Planificações",
    description:
      "Controla a criação e importação de planificações curriculares de período. Disponível nos planos Pro e Institucional.",
    order: 45,
  },
};

const applyFlagMetadata = (flag: AdminFeatureFlag): AdminFeatureFlag => {
  const metadata = FEATURE_FLAG_METADATA[flag.key];
  if (!metadata) return flag;
  return { ...flag, name: metadata.name, description: metadata.description };
};

const compareFlagOrder = (a: AdminFeatureFlag, b: AdminFeatureFlag): number => {
  const orderA = FEATURE_FLAG_METADATA[a.key]?.order ?? Number.MAX_SAFE_INTEGER;
  const orderB = FEATURE_FLAG_METADATA[b.key]?.order ?? Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) return orderA - orderB;
  return a.name.localeCompare(b.name, "pt-PT");
};

// =============================================================================
// OverrideRow
// =============================================================================

function OverrideRow({
  override,
  plans,
  onDelete,
}: {
  override: FeatureOverrideDto;
  plans: PlanOption[];
  onDelete: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  const [resolvedLabel, setResolvedLabel] = useState<string | null>(null);

  useEffect(() => {
    if (override.userId) {
      if (override.userName || override.userEmail) {
        const lbl =
          override.userName && override.userEmail
            ? `${override.userName} <${override.userEmail}>`
            : (override.userName ?? override.userEmail ?? override.userId);
        setResolvedLabel(lbl);
        return;
      }
      void getUserById(override.userId).then((u) => {
        if (!u) return;
        setResolvedLabel(u.name ? `${u.name} <${u.email}>` : u.email);
      });
    } else if (override.organizationId) {
      if (override.organizationName) {
        setResolvedLabel(`${override.organizationName}`);
        return;
      }
      void getOrganizationById(override.organizationId).then((o) => {
        if (!o) return;
        setResolvedLabel(`${o.name}`);
      });
    }
  }, [override]);

  const { label, prefix } = useMemo(() => {
    if (override.userId) {
      return { prefix: "Utilizador", label: resolvedLabel ?? override.userId };
    }
    if (override.organizationId) {
      return {
        prefix: "Organização",
        label: resolvedLabel ?? override.organizationId,
      };
    }
    if (override.role) {
      return { prefix: "Perfil", label: `${override.role}` };
    }
    if (override.plan) {
      const planName = plans.find((p) => p.planCode === override.plan)?.name;
      return {
        prefix: "Plano",
        label: planName ? `${planName}` : override.plan,
      };
    }
    return { prefix: "Desconhecido", label: "—" };
  }, [override, plans, resolvedLabel]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 text-sm">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Badge variant="outline" className="shrink-0 text-xs">
          {prefix}
        </Badge>
        <span className="truncate text-xs text-muted-foreground" title={label}>
          {label}
        </span>
      </div>
      <Badge
        variant={override.enabled ? "default" : "secondary"}
        className="shrink-0"
      >
        {override.enabled ? "Ativo" : "Inativo"}
      </Badge>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={handleDelete}
        disabled={deleting}
        aria-label="Remover exceção"
      >
        {deleting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
}

// =============================================================================
// AddOverrideForm
// =============================================================================

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

type SelectedTarget =
  | { type: "user"; id: string; label: string }
  | { type: "organization"; id: string; label: string }
  | { type: "role"; value: string }
  | { type: "plan"; value: string };

function AddOverrideForm({
  flagKey,
  flagName,
  plans,
  onCreated,
  onCancel,
}: {
  flagKey: string;
  flagName: string;
  plans: PlanOption[];
  onCreated: () => Promise<void>;
  onCancel: () => void;
}) {
  const [targetType, setTargetType] = useState<OverrideTargetType>("user");
  const [enabled, setEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selected, setSelected] = useState<SelectedTarget | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebouncedValue(searchQuery, 250);
  const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
  const [orgResults, setOrgResults] = useState<OrganizationSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setSelected(null);
    setSearchQuery("");
    setUserResults([]);
    setOrgResults([]);
  }, [targetType]);

  useEffect(() => {
    if (targetType !== "user" && targetType !== "organization") return;
    if (debouncedQuery.trim().length < 2) {
      setUserResults([]);
      setOrgResults([]);
      return;
    }
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    setSearching(true);
    (async () => {
      try {
        if (targetType === "user") {
          const r = await searchUsers(debouncedQuery);
          if (!controller.signal.aborted) setUserResults(r);
        } else {
          const r = await searchOrganizations(debouncedQuery);
          if (!controller.signal.aborted) setOrgResults(r);
        }
      } catch {
        // Silent — typeahead shouldn't block the form
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    })();

    return () => controller.abort();
  }, [debouncedQuery, targetType]);

  const canSubmit = selected !== null && !submitting;

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      if (selected.type === "user") {
        await setUserOverride(flagKey, selected.id, enabled);
      } else if (selected.type === "organization") {
        await setOrganizationOverride(flagKey, selected.id, enabled);
      } else if (selected.type === "role") {
        await setRoleOverride(flagKey, selected.value, enabled);
      } else if (selected.type === "plan") {
        await setPlanOverride(flagKey, selected.value, enabled);
      }
      toast.success(`Exceção adicionada a '${flagName}'`);
      await onCreated();
      onCancel();
    } catch {
      toast.error("Não foi possível adicionar a exceção.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-border bg-background p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Nova exceção</p>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onCancel}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[160px_1fr]">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Tipo
          </label>
          <Select
            value={targetType}
            onValueChange={(v) => setTargetType(v as OverrideTargetType)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">Utilizador</SelectItem>
              <SelectItem value="organization">Organização</SelectItem>
              <SelectItem value="role">Perfil</SelectItem>
              <SelectItem value="plan">Plano</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Alvo
          </label>

          {(targetType === "user" || targetType === "organization") && (
            <div className="relative">
              {selected &&
              (selected.type === "user" || selected.type === "organization") ? (
                <div className="flex items-center justify-between rounded-md border border-input bg-muted/30 px-3 py-1.5 text-sm">
                  <span className="truncate">{selected.label}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setSelected(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    placeholder={
                      targetType === "user"
                        ? "Pesquisar por email ou nome…"
                        : "Pesquisar por nome ou slug…"
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {debouncedQuery.trim().length >= 2 && (
                    <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
                      {searching && (
                        <div className="flex items-center justify-center py-3 text-xs text-muted-foreground">
                          <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />A
                          pesquisar…
                        </div>
                      )}
                      {!searching &&
                        targetType === "user" &&
                        userResults.length === 0 && (
                          <div className="py-3 text-center text-xs text-muted-foreground">
                            Sem resultados
                          </div>
                        )}
                      {!searching &&
                        targetType === "organization" &&
                        orgResults.length === 0 && (
                          <div className="py-3 text-center text-xs text-muted-foreground">
                            Sem resultados
                          </div>
                        )}
                      {!searching &&
                        targetType === "user" &&
                        userResults.map((u) => (
                          <button
                            type="button"
                            key={u.id}
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                            onClick={() =>
                              setSelected({
                                type: "user",
                                id: u.id,
                                label: u.name
                                  ? `${u.name} (${u.email})`
                                  : u.email,
                              })
                            }
                          >
                            <div className="font-medium">
                              {u.name ?? u.email}
                            </div>
                            {u.name && (
                              <div className="text-xs text-muted-foreground">
                                {u.email}
                              </div>
                            )}
                          </button>
                        ))}
                      {!searching &&
                        targetType === "organization" &&
                        orgResults.map((o) => (
                          <button
                            type="button"
                            key={o.id}
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                            onClick={() =>
                              setSelected({
                                type: "organization",
                                id: o.id,
                                label: o.slug
                                  ? `${o.name} (${o.slug})`
                                  : o.name,
                              })
                            }
                          >
                            <div className="font-medium">{o.name}</div>
                            {o.slug && (
                              <div className="text-xs text-muted-foreground">
                                {o.slug}
                              </div>
                            )}
                          </button>
                        ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {targetType === "role" && (
            <Select
              value={selected?.type === "role" ? selected.value : ""}
              onValueChange={(v) => setSelected({ type: "role", value: v })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Escolher perfil…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">admin</SelectItem>
              </SelectContent>
            </Select>
          )}

          {targetType === "plan" && (
            <Select
              value={selected?.type === "plan" ? selected.value : ""}
              onValueChange={(v) => setSelected({ type: "plan", value: v })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Escolher plano…" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.planCode} value={p.planCode}>
                    {p.name} ({p.planCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
        <div className="flex items-center gap-2">
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
            id={`enable-${flagKey}`}
          />
          <label htmlFor={`enable-${flagKey}`} className="text-sm">
            {enabled ? "Ativar" : "Desativar"} para este alvo
          </label>
        </div>
        <Button size="sm" onClick={handleSubmit} disabled={!canSubmit}>
          {submitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            "Adicionar exceção"
          )}
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// FlagCard
// =============================================================================

function FlagCard({
  flag,
  plans,
  onFlagUpdated,
}: {
  flag: AdminFeatureFlag;
  plans: PlanOption[];
  onFlagUpdated: (updated: AdminFeatureFlag) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const handleToggle = async (checked: boolean) => {
    setIsUpdating(true);
    try {
      const updated = await updateFlagApi(flag.key, { enabled: checked });
      onFlagUpdated({ ...updated, overrides: flag.overrides });
      toast.success(
        `Funcionalidade '${flag.name}' ${checked ? "ativada" : "desativada"}`,
      );
    } catch {
      toast.error(`Erro ao atualizar a funcionalidade '${flag.name}'`);
    } finally {
      setIsUpdating(false);
    }
  };

  const refreshFlag = useCallback(async () => {
    try {
      const fresh = await getFlag(flag.key);
      onFlagUpdated(fresh);
    } catch {
      // ignore
    }
  }, [flag.key, onFlagUpdated]);

  const handleDeleteOverride = async (o: FeatureOverrideDto) => {
    try {
      if (o.userId) await removeUserOverride(flag.key, o.userId);
      else if (o.organizationId)
        await removeOrganizationOverride(flag.key, o.organizationId);
      else if (o.role) await removeRoleOverride(flag.key, o.role);
      else if (o.plan) await removePlanOverride(flag.key, o.plan);
      toast.success("Exceção removida");
      await refreshFlag();
    } catch {
      toast.error("Não foi possível remover a exceção.");
    }
  };

  const overrides = flag.overrides ?? [];

  return (
    <Card className="overflow-hidden border border-border shadow-sm">
      <CardHeader className="flex flex-row items-start gap-4 pb-3">
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">{flag.name}</CardTitle>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            {flag.key}
          </p>
          {flag.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {flag.description}
            </p>
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
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {flag.rolloutPercentage > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Distribuição:</span>
            <Badge variant="outline">{flag.rolloutPercentage}%</Badge>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between">
            <button
              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              {overrides.length}{" "}
              {overrides.length === 1 ? "exceção" : "exceções"}
            </button>
            {expanded && !showAddForm && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddForm(true)}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar
              </Button>
            )}
          </div>

          {expanded && (
            <div className="mt-2 space-y-2">
              {overrides.map((o) => (
                <OverrideRow
                  key={o.id}
                  override={o}
                  plans={plans}
                  onDelete={() => handleDeleteOverride(o)}
                />
              ))}
              {showAddForm && (
                <AddOverrideForm
                  flagKey={flag.key}
                  flagName={flag.name}
                  plans={plans}
                  onCreated={refreshFlag}
                  onCancel={() => setShowAddForm(false)}
                />
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Page
// =============================================================================

export default function AdminFeaturesPage() {
  const { isAdmin, isLoaded } = useAdmin();
  const router = useRouter();
  const [flags, setFlags] = useState<AdminFeatureFlag[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && !isAdmin) router.push("/dashboard");
  }, [isLoaded, isAdmin, router]);

  const loadFlags = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [flagsData, plansData] = await Promise.all([
        listFlags(),
        listPlans(),
      ]);
      const withOverrides = await Promise.all(
        flagsData.map(async (f) => {
          try {
            return await getFlag(f.key);
          } catch {
            return f;
          }
        }),
      );
      setFlags(withOverrides.map(applyFlagMetadata).sort(compareFlagOrder));
      setPlans(plansData);
    } catch {
      setError(
        "Não foi possível carregar as configurações de funcionalidades.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) loadFlags();
  }, [isAdmin, loadFlags]);

  const handleFlagUpdated = useCallback((updated: AdminFeatureFlag) => {
    setFlags((prev) =>
      prev.map((f) => (f.key === updated.key ? applyFlagMetadata(updated) : f)),
    );
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
        description="Controla a disponibilidade de funcionalidades por utilizador, organização, perfil ou plano."
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
            <FlagCard
              key={flag.key}
              flag={flag}
              plans={plans}
              onFlagUpdated={handleFlagUpdated}
            />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
