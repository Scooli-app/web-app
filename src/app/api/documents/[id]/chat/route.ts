import { LESSON_PLAN_PROMPTS } from "@/lib/prompts/lesson-plan-prompts";
import { TEST_QUIZ_PROMPTS } from "@/lib/prompts/test-quiz-prompts";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import OpenAI from "openai";

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to get prompts based on document type
function getPromptsForDocumentType(documentType: string) {
  switch (documentType) {
    case "test":
    case "quiz":
      return TEST_QUIZ_PROMPTS;
    case "lesson_plan":
    default:
      return LESSON_PLAN_PROMPTS;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params to get the id
    const { id } = await params;

    // Check environment variables
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      return NextResponse.json(
        { error: "Supabase configuration missing" },
        { status: 500 }
      );
    }

    const { message, currentContent = "" } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Get document
    const { data: document, error: documentError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .single();

    if (documentError || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Get appropriate prompts based on document type
    const prompts = getPromptsForDocumentType(document.document_type);

    // Build the prompt based on the user message
    const prompt = prompts.CHAT_PROMPT(currentContent, message);

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: prompts.SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const responseContent = completion.choices[0]?.message?.content;

    if (!responseContent) {
      return NextResponse.json(
        { error: "No response from OpenAI" },
        { status: 500 }
      );
    }

    // Try to parse JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseContent);
    } catch (_error) {
      console.error("Failed to parse JSON response:", responseContent);
      return NextResponse.json(
        {
          chatAnswer:
            "Desculpe, houve um erro ao processar a resposta. Tente novamente.",
          generatedContent: null,
        },
        { status: 200 }
      );
    }

    // Update document content if generatedContent is provided
    if (parsedResponse.generatedContent) {
      const { error: updateError } = await supabase
        .from("documents")
        .update({ content: parsedResponse.generatedContent })
        .eq("id", id);

      if (updateError) {
        console.error("Failed to update document:", updateError);
      }
    }

    return NextResponse.json({
      chatAnswer: parsedResponse.chatAnswer || null,
      generatedContent: parsedResponse.generatedContent || null,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
