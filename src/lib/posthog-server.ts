import { PostHog } from "posthog-node";

export function getPostHogClient(): PostHog | null {
  const isPostHogEnabled =
    process.env.POSTHOG_ENABLED === "true" ||
    process.env.NEXT_PUBLIC_POSTHOG_ENABLED === "true";
  const apiKey =
    process.env.POSTHOG_API_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.POSTHOG_HOST ?? process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!isPostHogEnabled || !apiKey) {
    return null;
  }

  return new PostHog(apiKey, {
    host,
    flushAt: 1,
    flushInterval: 0,
  });
}
