import apiClient from "./client";
import type { CurrentEntitlement } from "@/shared/types/entitlement";

const ENTITLEMENTS_BASE = "/entitlements";

export async function getCurrentEntitlement(): Promise<CurrentEntitlement> {
  const response = await apiClient.get<CurrentEntitlement>(
    `${ENTITLEMENTS_BASE}/current`,
  );
  return response.data;
}
