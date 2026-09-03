import type {
  Qualification,
  TeachingProfile,
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
      items: profile.items,
    });
    return response.data;
  },

  /**
   * O catálogo de nível 4 são 161 cursos, pelo que a pesquisa do servidor
   * devolve tudo de uma vez com `q` vazio e o cliente filtra localmente. Evita
   * uma chamada por tecla.
   */
  searchQualifications: async (
    term = "",
    nivel = 4,
    limit = 200
  ): Promise<Qualification[]> => {
    const response = await apiClient.get<Qualification[]>(
      "/teaching-profile/qualifications",
      { params: { q: term, nivel, limit } }
    );
    return response.data;
  },

  getUnits: async (qualificationCodigo: string): Promise<VocationalUnit[]> => {
    const response = await apiClient.get<VocationalUnit[]>(
      `/teaching-profile/qualifications/${encodeURIComponent(
        qualificationCodigo
      )}/units`
    );
    return response.data;
  },
};
