import type {
  SchoolSource,
  SchoolSourcePatch,
  SchoolSourceQuota,
  UploadSchoolSourceParams,
} from "@/shared/types/sources";
import apiClient from "./client";

const BASE = "/organizations/current/sources";

export async function listSchoolSources(): Promise<SchoolSource[]> {
  const response = await apiClient.get<SchoolSource[]>(BASE);
  return response.data;
}

export async function uploadSchoolSource(params: UploadSchoolSourceParams): Promise<SchoolSource> {
  const formData = new FormData();
  formData.append("file", params.file);
  formData.append("name", params.name);
  formData.append("type", params.type);
  params.subjects.forEach((s) => formData.append("subjects", s));
  params.schoolYears.forEach((y) => formData.append("schoolYears", String(y)));
  formData.append("defaultEnabled", String(params.defaultEnabled));

  const response = await apiClient.post<SchoolSource>(BASE, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function updateSchoolSource(
  id: string,
  patch: SchoolSourcePatch
): Promise<SchoolSource> {
  const response = await apiClient.patch<SchoolSource>(`${BASE}/${id}`, patch);
  return response.data;
}

export async function deleteSchoolSource(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

export async function getSchoolSourceQuota(): Promise<SchoolSourceQuota> {
  const response = await apiClient.get<SchoolSourceQuota>(`${BASE}/quota`);
  return response.data;
}
