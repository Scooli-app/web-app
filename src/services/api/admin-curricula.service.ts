import apiClient from "./client";

export interface CurriculumJurisdiction {
  code: string;
  name: string;
  kind: string;
  parentCode: string | null;
}

export interface CurriculumVersion {
  label: string;
  state: string;
  validFrom: string | null;
  loadedAt: string | null;
  items: number;
  license: string | null;
}

export interface CurriculumFramework {
  key: string;
  title: string;
  status: string | null;
  authority: string | null;
  jurisdictions: string[];
  versions: CurriculumVersion[];
}

export interface CurriculumRun {
  id: number;
  adapter: string;
  source: string | null;
  frameworkKey: string | null;
  versionLabel: string | null;
  outcome: string;
  message: string | null;
  items: number | null;
  startedAt: string | null;
}

export interface CurriculaOverview {
  jurisdictions: CurriculumJurisdiction[];
  frameworks: CurriculumFramework[];
  runs: CurriculumRun[];
}

export const adminCurriculaService = {
  /** Loaded curricula, their jurisdictions and the latest ETL runs (GET /admin/curricula, admins only). */
  async getOverview(): Promise<CurriculaOverview> {
    const response = await apiClient.get<CurriculaOverview>("/admin/curricula");
    return response.data;
  },
};
