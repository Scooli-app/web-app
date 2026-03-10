import posthog from "posthog-js";

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogProxyPath = process.env.NEXT_PUBLIC_POSTHOG_PROXY_PATH ?? "/_ph";
const isDevelopment = process.env.NODE_ENV === "development";

if (posthogKey) {
  posthog.init(posthogKey, {
    // Use a first-party proxy path to reduce browser tracking-blocker interference.
    api_host: posthogProxyPath,
    ui_host: "https://eu.posthog.com",
    defaults: "2026-01-30",
    capture_exceptions: true,
    disable_compression: isDevelopment,
    disable_session_recording: isDevelopment,
    debug: isDevelopment,
  });
} else if (isDevelopment) {
  console.warn(
    "[PostHog] NEXT_PUBLIC_POSTHOG_KEY is missing; analytics is disabled."
  );
}
