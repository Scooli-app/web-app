import { RagService } from "@/backend/services/rag/rag.service";
import { NextResponse } from "next/server";

/**
 * API endpoint para consultas RAG com streaming
 */
export async function POST(req: Request) {
  try {
    const { question } = await req.json();

    if (!question || question.trim().length === 0) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    const ragService = new RagService();
    return await ragService.createStreamingResponse(question);
  } catch (error) {
    console.error("RAG Query Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
