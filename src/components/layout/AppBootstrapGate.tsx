"use client";

import {
  fetchFeatureFlags,
  resetFeaturesState,
} from "@/store/features/featuresSlice";
import { useAppDispatch } from "@/store/hooks";
import {
  fetchSubscription,
  fetchUsage,
  resetSubscriptionState,
} from "@/store/subscription/subscriptionSlice";
import {
  fetchWorkspace,
  resetWorkspaceState,
} from "@/store/workspace/workspaceSlice";
import { isClerkOrganizationAdminRole } from "@/shared/utils/clerkOrganizationRole";
import { useAuth, useOrganizationList, useUser } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const MAX_ORGANIZATION_ACTIVATION_ATTEMPTS = 3;
const ORGANIZATION_ACTIVATION_TOKEN_POLL_ATTEMPTS = 8;
const ORGANIZATION_ACTIVATION_TOKEN_POLL_DELAY_MS = 250;

type ClerkGetToken = ReturnType<typeof useAuth>["getToken"];

function decodeJwtPayload(token: string | null): Record<string, unknown> | null {
  if (!token) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const paddedBase64 =
      base64 + "=".repeat((4 - (base64.length % 4 || 4)) % 4);
    return JSON.parse(atob(paddedBase64)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getOrganizationIdFromToken(token: string | null): string | null {
  const payload = decodeJwtPayload(token);
  return typeof payload?.org_id === "string" ? payload.org_id : null;
}

async function getFreshClerkToken(getToken: ClerkGetToken): Promise<string | null> {
  const template = process.env.NEXT_PUBLIC_CLERK_JWT_TEMPLATE;
  return getToken(template ? { template, skipCache: true } : { skipCache: true });
}

export function AppBootstrapGate() {
  const dispatch = useAppDispatch();
  const {
    getToken,
    isLoaded: isAuthLoaded,
    isSignedIn,
    orgId,
    orgRole,
  } = useAuth();
  const { isLoaded: isUserLoaded, user } = useUser();
  const {
    isLoaded: isOrganizationListLoaded,
    setActive,
    userMemberships,
  } = useOrganizationList({
    userMemberships: true,
  });
  const [bootstrappedIdentity, setBootstrappedIdentity] = useState<string | null>(
    null,
  );
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [activatedOrganizationId, setActivatedOrganizationId] = useState<
    string | null
  >(null);
  const [isActivatingOrganization, setIsActivatingOrganization] = useState(false);
  const [orgActivationAttempts, setOrgActivationAttempts] = useState<
    Record<string, number>
  >({});
  const bootstrapRunIdRef = useRef(0);
  const effectiveOrgId = orgId ?? activatedOrganizationId;
  const bootstrapIdentity = user?.id
    ? `${user.id}:${effectiveOrgId ?? "personal"}:${orgRole ?? "none"}`
    : null;
  const availableMemberships = userMemberships.data ?? [];
  const preferredMembership =
    availableMemberships.find((membership) =>
      isClerkOrganizationAdminRole(membership.role),
    ) ?? availableMemberships[0] ?? null;
  const activationTargetOrgId =
    !effectiveOrgId && preferredMembership?.organization?.id
      ? preferredMembership.organization.id
      : null;
  const orgActivationAttemptKey =
    user?.id && activationTargetOrgId
      ? `${user.id}:${activationTargetOrgId}`
      : null;
  const orgActivationAttemptCount = orgActivationAttemptKey
    ? (orgActivationAttempts[orgActivationAttemptKey] ?? 0)
    : 0;
  const shouldAttemptOrganizationActivation =
    Boolean(
      isSignedIn &&
        user?.id &&
        !effectiveOrgId &&
        isOrganizationListLoaded &&
        activationTargetOrgId &&
        orgActivationAttemptCount < MAX_ORGANIZATION_ACTIVATION_ATTEMPTS,
    );

  useEffect(() => {
    if (!isSignedIn || !user?.id) {
      setActivatedOrganizationId(null);
      setOrgActivationAttempts({});
      setIsActivatingOrganization(false);
      return;
    }

    if (orgId) {
      setActivatedOrganizationId(orgId);
      setOrgActivationAttempts({});
      setIsActivatingOrganization(false);
    }
  }, [isSignedIn, orgId, user?.id]);

  useEffect(() => {
    if (
      !shouldAttemptOrganizationActivation ||
      !setActive ||
      !user?.id ||
      !activationTargetOrgId ||
      !orgActivationAttemptKey
    ) {
      return;
    }

    let isCancelled = false;
    setIsActivatingOrganization(true);
    setOrgActivationAttempts((currentAttempts) => ({
      ...currentAttempts,
      [orgActivationAttemptKey]:
        (currentAttempts[orgActivationAttemptKey] ?? 0) + 1,
    }));

    void (async () => {
      try {
        await setActive({
          organization: activationTargetOrgId,
        });

        for (
          let attemptIndex = 0;
          attemptIndex < ORGANIZATION_ACTIVATION_TOKEN_POLL_ATTEMPTS;
          attemptIndex += 1
        ) {
          const token = await getFreshClerkToken(getToken);
          const tokenOrganizationId = getOrganizationIdFromToken(token);

          if (tokenOrganizationId === activationTargetOrgId) {
            if (!isCancelled) {
              setActivatedOrganizationId(tokenOrganizationId);
            }
            return;
          }

          await new Promise((resolve) =>
            setTimeout(resolve, ORGANIZATION_ACTIVATION_TOKEN_POLL_DELAY_MS),
          );
        }
      } catch (error) {
        console.error("Failed to activate Clerk organization:", error);
      } finally {
        if (!isCancelled) {
          setIsActivatingOrganization(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [
    activationTargetOrgId,
    getToken,
    orgActivationAttemptKey,
    setActive,
    shouldAttemptOrganizationActivation,
    user?.id,
  ]);

  useEffect(() => {
    if (!isAuthLoaded || (isSignedIn && !isUserLoaded)) {
      setIsBootstrapping(true);
      return;
    }

    if (isSignedIn && !effectiveOrgId && !isOrganizationListLoaded) {
      setIsBootstrapping(true);
      return;
    }

    if (shouldAttemptOrganizationActivation || isActivatingOrganization) {
      setIsBootstrapping(true);
      return;
    }

    if (!isSignedIn || !user?.id) {
      dispatch(resetSubscriptionState());
      dispatch(resetFeaturesState());
      dispatch(resetWorkspaceState());
      setBootstrappedIdentity(null);
      setIsBootstrapping(false);
      return;
    }

    if (bootstrappedIdentity === bootstrapIdentity) {
      setIsBootstrapping(false);
      return;
    }

    const runId = bootstrapRunIdRef.current + 1;
    bootstrapRunIdRef.current = runId;
    let isActive = true;

    setIsBootstrapping(true);
    setBootstrappedIdentity(null);
    dispatch(resetSubscriptionState());
    dispatch(resetFeaturesState());
    dispatch(resetWorkspaceState());

    const bootstrap = async () => {
      // Give the AuthProvider one effect cycle to register the Clerk token getter
      // before these authenticated requests start.
      await new Promise((resolve) => setTimeout(resolve, 0));

      if (!isActive || bootstrapRunIdRef.current !== runId) {
        return;
      }

      await getFreshClerkToken(getToken);

      if (!isActive || bootstrapRunIdRef.current !== runId) {
        return;
      }

      await Promise.all([
        dispatch(fetchSubscription()),
        dispatch(fetchUsage()),
        dispatch(fetchFeatureFlags()),
        dispatch(fetchWorkspace()),
      ]);

      if (!isActive || bootstrapRunIdRef.current !== runId) {
        return;
      }

      setBootstrappedIdentity(bootstrapIdentity);
      setIsBootstrapping(false);
    };

    void bootstrap();

    return () => {
      isActive = false;
    };
  }, [
    bootstrapIdentity,
    bootstrappedIdentity,
    dispatch,
    isAuthLoaded,
    isSignedIn,
    isActivatingOrganization,
    isOrganizationListLoaded,
    isUserLoaded,
    effectiveOrgId,
    getToken,
    orgRole,
    shouldAttemptOrganizationActivation,
    user?.id,
  ]);

  const shouldShowLoader =
    !isAuthLoaded ||
    (isSignedIn &&
      (!isUserLoaded ||
        !user?.id ||
        isBootstrapping ||
        bootstrappedIdentity !== bootstrapIdentity));

  if (!shouldShowLoader) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[120] overflow-hidden bg-background/96 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(103,83,255,0.16),_transparent_42%),radial-gradient(circle_at_bottom,_rgba(103,83,255,0.08),_transparent_40%)]" />

      <div className="relative flex min-h-dvh items-center justify-center p-6">
        <div className="w-full max-w-md rounded-[28px] border border-border/70 bg-card/95 p-8 shadow-[0_24px_80px_rgba(11,13,23,0.16)]">
          <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-3xl bg-primary/10 ring-1 ring-primary/15 p-3">
            <Image
              src="/scooli.svg"
              alt="Scooli"
              width={86}
              height={28}
              priority
              className="h-auto w-20"
            />
          </div>

          <div className="mt-6 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          </div>

          <div className="mt-6 space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              A preparar a tua conta
            </h1>
          </div>
        </div>
      </div>
    </div>
  );
}
