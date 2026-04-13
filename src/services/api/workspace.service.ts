import apiClient from "./client";
import type {
  CurrentOrganization,
  OrganizationDashboard,
  OrganizationMember,
  WorkspaceContext,
} from "@/shared/types/workspace";

export async function getCurrentWorkspace(): Promise<WorkspaceContext> {
  const response = await apiClient.get<WorkspaceContext>("/workspace/current");
  return response.data;
}

export async function getCurrentOrganization(): Promise<CurrentOrganization> {
  const response = await apiClient.get<CurrentOrganization>("/organizations/current");
  return response.data;
}

export async function getCurrentOrganizationDashboard(): Promise<OrganizationDashboard> {
  const response = await apiClient.get<OrganizationDashboard>(
    "/organizations/current/dashboard"
  );
  return response.data;
}

export async function getCurrentOrganizationMembers(): Promise<OrganizationMember[]> {
  const response = await apiClient.get<OrganizationMember[]>(
    "/organizations/current/members"
  );
  return response.data;
}
