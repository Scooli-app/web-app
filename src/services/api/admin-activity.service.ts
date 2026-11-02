import apiClient from "./client";

export interface AdminActivityPoint {
  /** First day of the day / week / month bucket (yyyy-MM-dd). */
  date: string;
  activeUsers: number;
  newUsers: number;
}

export interface AdminActivity {
  summary: {
    totalUsers: number;
    activeNow: number;
    activeToday: number;
    activeWeek: number;
    activeMonth: number;
    newUsersWeek: number;
    newUsersMonth: number;
  };
  daily: AdminActivityPoint[];
  weekly: AdminActivityPoint[];
  monthly: AdminActivityPoint[];
  topUsers: {
    userId: string;
    name?: string | null;
    email: string;
    activeDays: number;
    actions: number;
    lastActiveAt?: string | null;
  }[];
}

export const adminActivityService = {
  getActivity: async (): Promise<AdminActivity> => {
    const response = await apiClient.get<AdminActivity>("/admin/activity");
    return response.data;
  },
};
