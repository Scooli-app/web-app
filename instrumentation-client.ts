import posthog from "posthog-js";
import { toast } from "sonner";
import { translate } from "@/i18n/translate";

// Stale deployment chunks produce ChunkLoadError when a new deploy invalidates
// old hashes while the user still has the previous version loaded. The only
// reliable recovery is a hard refresh to load the new bundle.
if (typeof window !== "undefined") {
  const isChunkError = (msg: string | null | undefined) =>
    typeof msg === "string" &&
    (msg.includes("ChunkLoadError") || msg.includes("Loading chunk"));

  // While the page is still loading nothing has been typed yet, so reload at once.
  // Later, an instant reload wiped half-filled forms (7 Oct): offer it and let the
  // teacher pick the moment.
  const recover = () => {
    if (document.readyState !== "complete") {
      window.location.reload();
      return;
    }
    toast(translate("errors.appUpdate.message"), {
      id: "app-update",
      duration: Infinity,
      action: { label: translate("errors.appUpdate.action"), onClick: () => window.location.reload() },
    });
  };

  window.addEventListener("error", (event) => {
    if (isChunkError(event.message)) {
      recover();
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason as { name?: string; message?: string } | null;
    if (isChunkError(reason?.name) || isChunkError(reason?.message)) {
      recover();
    }
  });
}

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogProxyPath = process.env.NEXT_PUBLIC_POSTHOG_PROXY_PATH ?? "/_ph";
const isDevelopment = process.env.NODE_ENV === "development";
const isPostHogEnabled = process.env.NEXT_PUBLIC_POSTHOG_ENABLED === "true";

if (isPostHogEnabled && posthogKey) {
  posthog.init(posthogKey, {
    // Use a first-party proxy path to reduce browser tracking-blocker interference.
    api_host: posthogProxyPath,
    ui_host: "https://eu.posthog.com",
    defaults: "2026-01-30",
    capture_exceptions: true,
    disable_compression: isDevelopment,
    disable_session_recording: isDevelopment,
    debug: isDevelopment,
    cross_subdomain_cookie: true,
  });
} else if (isDevelopment && isPostHogEnabled && !posthogKey) {
  console.warn(
    "[PostHog] NEXT_PUBLIC_POSTHOG_KEY is missing; analytics is disabled."
  );
}
