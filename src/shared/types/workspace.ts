export type WorkspaceType = "personal" | "organization";

export interface CurrentOrganization {
  id: string;
  clerkOrganizationId: string;
  name: string;
  slug?: string | null;
  role?: string | null;
  membershipStatus?: string | null;
}

export interface WorkspaceContext {
  workspaceType: WorkspaceType;
  scooliAdmin: boolean;
  organizationAdmin: boolean;
  organization?: CurrentOrganization | null;
}

export interface OrganizationDashboard {
  organizationId: string;
  clerkOrganizationId: string;
  organizationName: string;
  organizationSlug?: string | null;
  planCode?: string | null;
  subscriptionStatus: string;
  seatLimit: number;
  activeSeats: number;
  invitedSeats: number;
  suspendedSeats: number;
  availableSeats: number;
  activeTeachersThisMonth: number;
  generationsThisMonth: number;
  totalDocuments: number;
  documentsCreatedThisMonth: number;
  sharedResources: number;
  topDocumentTypes: OrganizationDocumentTypeBreakdown[];
  activityByDay: OrganizationActivityPoint[];
  topActiveMembers: OrganizationMemberActivity[];
  startsAt?: string | null;
  endsAt?: string | null;
  renewalAt?: string | null;
}

export interface OrganizationMember {
  membershipId: string;
  userId: string;
  email?: string | null;
  name?: string | null;
  role: string;
  status: string;
  joinedAt?: string | null;
  generationsThisMonth: number;
  documentsCreatedThisMonth: number;
  totalDocuments: number;
  sharedResourcesCount: number;
  lastActiveAt?: string | null;
}

export interface OrganizationDocumentTypeBreakdown {
  documentType: string;
  count: number;
}

export interface OrganizationActivityPoint {
  date: string;
  generations: number;
}

export interface OrganizationMemberActivity {
  userId: string;
  name?: string | null;
  email?: string | null;
  role: string;
  generationsThisMonth: number;
  documentsCreatedThisMonth: number;
  totalDocuments: number;
  sharedResourcesCount: number;
  lastActiveAt?: string | null;
}
