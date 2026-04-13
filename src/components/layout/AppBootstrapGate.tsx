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
import { useAuth, useUser } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export function AppBootstrapGate() {
  const dispatch = useAppDispatch();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { isLoaded: isUserLoaded, user } = useUser();
  const [bootstrappedUserId, setBootstrappedUserId] = useState<string | null>(
    null,
  );
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const bootstrapRunIdRef = useRef(0);

  useEffect(() => {
    if (!isAuthLoaded || (isSignedIn && !isUserLoaded)) {
      setIsBootstrapping(true);
      return;
    }

    if (!isSignedIn || !user?.id) {
      dispatch(resetSubscriptionState());
      dispatch(resetFeaturesState());
      dispatch(resetWorkspaceState());
      setBootstrappedUserId(null);
      setIsBootstrapping(false);
      return;
    }

    if (bootstrappedUserId === user.id) {
      setIsBootstrapping(false);
      return;
    }

    const runId = bootstrapRunIdRef.current + 1;
    bootstrapRunIdRef.current = runId;
    let isActive = true;

    setIsBootstrapping(true);
    setBootstrappedUserId(null);
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

      await Promise.all([
        dispatch(fetchSubscription()),
        dispatch(fetchUsage()),
        dispatch(fetchFeatureFlags()),
        dispatch(fetchWorkspace()),
      ]);

      if (!isActive || bootstrapRunIdRef.current !== runId) {
        return;
      }

      setBootstrappedUserId(user.id);
      setIsBootstrapping(false);
    };

    void bootstrap();

    return () => {
      isActive = false;
    };
  }, [
    bootstrappedUserId,
    dispatch,
    isAuthLoaded,
    isSignedIn,
    isUserLoaded,
    user?.id,
  ]);

  const shouldShowLoader =
    !isAuthLoaded ||
    (isSignedIn &&
      (!isUserLoaded ||
        !user?.id ||
        isBootstrapping ||
        bootstrappedUserId !== user.id));

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
