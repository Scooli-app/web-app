import type {
  Qualification,
  TeachingProfile,
  VocationalSchoolSubject,
  VocationalUnit,
} from "@/shared/types/teaching-profile";
import apiClient from "./client";

export const teachingProfileService = {
  get: async (): Promise<TeachingProfile> => {
    const response = await apiClient.get<TeachingProfile>("/teaching-profile");
    return response.data;
  },

  save: async (profile: TeachingProfile): Promise<TeachingProfile> => {
    const response = await apiClient.put<TeachingProfile>("/teaching-profile", {
      educationType: profile.educationType,
      courses: profile.courses,
      schoolYears: profile.schoolYears,
      items: profile.items,
    });
    return response.data;
  },

  /**
   * The level-4 catalogue is 161 courses, so the server search returns
   * everything at once with an empty `q` and the client filters locally. Avoids
   * one request per keystroke.
   */
  searchQualifications: async (
    term = "",
    level = 4,
    limit = 200
  ): Promise<Qualification[]> => {
    const response = await apiClient.get<Qualification[]>(
      "/teaching-profile/qualifications",
      { params: { q: term, level, limit } }
    );
    return response.data;
  },

  getUnits: async (qualificationCode: string): Promise<VocationalUnit[]> => {
    const response = await apiClient.get<VocationalUnit[]>(
      `/teaching-profile/qualifications/${encodeURIComponent(
        qualificationCode
      )}/units`
    );
    return response.data;
  },

  /**
   * Sociocultural/científica component subjects for a course (e.g.
   * "Economia", "Psicologia e Sociologia") — mirrors `getUnits` exactly,
   * just for the other two curriculum components instead of the
   * tecnológica/UC one.
   */
  fetchSchoolSubjects: async (
    qualificationCode: string
  ): Promise<VocationalSchoolSubject[]> => {
    const response = await apiClient.get<VocationalSchoolSubject[]>(
      `/teaching-profile/qualifications/${encodeURIComponent(
        qualificationCode
      )}/subjects`
    );
    return response.data;
  },
};
