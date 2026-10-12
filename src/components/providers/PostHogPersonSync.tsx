"use client";

import {
  resolveEffectiveContentLanguage,
  resolveEffectiveInterfaceLocale,
} from "@/i18n/clientLocale";
import { selectCurrentEntitlement } from "@/store/entitlements/selectors";
import { selectSubscription } from "@/store/subscription/selectors";
import type { RootState } from "@/store/store";
import { selectWorkspaceContext } from "@/store/workspace/selectors";
import { useUser } from "@clerk/nextjs";
import posthog from "posthog-js";
import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";

/**
 * Keeps the PostHog person profile in step with who the teacher is: plan,
 * school, language and when they signed up. Without these, PostHog can count events but
 * cannot answer "how many paying teachers are active?" or "how many teachers
 * from this school use Scooli every week?".
 *
 * Runs on every app load for every signed-in user, so existing accounts get
 * backfilled too, not only new sign-ups. Only sends when a value changes.
 * Ids and plan codes only; email and name are set by AuthProvider's identify.
 */
export function PostHogPersonSync() {
  const { user } = useUser();
  const subscription = useSelector(selectSubscription);
  const entitlement = useSelector(selectCurrentEntitlement);
  const workspace = useSelector(selectWorkspaceContext);
  const interfacePreference = useSelector(
    (state: RootState) => state.ui.interfaceLocale,
  );
  const contentPreference = useSelector(
    (state: RootState) => state.ui.contentLanguage,
  );
  const lastSentRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id || !entitlement || !workspace) return;

    const organization = workspace.organization ?? null;
    const properties = {
      plan_code: subscription?.planCode ?? "free",
      subscription_status: subscription?.status ?? "free",
      is_pro: entitlement.isPro,
      entitlement_source: entitlement.source,
      workspace_type: workspace.workspaceType,
      school_id: organization?.id ?? null,
      school_name: organization?.name ?? null,
      school_role: organization?.role ?? null,
      is_school_admin: workspace.organizationAdmin,
      // Market split (PT vs international) for traction outside Portugal.
      // Country comes from PostHog's GeoIP ($geoip_country_code).
      interface_locale: resolveEffectiveInterfaceLocale(interfacePreference),
      content_language: resolveEffectiveContentLanguage(
        contentPreference,
        interfacePreference,
      ),
    };
    const setOnce = user.createdAt
      ? { signed_up_at: user.createdAt.toISOString() }
      : {};

    const key = `${user.id}:${JSON.stringify(properties)}`;
    if (lastSentRef.current === key) return;
    lastSentRef.current = key;

    posthog.setPersonProperties(properties, setOnce);
  }, [
    user?.id,
    user?.createdAt,
    subscription,
    entitlement,
    workspace,
    interfacePreference,
    contentPreference,
  ]);

  return null;
}
