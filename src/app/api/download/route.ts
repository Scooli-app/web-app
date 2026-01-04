import { type NextRequest, NextResponse } from "next/server";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from "docx";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

type DownloadFormat = "pdf" | "docx";

interface DownloadRequestBody {
  title: string;
  content: string;
  format: DownloadFormat;
}

/**
 * Parse inline markdown formatting (bold, italic, code)
 */
function parseInlineFormatting(
  text: string,
  baseSize: number = 22
): InstanceType<typeof TextRun>[] {
  const runs: InstanceType<typeof TextRun>[] = [];
  let remaining = text;
  let match;

  while (remaining.length > 0) {
    if ((match = remaining.match(/^\*\*(.+?)\*\*/))) {
      runs.push(new TextRun({ text: match[1], bold: true, size: baseSize }));
      remaining = remaining.substring(match[0].length);
      continue;
    }

    if ((match = remaining.match(/^[\*_](.+?)[\*_]/))) {
      runs.push(new TextRun({ text: match[1], italics: true, size: baseSize }));
      remaining = remaining.substring(match[0].length);
      continue;
    }

    if ((match = remaining.match(/^`(.+?)`/))) {
      runs.push(
        new TextRun({
          text: match[1],
          font: "Courier New",
          size: baseSize - 2,
        })
      );
      remaining = remaining.substring(match[0].length);
      continue;
    }

    const nextSpecial = remaining.search(/[\*_`]/);
    if (nextSpecial === -1) {
      runs.push(new TextRun({ text: remaining, size: baseSize }));
      break;
    } else if (nextSpecial > 0) {
      runs.push(
        new TextRun({
          text: remaining.substring(0, nextSpecial),
          size: baseSize,
        })
      );
      remaining = remaining.substring(nextSpecial);
    } else {
      runs.push(new TextRun({ text: remaining[0], size: baseSize }));
      remaining = remaining.substring(1);
    }
  }

  return runs.length > 0 ? runs : [new TextRun({ text, size: baseSize })];
}

/**
 * Generate DOCX buffer from markdown content
 */
async function generateDocx(content: string): Promise<Buffer> {
  const lines = content.split("\n");
  const children: InstanceType<typeof Paragraph>[] = [];

  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let isFirstH1 = true;

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: codeBlockContent.join("\n"),
                font: "Courier New",
                size: 20,
              }),
            ],
            shading: { fill: "F4F5F8" },
            spacing: { before: 200, after: 200 },
          })
        );
        codeBlockContent = [];
      }
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    if (line.startsWith("# ")) {
      if (isFirstH1) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line.substring(2),
                bold: true,
                size: 48,
                color: "0B0D17",
              }),
            ],
            heading: HeadingLevel.TITLE,
            spacing: { after: 120 },
          })
        );
        children.push(
          new Paragraph({
            border: {
              bottom: {
                color: "6753FF",
                size: 24,
                style: BorderStyle.SINGLE,
                space: 1,
              },
            },
            spacing: { after: 400 },
          })
        );
        isFirstH1 = false;
      } else {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line.substring(2),
                bold: true,
                size: 36,
                color: "0B0D17",
              }),
            ],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          })
        );
      }
      continue;
    }

    if (line.startsWith("## ")) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.substring(3),
              bold: true,
              size: 28,
              color: "0B0D17",
            }),
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 },
        })
      );
      continue;
    }

    if (line.startsWith("### ")) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.substring(4),
              bold: true,
              size: 24,
              color: "2E2F38",
            }),
          ],
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        })
      );
      continue;
    }

    if (line.match(/^[\*\-]\s/)) {
      const text = line.replace(/^[\*\-]\s/, "");
      children.push(
        new Paragraph({
          children: parseInlineFormatting(text, 22),
          bullet: { level: 0 },
          spacing: { after: 80 },
        })
      );
      continue;
    }

    if (line.match(/^\d+\.\s/)) {
      const text = line.replace(/^\d+\.\s/, "");
      children.push(
        new Paragraph({
          children: parseInlineFormatting(text, 22),
          numbering: { reference: "default-numbering", level: 0 },
          spacing: { after: 80 },
        })
      );
      continue;
    }

    if (line.startsWith("> ")) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.substring(2),
              italics: true,
              size: 22,
              color: "6C6F80",
            }),
          ],
          indent: { left: 720 },
          border: {
            left: {
              color: "6753FF",
              size: 18,
              style: BorderStyle.SINGLE,
              space: 10,
            },
          },
          spacing: { before: 200, after: 200 },
        })
      );
      continue;
    }

    if (line.trim() === "") {
      children.push(new Paragraph({ children: [], spacing: { after: 120 } }));
      continue;
    }

    children.push(
      new Paragraph({
        children: parseInlineFormatting(line, 22),
        spacing: { after: 160, line: 276 },
      })
    );
  }

  // Footer
  children.push(new Paragraph({ children: [], spacing: { before: 600 } }));
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Gerado por Scooli - ${new Date().toLocaleDateString("pt-PT")}`,
          size: 18,
          color: "6C6F80",
        }),
      ],
      border: {
        top: {
          color: "E4E4E7",
          size: 6,
          style: BorderStyle.SINGLE,
          space: 10,
        },
      },
    })
  );

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22 },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: "default-numbering",
          levels: [
            {
              level: 0,
              format: "decimal" as const,
              text: "%1.",
              alignment: AlignmentType.START,
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

/**
 * Parse markdown to text lines for PDF
 */
interface TextLine {
  text: string;
  type:
    | "title"
    | "h1"
    | "h2"
    | "h3"
    | "paragraph"
    | "bullet"
    | "numbered"
    | "quote"
    | "empty";
  indent?: number;
}

function parseMarkdownToLines(content: string): TextLine[] {
  const lines: TextLine[] = [];
  const contentLines = content.split("\n");
  let inCodeBlock = false;
  let isFirstH1 = true;

  for (const line of contentLines) {
    if (line.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      lines.push({ text: line, type: "paragraph", indent: 1 });
      continue;
    }

    const cleanText = line
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/_(.+?)_/g, "$1")
      .replace(/`(.+?)`/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

    if (line.startsWith("# ")) {
      if (isFirstH1) {
        lines.push({ text: cleanText.substring(2), type: "title" });
        isFirstH1 = false;
      } else {
        lines.push({ text: cleanText.substring(2), type: "h1" });
      }
      continue;
    }
    if (line.startsWith("## ")) {
      lines.push({ text: cleanText.substring(3), type: "h2" });
      continue;
    }
    if (line.startsWith("### ")) {
      lines.push({ text: cleanText.substring(4), type: "h3" });
      continue;
    }

    if (line.match(/^[\*\-]\s/)) {
      lines.push({
        text: `• ${cleanText.replace(/^[\*\-]\s/, "")}`,
        type: "bullet",
      });
      continue;
    }

    if (line.match(/^\d+\.\s/)) {
      lines.push({ text: cleanText, type: "numbered" });
      continue;
    }

    if (line.startsWith("> ")) {
      lines.push({ text: cleanText.substring(2), type: "quote" });
      continue;
    }

    if (line.trim() === "") {
      lines.push({ text: "", type: "empty" });
      continue;
    }

    lines.push({ text: cleanText, type: "paragraph" });
  }

  return lines;
}

/**
 * Generate PDF buffer from markdown content
 */
async function generatePdf(content: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(
    StandardFonts.HelveticaOblique
  );

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 50;
  const contentWidth = pageWidth - 2 * margin;

  const fontSizes = {
    title: 24,
    h1: 18,
    h2: 16,
    h3: 14,
    paragraph: 11,
    bullet: 11,
    numbered: 11,
    quote: 11,
    empty: 11,
  };

  const lineHeights = {
    title: 32,
    h1: 28,
    h2: 24,
    h3: 20,
    paragraph: 16,
    bullet: 16,
    numbered: 16,
    quote: 16,
    empty: 12,
  };

  const colors = {
    title: rgb(0.04, 0.05, 0.09),
    h1: rgb(0.04, 0.05, 0.09),
    h2: rgb(0.04, 0.05, 0.09),
    h3: rgb(0.18, 0.18, 0.22),
    paragraph: rgb(0.18, 0.18, 0.22),
    bullet: rgb(0.18, 0.18, 0.22),
    numbered: rgb(0.18, 0.18, 0.22),
    quote: rgb(0.42, 0.43, 0.5),
    empty: rgb(0, 0, 0),
  };

  const textLines = parseMarkdownToLines(content);
  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let yPosition = pageHeight - margin;

  function wrapText(
    text: string,
    maxWidth: number,
    font: typeof helvetica,
    fontSize: number
  ): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
    return lines.length > 0 ? lines : [""];
  }

  for (const line of textLines) {
    const fontSize = fontSizes[line.type];
    const lineHeight = lineHeights[line.type];
    const color = colors[line.type];

    let font = helvetica;
    if (["title", "h1", "h2", "h3"].includes(line.type)) {
      font = helveticaBold;
    } else if (line.type === "quote") {
      font = helveticaOblique;
    }

    const indent =
      line.type === "bullet" || line.type === "numbered"
        ? 20
        : line.type === "quote"
        ? 30
        : (line.indent || 0) * 20;

    if (line.type === "empty" || !line.text.trim()) {
      yPosition -= lineHeight;
      if (yPosition < margin) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        yPosition = pageHeight - margin;
      }
      continue;
    }

    const wrappedLines = wrapText(
      line.text,
      contentWidth - indent,
      font,
      fontSize
    );

    if (["h1", "h2", "h3"].includes(line.type)) {
      yPosition -= 10;
    }

    for (const wrappedLine of wrappedLines) {
      if (yPosition < margin + lineHeight) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        yPosition = pageHeight - margin;
      }

      currentPage.drawText(wrappedLine, {
        x: margin + indent,
        y: yPosition,
        size: fontSize,
        font,
        color,
      });

      yPosition -= lineHeight;
    }

    if (line.type === "title") {
      currentPage.drawLine({
        start: { x: margin, y: yPosition + 8 },
        end: { x: margin + 150, y: yPosition + 8 },
        thickness: 2,
        color: rgb(0.4, 0.33, 1),
      });
      yPosition -= 15;
    }
  }

  const pages = pdfDoc.getPages();
  const footerText = `Gerado por Scooli - ${new Date().toLocaleDateString(
    "pt-PT"
  )}`;

  for (const page of pages) {
    page.drawText(footerText, {
      x: margin,
      y: 25,
      size: 9,
      font: helvetica,
      color: rgb(0.42, 0.43, 0.5),
    });
  }

  return (await pdfDoc.save()) as Uint8Array;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: DownloadRequestBody = await request.json();
    const { title, content, format } = body;

    if (!title || !content || !format) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const sanitizedTitle = title
      .replace(/[^a-zA-Z0-9áàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s-_]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 100);

    if (format === "pdf") {
      const pdfBytes = (await generatePdf(content)) as Uint8Array;
      return new NextResponse(pdfBytes.buffer as BodyInit, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${sanitizedTitle}.pdf"`,
        },
      });
    } else if (format === "docx") {
      const docxBuffer = (await generateDocx(content)) as Buffer;
      return new NextResponse(docxBuffer.buffer as BodyInit, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${sanitizedTitle}.docx"`,
        },
      });
    } else {
      return NextResponse.json(
        { error: "Unsupported format" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: "Failed to generate document" },
      { status: 500 }
    );
  }
}
