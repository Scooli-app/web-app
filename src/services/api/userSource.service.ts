import type { UploadSourceParams, UserSource } from "@/shared/types/userSource";
import apiClient from "./client";

export async function listSources(): Promise<UserSource[]> {
  const response = await apiClient.get<UserSource[]>("/sources");
  return response.data;
}

export async function getSource(id: string): Promise<UserSource> {
  const response = await apiClient.get<UserSource>(`/sources/${id}`);
  return response.data;
}

export async function uploadSource(
  params: UploadSourceParams
): Promise<UserSource> {
  const formData = new FormData();
  formData.append("file", params.file);
  formData.append("name", params.name);
  if (params.subject) formData.append("subject", params.subject);
  if (params.schoolYear != null)
    formData.append("schoolYear", String(params.schoolYear));

  const response = await apiClient.post<UserSource>("/sources", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function deleteSource(id: string): Promise<void> {
  await apiClient.delete(`/sources/${id}`);
}
