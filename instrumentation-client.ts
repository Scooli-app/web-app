import posthog from "posthog-js";

// Stale deployment chunks produce ChunkLoadError when a new deploy invalidates
// old hashes while the user still has the previous version loaded. The only
// reliable recovery is a hard refresh to load the new bundle.
if (typeof window !== "undefined") {
  const isChunkError = (msg: string | null | undefined) =>
    typeof msg === "string" &&
    (msg.includes("ChunkLoadError") || msg.includes("Loading chunk"));

  window.addEventListener("error", (event) => {
    if (isChunkError(event.message)) {
      window.location.reload();
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason as { name?: string; message?: string } | null;
    if (isChunkError(reason?.name) || isChunkError(reason?.message)) {
      window.location.reload();
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
