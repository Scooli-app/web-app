"use client";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import {
  SignIn,
  useAuth,
  useClerk,
  useOrganizationList,
  useUser,
} from "@clerk/nextjs";
import {
  Building2,
  CheckCircle2,
  Loader2,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) {
    return null;
  }

  const normalized = email.trim().toLowerCase();
  return normalized || null;
}

function formatRoleLabel(role: string | null | undefined): string {
  if (!role) {
    return "membro";
  }

  const normalizedRole = role.trim().toLowerCase();
  if (!normalizedRole) {
    return "membro";
  }

  const lastColonIndex = normalizedRole.lastIndexOf(":");
  const roleKey =
    lastColonIndex >= 0 && lastColonIndex < normalizedRole.length - 1
      ? normalizedRole.slice(lastColonIndex + 1)
      : normalizedRole;

  switch (roleKey) {
    case "admin":
    case "school_admin":
    case "director":
      return "administrador";
    default:
      return "membro";
  }
}

function AcceptOrganizationInvitationFallback() {
  return (
    <AuthLayout>
      <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">
              A preparar o teu convite
            </h1>
            <p className="text-sm text-muted-foreground">
              Estamos a carregar os detalhes do convite.
            </p>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}

function AcceptOrganizationInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { isLoaded: isUserLoaded, user } = useUser();
  const { signOut } = useClerk();
  const {
    isLoaded: isOrganizationListLoaded,
    setActive,
    userInvitations,
  } = useOrganizationList({
    userInvitations: {
      status: "pending",
      pageSize: 100,
    },
  });
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [hasAccepted, setHasAccepted] = useState(false);
  const acceptAttemptedRef = useRef(false);

  const invitationId = searchParams.get("invitation_id");
  const organizationId = searchParams.get("organization_id");
  const organizationName =
    searchParams.get("organization_name") ?? "a sua organizacao";
  const invitedEmail = normalizeEmail(searchParams.get("email"));
  const roleLabel = formatRoleLabel(searchParams.get("role"));
  const currentSearch = searchParams.toString();
  const currentInvitationUrl = currentSearch
    ? `/accept-organization-invitation?${currentSearch}`
    : "/accept-organization-invitation";
  const signUpUrl = `/sign-up?redirect_url=${encodeURIComponent(currentInvitationUrl)}`;
  const currentUserEmail = normalizeEmail(
    user?.primaryEmailAddress?.emailAddress ??
      user?.emailAddresses?.[0]?.emailAddress,
  );
  const hasInviteContext = Boolean(invitationId || organizationId);
  const userInvitationsList = userInvitations.data ?? [];
  const matchingInvitation =
    userInvitationsList.find((invitation) => {
      const invitationEmail = normalizeEmail(invitation.emailAddress);

      if (invitationId && invitation.id === invitationId) {
        return true;
      }

      if (
        organizationId &&
        invitedEmail &&
        invitation.publicOrganizationData.id === organizationId &&
        invitationEmail === invitedEmail
      ) {
        return true;
      }

      if (
        organizationId &&
        invitation.publicOrganizationData.id === organizationId
      ) {
        return true;
      }

      return false;
    }) ?? null;
  const hasEmailMismatch =
    Boolean(isSignedIn && invitedEmail && currentUserEmail) &&
    invitedEmail !== currentUserEmail;

  useEffect(() => {
    if (
      !isAuthLoaded ||
      !isSignedIn ||
      !isUserLoaded ||
      !isOrganizationListLoaded
    ) {
      return;
    }

    if (
      !hasInviteContext ||
      hasEmailMismatch ||
      acceptAttemptedRef.current ||
      hasAccepted
    ) {
      return;
    }

    if (userInvitations.isLoading) {
      setIsAccepting(true);
      return;
    }

    if (!matchingInvitation) {
      setIsAccepting(false);
      setAcceptError(
        "Nao encontramos um convite pendente para esta conta. Se ja aceitaste o convite, podes abrir o dashboard. Caso contrario, confirma que entraste com o email certo.",
      );
      return;
    }

    acceptAttemptedRef.current = true;
    setAcceptError(null);
    setIsAccepting(true);

    void (async () => {
      try {
        const acceptedInvitation = await matchingInvitation.accept();

        if (setActive) {
          await setActive({
            organization: acceptedInvitation.publicOrganizationData.id,
          });
        }

        setHasAccepted(true);
        router.replace("/dashboard");
      } catch (error) {
        console.error("Failed to accept organization invitation:", error);
        acceptAttemptedRef.current = false;
        setIsAccepting(false);
        setAcceptError(
          "Nao foi possivel aceitar o convite agora. Tenta novamente dentro de instantes.",
        );
      }
    })();
  }, [
    hasAccepted,
    hasEmailMismatch,
    hasInviteContext,
    isAuthLoaded,
    isOrganizationListLoaded,
    isSignedIn,
    isUserLoaded,
    matchingInvitation,
    router,
    setActive,
    userInvitations.isLoading,
  ]);

  if (!isAuthLoaded || (isSignedIn && !isUserLoaded)) {
    return (
      <AuthLayout>
        <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-8 shadow-sm">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-foreground">
                A preparar o teu convite
              </h1>
              <p className="text-sm text-muted-foreground">
                Estamos a confirmar o estado da tua conta.
              </p>
            </div>
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (!hasInviteContext) {
    return (
      <AuthLayout>
        <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-8 shadow-sm">
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Building2 className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-foreground">
                Convite invalido
              </h1>
              <p className="text-sm text-muted-foreground">
                Este link nao contem informacao suficiente para concluir o
                convite.
              </p>
            </div>
            <Button onClick={() => router.push("/sign-in")}>
              Abrir autenticacao
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (!isSignedIn) {
    return (
      <AuthLayout>
        <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <div className="rounded-3xl border border-border bg-card p-8 shadow-sm h-fit">
            <div className="space-y-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Building2 className="h-7 w-7" />
              </div>

              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Convite de organizacao
                </div>

                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                  Entrar em {organizationName}
                </h1>

                <p className="text-sm leading-6 text-muted-foreground">
                  Vais entrar como {roleLabel}. Depois de iniciares sessao ou
                  criares conta, o convite sera aceite automaticamente.
                </p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-muted/40 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Email do convite
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {invitedEmail ?? "Usa o email com que recebeste o convite"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <SignIn
              path="/accept-organization-invitation"
              routing="path"
              signInUrl={currentInvitationUrl}
              signUpUrl={signUpUrl}
              forceRedirectUrl={currentInvitationUrl}
              fallbackRedirectUrl={currentInvitationUrl}
            />
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (hasEmailMismatch) {
    return (
      <AuthLayout>
        <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-8 shadow-sm">
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-7 w-7" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-foreground">
                Esta conta nao corresponde ao convite
              </h1>
              <p className="text-sm leading-6 text-muted-foreground">
                O convite foi enviado para{" "}
                <strong className="text-foreground">{invitedEmail}</strong>, mas
                neste momento estas autenticado como{" "}
                <strong className="text-foreground">{currentUserEmail}</strong>.
              </p>
            </div>

            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                variant="outline"
                onClick={() =>
                  void signOut({ redirectUrl: currentInvitationUrl })
                }
              >
                <LogOut className="h-4 w-4" />
                Terminar sessao
              </Button>
              <Button onClick={() => router.push("/dashboard")}>
                Ir para o dashboard
              </Button>
            </div>
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (acceptError) {
    return (
      <AuthLayout>
        <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-8 shadow-sm">
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Building2 className="h-7 w-7" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-foreground">
                Nao foi possivel concluir o convite
              </h1>
              <p className="text-sm leading-6 text-muted-foreground">
                {acceptError}
              </p>
            </div>

            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button onClick={() => router.push("/dashboard")}>
                Abrir dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  void signOut({ redirectUrl: currentInvitationUrl })
                }
              >
                <LogOut className="h-4 w-4" />
                Trocar de conta
              </Button>
            </div>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-8 shadow-sm">
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {hasAccepted ? (
              <CheckCircle2 className="h-7 w-7" />
            ) : (
              <Loader2 className="h-7 w-7 animate-spin" />
            )}
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">
              {hasAccepted ? "Convite aceite" : "A aceitar o convite"}
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              {hasAccepted
                ? `Ja estas a entrar em ${organizationName}.`
                : `Estamos a concluir o teu acesso a ${organizationName}.`}
            </p>
          </div>

          {isAccepting && !hasAccepted ? (
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              A sincronizar organizacao
            </p>
          ) : null}
        </div>
      </div>
    </AuthLayout>
  );
}

export default function AcceptOrganizationInvitationPage() {
  return (
    <Suspense fallback={<AcceptOrganizationInvitationFallback />}>
      <AcceptOrganizationInvitationContent />
    </Suspense>
  );
}
