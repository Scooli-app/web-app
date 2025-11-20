/**
 * Community and creator types
 */

export interface CommunityResource {
  id: string;
  title: string;
  description: string;
  type: "lesson_plan" | "presentation" | "test" | "quiz" | "activity";
  subject: string;
  gradeLevel: string;
  downloads: number;
  rating: number;
  user: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  createdAt: string;
}

export type CreatorTier = "iniciante" | "bronze" | "prata" | "ouro" | "platina";

export interface CreatorProfile {
  id: string;
  userId: string;
  tier: CreatorTier;
  xp: number;
  resourcesShared: number;
  totalDownloads: number;
  isCurator: boolean;
}
