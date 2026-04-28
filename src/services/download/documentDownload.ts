/**
 * Document Download Service
 * Handles exporting documents to PDF and DOCX formats via API
 */

import posthog from "posthog-js";
import type { DocumentImage } from "@/shared/types/document";

export type DownloadFormat = "pdf" | "docx";

interface DownloadOptions {
  title: string;
  content: string; // Markdown content
  format: DownloadFormat;
  images: DocumentImage[];
}

/**
 * Download document by calling the server API
 */
export async function downloadDocument(
  options: DownloadOptions
): Promise<void> {
  const { title, content, format, images } = options;

  const distinctId = posthog.get_distinct_id();
  const sessionId = posthog.get_session_id();

  const response = await fetch("/api/download", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(distinctId && { "x-posthog-distinct-id": distinctId }),
      ...(sessionId && { "x-posthog-session-id": sessionId }),
    },
    body: JSON.stringify({
      title,
      content,
      format,
      images: images.map((image) => ({
        id: image.id,
        url: image.url ?? null,
        alt: image.alt,
        status: image.status ?? "completed",
        contentType: image.contentType ?? null,
        placeholderToken: image.placeholderToken ?? null,
      })),
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Falha ao gerar documento");
  }

  // Get the blob and download it
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  // Create download link
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title
    .replace(/[^a-zA-Z0-9áàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s-_]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 100)}.${format === "pdf" ? "pdf" : "docx"}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Clean up the URL
  URL.revokeObjectURL(url);
}


