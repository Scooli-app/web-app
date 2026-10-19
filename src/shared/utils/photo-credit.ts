import type { ImageAttribution } from "@/shared/types/blocks";

const PROVIDER_NAMES: Record<string, string> = {
  pexels: "Pexels",
  pixabay: "Pixabay",
  wikimedia: "Wikimedia Commons",
  openverse: "Openverse",
};

/** Licences whose terms require naming the licence next to the author. */
const ATTRIBUTION_LICENSE = /^CC BY\b/i;

export function providerDisplayName(provider: string): string {
  return PROVIDER_NAMES[provider.toLowerCase()] ?? provider.charAt(0).toUpperCase() + provider.slice(1);
}

/**
 * Credit line for a stock image: "Ana Silva / Wikimedia Commons, CC BY-SA 4.0", "Ana Silva / Pexels",
 * or just the provider when the author is unknown. CC BY / CC BY-SA licences are always named.
 */
export function formatImageCredit(attribution: ImageAttribution | null | undefined): string | null {
  if (!attribution?.provider) return null;
  const provider = providerDisplayName(attribution.provider);
  const author = attribution.author?.trim();
  const credit = author ? `${author} / ${provider}` : provider;
  const license = attribution.license?.trim();
  return license && ATTRIBUTION_LICENSE.test(license) ? `${credit}, ${license}` : credit;
}
