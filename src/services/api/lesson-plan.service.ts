import { supabase } from "./client";
import type { LessonPlan, LessonPlanForm, PaginatedResponse } from "@/types";

export interface CreateLessonPlanData extends LessonPlanForm {
  user_id: string;
}

export interface UpdateLessonPlanData extends Partial<LessonPlanForm> {
  id: string;
}

export interface LessonPlanFilters {
  query?: string;
  subject?: string;
  grade_level?: string;
  duration_min?: number;
  duration_max?: number;
  user_id?: string;
}

export class LessonPlanService {
  // Get lesson plans with pagination and filters
  static async getLessonPlans(
    page: number = 1,
    limit: number = 10,
    filters?: LessonPlanFilters
  ): Promise<PaginatedResponse<LessonPlan>> {
    try {
      let query = supabase.from("lesson_plans").select("*", { count: "exact" });

      // Apply filters
      if (filters?.query) {
        query = query.or(
          `title.ilike.%${filters.query}%,content.ilike.%${filters.query}%`
        );
      }
      if (filters?.subject) {
        query = query.eq("subject", filters.subject);
      }
      if (filters?.grade_level) {
        query = query.eq("grade_level", filters.grade_level);
      }
      if (filters?.duration_min) {
        query = query.gte("duration", filters.duration_min);
      }
      if (filters?.duration_max) {
        query = query.lte("duration", filters.duration_max);
      }
      if (filters?.user_id) {
        query = query.eq("user_id", filters.user_id);
      }

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to).order("created_at", { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      return {
        data: data as LessonPlan[],
        total: count || 0,
        page,
        limit,
        hasMore: (count || 0) > page * limit,
      };
    } catch (error) {
      console.error("Error fetching lesson plans:", error);
      return {
        data: [],
        total: 0,
        page,
        limit,
        hasMore: false,
      };
    }
  }

  // Get a single lesson plan by ID
  static async getLessonPlan(id: string): Promise<LessonPlan | null> {
    try {
      const { data, error } = await supabase
        .from("lesson_plans")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        throw error;
      }

      return data as LessonPlan;
    } catch (error) {
      console.error("Error fetching lesson plan:", error);
      return null;
    }
  }

  // Create a new lesson plan
  static async createLessonPlan(
    data: CreateLessonPlanData
  ): Promise<{ lessonPlan?: LessonPlan; error?: string }> {
    try {
      const { data: lessonPlan, error } = await supabase
        .from("lesson_plans")
        .insert({
          ...data,
          activities: [], // Initialize empty activities array
          assessment: "", // Initialize empty assessment
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return { lessonPlan: lessonPlan as LessonPlan };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create lesson plan",
      };
    }
  }

  // Update a lesson plan
  static async updateLessonPlan(
    data: UpdateLessonPlanData
  ): Promise<{ lessonPlan?: LessonPlan; error?: string }> {
    try {
      const { id, ...updates } = data;
      const { data: lessonPlan, error } = await supabase
        .from("lesson_plans")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return { lessonPlan: lessonPlan as LessonPlan };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update lesson plan",
      };
    }
  }

  // Delete a lesson plan
  static async deleteLessonPlan(id: string): Promise<{ error?: string }> {
    try {
      const { error } = await supabase
        .from("lesson_plans")
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }

      return {};
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete lesson plan",
      };
    }
  }

  // Add activity to lesson plan
  static async addActivity(
    lessonPlanId: string,
    activity: Omit<LessonPlan["activities"][0], "id">
  ): Promise<{ error?: string }> {
    try {
      const lessonPlan = await this.getLessonPlan(lessonPlanId);
      if (!lessonPlan) {
        throw new Error("Lesson plan not found");
      }

      const newActivity = {
        ...activity,
        id: crypto.randomUUID(),
      };

      const updatedActivities = [...lessonPlan.activities, newActivity];

      const { error } = await supabase
        .from("lesson_plans")
        .update({ activities: updatedActivities })
        .eq("id", lessonPlanId);

      if (error) {
        throw error;
      }

      return {};
    } catch (error) {
      return {
        error:
          error instanceof Error ? error.message : "Failed to add activity",
      };
    }
  }

  // Update activity in lesson plan
  static async updateActivity(
    lessonPlanId: string,
    activityId: string,
    updates: Partial<LessonPlan["activities"][0]>
  ): Promise<{ error?: string }> {
    try {
      const lessonPlan = await this.getLessonPlan(lessonPlanId);
      if (!lessonPlan) {
        throw new Error("Lesson plan not found");
      }

      const updatedActivities = lessonPlan.activities.map((activity) =>
        activity.id === activityId ? { ...activity, ...updates } : activity
      );

      const { error } = await supabase
        .from("lesson_plans")
        .update({ activities: updatedActivities })
        .eq("id", lessonPlanId);

      if (error) {
        throw error;
      }

      return {};
    } catch (error) {
      return {
        error:
          error instanceof Error ? error.message : "Failed to update activity",
      };
    }
  }

  // Delete activity from lesson plan
  static async deleteActivity(
    lessonPlanId: string,
    activityId: string
  ): Promise<{ error?: string }> {
    try {
      const lessonPlan = await this.getLessonPlan(lessonPlanId);
      if (!lessonPlan) {
        throw new Error("Lesson plan not found");
      }

      const updatedActivities = lessonPlan.activities.filter(
        (activity) => activity.id !== activityId
      );

      const { error } = await supabase
        .from("lesson_plans")
        .update({ activities: updatedActivities })
        .eq("id", lessonPlanId);

      if (error) {
        throw error;
      }

      return {};
    } catch (error) {
      return {
        error:
          error instanceof Error ? error.message : "Failed to delete activity",
      };
    }
  }

  // Get user's lesson plans
  static async getUserLessonPlans(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<LessonPlan>> {
    return this.getLessonPlans(page, limit, { user_id: userId });
  }

  // Generate lesson plan with AI
  static async generateLessonPlan(
    prompt: string,
    userId: string
  ): Promise<{ lessonPlan?: LessonPlan; error?: string }> {
    try {
      const response = await fetch("/api/lesson-plan/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, userId }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate lesson plan");
      }

      const data = await response.json();
      return { lessonPlan: data.lessonPlan };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate lesson plan",
      };
    }
  }
}
