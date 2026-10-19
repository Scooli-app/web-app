import apiClient from "./client";
import type {
  DocumentImage,
  ImportStockImageResponse,
  RegenerateDocumentImageResponse,
  StockImageFilter,
  StockImageSearchResponse,
  UploadDocumentImageResponse,
} from "@/shared/types/document";

export async function getDocumentImages(documentId: string): Promise<DocumentImage[]> {
  const response = await apiClient.get<DocumentImage[]>(`/documents/${documentId}/images`);
  return response.data.map((image) => ({
    ...image,
    status: image.status ?? "completed",
  }));
}

export async function regenerateDocumentImage(
  documentId: string,
  imageId: string,
  prompt?: string
): Promise<RegenerateDocumentImageResponse> {
  const body = prompt ? { prompt } : {};
  const response = await apiClient.post<RegenerateDocumentImageResponse>(
    `/documents/${documentId}/images/${imageId}/regenerate`,
    body
  );
  return response.data;
}

export async function deleteDocumentImage(documentId: string, imageId: string): Promise<void> {
  await apiClient.delete(`/documents/${documentId}/images/${imageId}`);
}

export async function generateDocumentImage(
  documentId: string,
  prompt: string
): Promise<RegenerateDocumentImageResponse> {
  const response = await apiClient.post<RegenerateDocumentImageResponse>(
    `/documents/${documentId}/images/generate`,
    { prompt }
  );
  return response.data;
}

export async function uploadDocumentImage(
  documentId: string,
  file: File,
  alt?: string
): Promise<UploadDocumentImageResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (alt && alt.trim().length > 0) {
    formData.append("alt", alt.trim());
  }

  const response = await apiClient.post<UploadDocumentImageResponse>(
    `/documents/${documentId}/images/upload`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
}

/** Searches the free stock image libraries; `type` narrows to one filter chip. */
export async function searchStockImages(
  documentId: string,
  query: string,
  options: { type?: StockImageFilter; page?: number; locale?: string } = {}
): Promise<StockImageSearchResponse> {
  const { type, page = 1, locale } = options;
  const response = await apiClient.get<StockImageSearchResponse>(
    `/documents/${documentId}/images/stock-search`,
    { params: { q: query, type, page, locale } }
  );
  return response.data;
}

/** Copies a stock image into the document's own image storage and returns the stored image. */
export async function importStockImage(
  documentId: string,
  imageId: string
): Promise<ImportStockImageResponse> {
  const response = await apiClient.post<ImportStockImageResponse>(
    `/documents/${documentId}/images/stock`,
    { imageId }
  );
  return response.data;
}
