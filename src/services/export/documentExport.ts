import apiClient from "@/services/api/client";
import type { AeOutcome, ExportFile } from "@/types/assessment";

// The shared client already throws ApiRequestError {status, code, message}; callers branch on 403/409 via `status`.
export { ApiRequestError as ExportError } from "@/services/api/client";

export async function exportDocument(id: string, format: "pdf" | "docx"): Promise<ExportFile[]> {
  const response = await apiClient.post<{ files: ExportFile[] }>(`/documents/${id}/export`, { format });
  return response.data.files;
}

export async function searchAeOutcomes(params: {
  subject?: string;
  schoolYear?: number;
  q?: string;
  ids?: string[];
}): Promise<AeOutcome[]> {
  // Backend takes repeated ?ids=a&ids=b (List<UUID>), not axios' default ids[]=.
  const response = await apiClient.get<AeOutcome[]>("/ae-outcomes", {
    params,
    paramsSerializer: { indexes: null },
  });
  return response.data;
}
