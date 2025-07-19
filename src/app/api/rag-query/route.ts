import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;
const EMBEDDING_MODEL = "text-embedding-3-small";

/**
 * API endpoint para consultas RAG com streaming
 */
export async function POST(req: Request) {
  if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
    return NextResponse.json(
      { error: "Missing environment variables" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const openai = new OpenAI({ apiKey: openaiApiKey });

  try {
    const { question } = await req.json();

    if (!question || question.trim().length === 0) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    // Gerar embedding para a pergunta
    const questionEmbedding = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: question,
    });

    // Buscar chunks similares
    const { data: matchedChunks, error: matchError } = await supabase.rpc(
      "match_curriculum_chunks",
      {
        query_embedding: questionEmbedding.data[0].embedding,
        match_threshold: 0.5,
        match_count: 5,
      }
    );

    if (matchError) {
      return NextResponse.json(
        { error: `Error matching chunks: ${matchError.message}` },
        { status: 500 }
      );
    }

    if (!matchedChunks || matchedChunks.length === 0) {
      return NextResponse.json(
        { error: "No relevant information found" },
        { status: 404 }
      );
    }

    // Construir contexto com chunks encontrados
    const context = matchedChunks
      .map((chunk: { content: string; document_name: string }) => chunk.content)
      .join("\n\n");

    // Criar prompt para o modelo
    const prompt = `Com base no seguinte contexto do currículo português, responde à pergunta de forma clara e detalhada. Se a informação não estiver no contexto, diz que não tens informação suficiente.

Contexto:
${context}

Pergunta: ${question}

Resposta:`;

    // Configurar streaming
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const stream = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
              {
                role: "system",
                content:
                  "És um assistente especializado no currículo português. Responde sempre em português de forma clara e pedagógica.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            stream: true,
            temperature: 0.7,
            max_tokens: 1000,
          });

          // Enviar dados iniciais
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "start",
                sources: matchedChunks.map(
                  (chunk: { content: string; document_name: string }) =>
                    chunk.document_name
                ),
              })}\n\n`
            )
          );

          // Processar stream
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

          // Enviar dados finais
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "end",
                sources: matchedChunks.map(
                  (chunk: { content: string; document_name: string }) =>
                    chunk.document_name
                ),
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
                message: error,
              })}\n\n`
            )
          );
          controller.close();
        }
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
    console.error("RAG Query Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
