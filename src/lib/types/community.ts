/**
 * Community and creator types
 */

export interface CommunityResource {
  id: string;
  title: string;
  description: string;
  type: "lesson_plan" | "presentation" | "test" | "quiz" | "activity";
  subject: string;
  grade_level: string;
  downloads: number;
  rating: number;
  user: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  created_at: string;
}

export type CreatorTier = "iniciante" | "bronze" | "prata" | "ouro" | "platina";

export interface CreatorProfile {
  id: string;
  user_id: string;
  tier: CreatorTier;
  xp: number;
  resources_shared: number;
  total_downloads: number;
  is_curator: boolean;
}
