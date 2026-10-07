import type { VocationalClass } from "@/shared/types/teaching-profile";
import apiClient from "./client";

/**
 * Teacher-defined vocational classes ("turmas") — SCOOL-154.
 *
 * Mirrors `teaching-profile.service.ts` exactly (same host, same auth), kept
 * as its own file because the endpoint is a `/teaching-profile` sub-resource
 * with its own CRUD lifecycle rather than the single-document get/save shape
 * of the rest of the teaching profile.
 */
export const vocationalClassService = {
  list: async (): Promise<VocationalClass[]> => {
    const response = await apiClient.get<VocationalClass[]>(
      "/teaching-profile/vocational-classes"
    );
    return response.data;
  },

  create: async (
    request: Omit<VocationalClass, "id" | "status">
  ): Promise<VocationalClass> => {
    const response = await apiClient.post<VocationalClass>(
      "/teaching-profile/vocational-classes",
      request
    );
    return response.data;
  },

  update: async (
    id: string,
    request: Omit<VocationalClass, "id" | "status">
  ): Promise<VocationalClass> => {
    const response = await apiClient.put<VocationalClass>(
      `/teaching-profile/vocational-classes/${encodeURIComponent(id)}`,
      request
    );
    return response.data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(
      `/teaching-profile/vocational-classes/${encodeURIComponent(id)}`
    );
  },
};
