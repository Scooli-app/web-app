import apiClient from "./client";
import type {
  CurrentOrganization,
  OrganizationDashboard,
  OrganizationInvitation,
  OrganizationInviteRole,
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

/* Members management, admin-only. A failure is an ApiRequestError whose code is the backend's
   error: seat_limit_reached, already_member, last_admin, self, invalid_emails, ... */

export async function getCurrentOrganizationInvitations(): Promise<OrganizationInvitation[]> {
  const response = await apiClient.get<OrganizationInvitation[]>("/organizations/current/invitations");
  return response.data;
}

export async function inviteToCurrentOrganization(
  emails: string[],
  role: OrganizationInviteRole,
): Promise<OrganizationInvitation[]> {
  const response = await apiClient.post<OrganizationInvitation[]>("/organizations/current/invitations", {
    emails,
    role,
  });
  return response.data;
}

export async function resendOrganizationInvitation(id: string): Promise<OrganizationInvitation> {
  const response = await apiClient.post<OrganizationInvitation>(
    `/organizations/current/invitations/${encodeURIComponent(id)}/resend`,
  );
  return response.data;
}

export async function revokeOrganizationInvitation(id: string): Promise<void> {
  await apiClient.delete(`/organizations/current/invitations/${encodeURIComponent(id)}`);
}

export async function removeOrganizationMember(userId: string): Promise<void> {
  await apiClient.delete(`/organizations/current/members/${encodeURIComponent(userId)}`);
}

export async function changeOrganizationMemberRole(userId: string, role: OrganizationInviteRole): Promise<void> {
  await apiClient.put(`/organizations/current/members/${encodeURIComponent(userId)}/role`, { role });
}
