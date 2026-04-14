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
}
