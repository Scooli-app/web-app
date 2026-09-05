import type { CurrentUserProfile } from "@/shared/types/user";
import { isAxiosError } from "axios";
import apiClient from "./client";

export const userService = {
  getCurrentUser: async (): Promise<CurrentUserProfile> => {
    const response = await apiClient.get<CurrentUserProfile>("/users/me");
    return response.data;
  },

  /**
   * Sets the NIF the fatura is issued with. Pass null to clear it, which means
   * the next faturas are issued to consumidor final.
   *
   * The backend checks the control digit and answers 400 with the reason, so
   * that reason is surfaced instead of a generic failure — it is a typo the
   * person can still fix.
   */
  updateNif: async (nif: string | null): Promise<void> => {
    try {
      await apiClient.put("/users/me", { nif });
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 400) {
        const message = (error.response.data as { error?: string })?.error;
        if (message) throw new Error(message);
      }
      throw error;
    }
  },
};
