/**
 * Admin promo links (ENG-360): `/admin/trial-promos`, called with the admin session the same way
 * the other `/admin/*` services are. The code is immutable once created.
 */
import type {
  AdminTrialPromo,
  CreateTrialPromoRequest,
  UpdateTrialPromoRequest,
} from "@/shared/types/trial-promo";
import apiClient from "./client";

export const adminTrialPromosService = {
  list: () => apiClient.get<AdminTrialPromo[]>("/admin/trial-promos").then((r) => r.data),
  create: (body: CreateTrialPromoRequest) =>
    apiClient.post<AdminTrialPromo>("/admin/trial-promos", body).then((r) => r.data),
  update: (code: string, body: UpdateTrialPromoRequest) =>
    apiClient
      .patch<AdminTrialPromo>(`/admin/trial-promos/${encodeURIComponent(code)}`, body)
      .then((r) => r.data),
};
