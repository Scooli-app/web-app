import {
  RAG_CONFIG,
  ERROR_MESSAGES,
  UI_CONFIG,
} from "@/shared/config/constants";
import { PromptBuilder, RAG_PROMPTS } from "@/shared/prompts/rag-prompts";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

interface CurriculumChunk {
  content: string;
  document_name: string;
}

export class RagService {
  private supabase: ReturnType<typeof createClient>;
  private openai: OpenAI;

  constructor() {
    if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
      throw new Error("Missing environment variables for RAG service");
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    this.openai = new OpenAI({ apiKey: openaiApiKey });
  }

  /**
   * Generates embedding for a question
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: RAG_CONFIG.EMBEDDING_MODEL,
      input: text,
    });
    return response.data[0].embedding;
  }

  /**
   * Finds similar curriculum chunks
   */
  private async findSimilarChunks(
    embedding: number[]
  ): Promise<CurriculumChunk[]> {
    const { data, error } = await this.supabase.rpc("match_curriculum_chunks", {
      query_embedding: embedding,
      match_threshold: RAG_CONFIG.MATCH_THRESHOLD,
      match_count: RAG_CONFIG.MATCH_COUNT,
    });

    if (error) {
      throw new Error(`Error matching chunks: ${error.message}`);
    }

    return (data as CurriculumChunk[]) || [];
  }

  /**
   * Creates streaming response for RAG query
   */
  async createStreamingResponse(question: string): Promise<Response> {
    try {
      // Generate embedding
      const embedding = await this.generateEmbedding(question);

      // Find similar chunks
      const matchedChunks = await this.findSimilarChunks(embedding);

      if (matchedChunks.length === 0) {
        throw new Error(RAG_PROMPTS.NO_INFO_FOUND);
      }

      // Build context
      const context = matchedChunks.map((chunk) => chunk.content).join("\n\n");

      // Create prompt using the prompt builder
      const prompt = PromptBuilder.buildRagQuery(context, question);

      // Create streaming response
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        start: (controller) => {
          // Use an immediately invoked async function
          (async () => {
            try {
              const stream = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                  {
                    role: "system",
                    content: PromptBuilder.getSystemPrompt(),
                  },
                  {
                    role: "user",
                    content: prompt,
                  },
                ],
                stream: true,
                temperature: RAG_CONFIG.TEMPERATURE,
                max_tokens: RAG_CONFIG.MAX_TOKENS,
              });

              // Send initial data
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "start",
                    sources: matchedChunks.map((chunk) => chunk.document_name),
                  })}\n\n`
                )
              );

              // Process stream
              for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content;
                if (content) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        type: "token",
                        content: content,
                      })}\n\n`
                    )
                  );
                }
              }

              // Send final data
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "end",
                    sources: matchedChunks.map((chunk) => chunk.document_name),
                  })}\n\n`
                )
              );

              controller.close();
            } catch (error) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "error",
                    error: "Erro ao gerar resposta",
                    message:
                      error instanceof Error
                        ? error.message
                        : "Erro desconhecido",
                  })}\n\n`
                )
              );
              controller.close();
            }
          })();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } catch (error) {
      console.error("RAG Service Error:", error);
      throw error;
    }
  }
}

/**
 * Utility functions for RAG operations
 */

export interface StreamResponse {
  type: "start" | "token" | "end" | "error";
  content?: string;
  sources?: string[];
  error?: string;
  message?: string;
}

export interface RagQueryParams {
  question: string;
}

export interface RagError {
  message: string;
  status?: number;
}

/**
 * Processes Server-Sent Events stream from RAG API
 */
export async function processRagStream(
  response: Response,
  onStart: (sources: string[]) => void,
  onToken: (content: string) => void,
  onEnd: () => void,
  onError: (error: string) => void
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error(ERROR_MESSAGES.STREAM_ERROR);
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data: StreamResponse = JSON.parse(line.slice(6));

            switch (data.type) {
              case "start":
                onStart(data.sources || []);
                break;
              case "token":
                if (data.content) {
                  onToken(data.content);
                }
                break;
              case "end":
                onEnd();
                break;
              case "error":
                onError(
                  data.error || data.message || ERROR_MESSAGES.UNKNOWN_ERROR
                );
                break;
            }
          } catch (e) {
            console.error("Erro ao processar stream:", e);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Sends RAG query to API
 */
export async function sendRagQuery(question: string): Promise<Response> {
  const response = await fetch("/api/rag-query", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || ERROR_MESSAGES.PROCESSING_ERROR);
  }

  return response;
}

/**
 * Validates question input
 */
export function validateQuestion(question: string): string | null {
  if (!question || question.trim().length === 0) {
    return ERROR_MESSAGES.QUESTION_REQUIRED;
  }

  if (question.trim().length < UI_CONFIG.MIN_QUESTION_LENGTH) {
    return ERROR_MESSAGES.QUESTION_TOO_SHORT;
  }

  if (question.trim().length > UI_CONFIG.MAX_QUESTION_LENGTH) {
    return ERROR_MESSAGES.QUESTION_TOO_LONG;
  }

  return null;
}
