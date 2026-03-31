import apiClient from "./client";
import type {
  CreatePresentationParams,
  PresentationAsset,
  PresentationRecord,
  PresentationSummary,
  UpdatePresentationParams,
} from "@/shared/types/presentation";

interface BackendPaginatedResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

function normalizePresentationAsset(asset: PresentationAsset): PresentationAsset {
  return {
    ...asset,
    url: asset.url ?? "",
  };
}

function normalizePresentation(record: PresentationRecord): PresentationRecord {
  return {
    ...record,
    themeId: record.content?.themeId ?? record.themeId,
    content: {
      ...record.content,
      title: record.content?.title ?? record.title,
      themeId: record.content?.themeId ?? record.themeId,
      slides: record.content?.slides ?? [],
    },
    assets: (record.assets ?? []).map(normalizePresentationAsset),
  };
}

export async function getPresentationSummaries(
  page = 1,
  limit = 12,
): Promise<{
  items: PresentationSummary[];
  pagination: { page: number; limit: number; total: number; hasMore: boolean };
}> {
  const response = await apiClient.get<BackendPaginatedResponse<PresentationSummary>>(
    `/presentations?page=${Math.max(page - 1, 0)}&size=${limit}`,
  );

  return {
    items: response.data.items ?? [],
    pagination: {
      page: (response.data.page ?? 0) + 1,
      limit: response.data.size ?? limit,
      total: response.data.totalItems ?? 0,
      hasMore: response.data.hasNext ?? false,
    },
  };
}

export async function createPresentation(
  payload: CreatePresentationParams,
): Promise<PresentationRecord> {
  const response = await apiClient.post<PresentationRecord>(
    "/presentations",
    payload,
  );
  return normalizePresentation(response.data);
}

export async function getPresentation(id: string): Promise<PresentationRecord> {
  const response = await apiClient.get<PresentationRecord>(`/presentations/${id}`);
  return normalizePresentation(response.data);
}

export async function updatePresentation(
  id: string,
  payload: UpdatePresentationParams,
): Promise<PresentationRecord> {
  const response = await apiClient.put<PresentationRecord>(
    `/presentations/${id}`,
    payload,
  );
  return normalizePresentation(response.data);
}

export async function uploadPresentationAsset(
  presentationId: string,
  file: File,
  alt?: string,
): Promise<PresentationAsset> {
  const formData = new FormData();
  formData.append("file", file);
  if (alt && alt.trim()) {
    formData.append("alt", alt.trim());
  }

  const response = await apiClient.post<PresentationAsset>(
    `/presentations/${presentationId}/assets/upload`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return normalizePresentationAsset(response.data);
}

export async function downloadPresentationPdf(
  presentationId: string,
  fallbackTitle: string,
): Promise<void> {
  const response = await fetch(
    `/api/presentations/${presentationId}/export?title=${encodeURIComponent(
      fallbackTitle || "apresentacao",
    )}`,
    {
      method: "POST",
    },
  );

  if (!response.ok) {
    throw new Error("Não foi possível exportar a apresentação.");
  }

  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = `${fallbackTitle || "apresentacao"}.pdf`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(objectUrl);
}
