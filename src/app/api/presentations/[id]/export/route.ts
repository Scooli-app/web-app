import { auth } from "@clerk/nextjs/server";
import { chromium } from "playwright";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitizeFilename(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-_ ]+/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase() || "apresentacao"
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authContext = await auth();

  if (!authContext.userId) {
    return NextResponse.json(
      { error: "Sessão inválida para exportar a apresentação." },
      { status: 401 },
    );
  }

  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return NextResponse.json(
      { error: "Não foi possível validar a sessão de exportação." },
      { status: 401 },
    );
  }

  const filename =
    request.nextUrl.searchParams.get("title") || "apresentacao";
  const printUrl = new URL(`/presentation/${id}/print?pdf=1`, request.url);

  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1600, height: 900 },
      deviceScaleFactor: 2,
      extraHTTPHeaders: {
        cookie: cookieHeader,
      },
    });
    const page = await context.newPage();

    await page.emulateMedia({ media: "print" });
    const response = await page.goto(printUrl.toString(), {
      waitUntil: "networkidle",
    });

    if (!response || !response.ok()) {
      return NextResponse.json(
        { error: "Não foi possível preparar a versão de impressão." },
        { status: response?.status() ?? 500 },
      );
    }

    await page.evaluate(async () => {
      const images = Array.from(document.images);
      await Promise.all(
        images.map(
          (image) =>
            new Promise<void>((resolve) => {
              if (image.complete) {
                resolve();
                return;
              }

              image.addEventListener("load", () => resolve(), { once: true });
              image.addEventListener("error", () => resolve(), { once: true });
            }),
        ),
      );

      if ("fonts" in document) {
        await document.fonts.ready;
      }
    });

    const pdf = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
    });

    await context.close();

    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${sanitizeFilename(
          filename,
        )}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to export presentation PDF:", error);
    return NextResponse.json(
      { error: "Não foi possível exportar a apresentação para PDF." },
      { status: 500 },
    );
  } finally {
    await browser?.close();
  }
}
