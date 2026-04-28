import apiClient from "./client";
import type {
  DocumentImage,
  RegenerateDocumentImageResponse,
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
