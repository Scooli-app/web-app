import type { CurrentUserProfile } from "@/shared/types/user";
import apiClient from "./client";

export const userService = {
  getCurrentUser: async (): Promise<CurrentUserProfile> => {
    const response = await apiClient.get<CurrentUserProfile>("/users/me");
    return response.data;
  },
};
