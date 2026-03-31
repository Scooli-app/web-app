import { PresentationPrintDocument } from "@/components/presentation/PresentationPrintDocument";
import type { PresentationExportPayload } from "@/shared/types/presentation";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function normalizeExportPayload(
  payload: PresentationExportPayload,
): PresentationExportPayload {
  return {
    ...payload,
    title: payload.title || payload.content?.title || "Apresentação",
    themeId:
      payload.themeId || payload.content?.themeId || "scooli-dark",
    content: {
      ...payload.content,
      title: payload.content?.title || payload.title || "Apresentação",
      themeId:
        payload.content?.themeId || payload.themeId || "scooli-dark",
      slides: payload.content?.slides ?? [],
    },
    assets: payload.assets ?? [],
  };
}

async function getPresentationExportPayload(
  presentationId: string,
): Promise<PresentationExportPayload> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_API_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_BASE_API_URL não está configurada.");
  }

  const authContext = await auth();
  const template = process.env.NEXT_PUBLIC_CLERK_JWT_TEMPLATE;
  const token = await authContext.getToken(template ? { template } : undefined);

  if (!token) {
    throw new Error("Sessão inválida para carregar a apresentação.");
  }

  const response = await fetch(`${baseUrl}/presentations/${presentationId}/export`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error("Não foi possível carregar a apresentação para impressão.");
  }

  return normalizeExportPayload(
    (await response.json()) as PresentationExportPayload,
  );
}

interface PresentationPrintPageProps {
  params: Promise<{ id: string }>;
}

export default async function PresentationPrintPage({
  params,
}: PresentationPrintPageProps) {
  const { id } = await params;
  const presentation = await getPresentationExportPayload(id);

  return (
    <>
      <style>{`
        @page {
          size: 13.333in 7.5in;
          margin: 0;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #eef2f7;
        }
      `}</style>
      <div style={{ minHeight: "100vh", background: "#eef2f7" }}>
        <PresentationPrintDocument presentation={presentation} />
      </div>
    </>
  );
}
