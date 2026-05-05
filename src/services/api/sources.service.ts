import type { UploadSourceParams, UserSource } from "@/shared/types/sources";
import apiClient from "./client";

export async function listSources(): Promise<UserSource[]> {
  const response = await apiClient.get<UserSource[]>("/sources");
  return response.data;
}

export async function getSource(id: string): Promise<UserSource> {
  const response = await apiClient.get<UserSource>(`/sources/${id}`);
  return response.data;
}

export async function uploadSource(params: UploadSourceParams): Promise<UserSource> {
  const formData = new FormData();
  formData.append("file", params.file);
  formData.append("name", params.name);
  if (params.subject) formData.append("subject", params.subject);
  if (params.schoolYear !== undefined) formData.append("schoolYear", String(params.schoolYear));
  formData.append("scope", params.scope ?? "personal");

  const response = await apiClient.post<UserSource>("/sources", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function deleteSource(id: string): Promise<void> {
  await apiClient.delete(`/sources/${id}`);
}

export function subscribeToSourceIngestion(
  sourceId: string,
  authToken: string,
  onUpdate: (source: UserSource) => void,
  onDone: () => void,
  onError: (error: string) => void
): () => void {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_API_URL ?? "";
  const url = `${baseUrl}/sources/${sourceId}/stream`;
  const abortController = new AbortController();

  (async () => {
    const { fetchEventSource } = await import("@microsoft/fetch-event-source");
    await fetchEventSource(url, {
      signal: abortController.signal,
      headers: { Authorization: `Bearer ${authToken}` },
      async onopen(res) {
        if (!res.ok) throw new Error(`SSE open failed: ${res.status}`);
      },
      onmessage(event) {
        try {
          const parsed = JSON.parse(event.data) as {
            type: string;
            source?: UserSource;
            message?: string;
          };
          if (parsed.type === "done") {
            if (parsed.source) onUpdate(parsed.source);
            onDone();
            abortController.abort();
          } else if (parsed.type === "error") {
            onError(parsed.message ?? "Erro de ingestão");
            abortController.abort();
          } else if (parsed.source) {
            onUpdate(parsed.source);
          }
        } catch {
          // ignore parse errors
        }
      },
      onerror(err) {
        onError("Erro de ligação ao stream");
        throw err;
      },
    });
  })();

  return () => abortController.abort();
}
