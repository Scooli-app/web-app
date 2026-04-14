"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  selectWorkspaceError,
  selectHasOrganizationWorkspace,
  selectIsOrganizationAdmin,
  selectWorkspaceContext,
  selectWorkspaceLoading,
  selectWorkspaceMembers,
  selectWorkspaceReady,
} from "@/store/workspace/selectors";
import { fetchOrganizationMembers } from "@/store/workspace/workspaceSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SchoolMembersPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const workspace = useAppSelector(selectWorkspaceContext);
  const members = useAppSelector(selectWorkspaceMembers);
  const loading = useAppSelector(selectWorkspaceLoading);
  const error = useAppSelector(selectWorkspaceError);
  const workspaceReady = useAppSelector(selectWorkspaceReady);
  const hasOrganizationWorkspace = useAppSelector(selectHasOrganizationWorkspace);
  const isOrganizationAdmin = useAppSelector(selectIsOrganizationAdmin);

  useEffect(() => {
    if (!workspaceReady) {
      return;
    }

    if (!hasOrganizationWorkspace || !isOrganizationAdmin) {
      router.replace("/dashboard");
      return;
    }

    void dispatch(fetchOrganizationMembers());
  }, [dispatch, hasOrganizationWorkspace, isOrganizationAdmin, router, workspaceReady]);

  if (!workspaceReady || !hasOrganizationWorkspace || !isOrganizationAdmin) {
    return null;
  }

  return (
    <PageContainer size="xl" contentClassName="py-4 sm:py-8">
      <PageHeader
        title="Membros da escola"
        description={`Gestão inicial de membros e lugares para ${workspace?.organization?.name ?? "a organização"}.`}
        icon={
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 sm:h-12 sm:w-12">
            <Building2 className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Membros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && !loading && members.length === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button
                variant="outline"
                onClick={() => void dispatch(fetchOrganizationMembers())}
              >
                Tentar novamente
              </Button>
            </div>
          ) : loading && members.length === 0 ? (
            <p className="text-sm text-muted-foreground">A carregar membros...</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda não existem membros sincronizados para esta escola.</p>
          ) : (
            members.map((member) => (
              <div
                key={member.membershipId}
                className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {member.name || member.email || "Utilizador sem nome"}
                  </p>
                  <p className="text-sm text-muted-foreground">{member.email ?? "Sem email disponível"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{member.role}</Badge>
                  <Badge variant={member.status === "active" ? "default" : "outline"}>
                    {member.status}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
