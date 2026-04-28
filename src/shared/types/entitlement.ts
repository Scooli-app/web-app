import type { UsageStats } from "./subscription";

export type EntitlementSource = "none" | "personal" | "organization" | "both";

export interface CurrentEntitlement {
  isPro: boolean;
  source: EntitlementSource;
  usage: UsageStats;
}
