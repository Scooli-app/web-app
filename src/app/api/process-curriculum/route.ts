import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import pdf from "pdf-parse";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;
const BUCKET_NAME = "curriculum-documents";
const EMBEDDING_MODEL = "text-embedding-ada-002";

/**
 * Divide o texto em chunks de um tamanho aproximado, tentando respeitar parágrafos.
 */
function chunkText(text: string, chunkSize = 1500): string[] {
  const chunks: string[] = [];
  let currentChunk = "";

  const paragraphs = text.split(/\n\s*\n/);

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length + 2 > chunkSize) {
      if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = "";
    }
    currentChunk += `${paragraph}\n\n`;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

export async function POST(req: Request) {
  // ** SEGURANÇA **
  // Protege a rota de API para que só possa ser acionada com uma chave secreta.
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CURRICULUM_PROCESSING_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
    return NextResponse.json(
      { error: "Missing Supabase or OpenAI environment variables." },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const openai = new OpenAI({ apiKey: openaiApiKey });

  const logs: string[] = [];

  try {
    logs.push("Iniciando o processamento dos PDFs do currículo...");

    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list();

    if (listError) {
      throw new Error(
        `Erro ao listar ficheiros do bucket: ${listError.message}`
      );
    }
    if (!files || files.length === 0) {
      logs.push("Nenhum ficheiro encontrado no bucket. A sair.");
      return NextResponse.json({ success: true, logs });
    }

    logs.push(`Encontrados ${files.length} ficheiros para processar.`);

    for (const file of files) {
      const documentName = file.name;
      logs.push(`--- Verificando: ${documentName} ---`);

      const { data: existingChunks, error: checkError } = await supabase
        .from("curriculum_chunks")
        .select("id", { count: "exact", head: true })
        .eq("document_name", documentName);

      if (checkError) {
        logs.push(
          `Erro ao verificar chunks existentes para ${documentName}: ${checkError.message}`
        );
        continue;
      }

      if (existingChunks && existingChunks.length > 0) {
        logs.push(
          `O documento ${documentName} já foi processado anteriormente. A ignorar.`
        );
        continue;
      }

      logs.push(`A processar novo ficheiro: ${documentName}`);
      const { data: blobData, error: downloadError } = await supabase.storage
        .from(BUCKET_NAME)
        .download(documentName);

      if (downloadError) {
        logs.push(
          `Erro no download de ${documentName}: ${downloadError.message}`
        );
        continue;
      }

      if (!blobData || blobData.size === 0) {
        logs.push(`Ficheiro ${documentName} está vazio ou o download falhou.`);
        continue;
      }

      try {
        const buffer = Buffer.from(await blobData.arrayBuffer());
        const pdfData = await pdf(buffer);
        const text = pdfData.text;

        if (!text || text.trim().length === 0) {
          logs.push(`Não foi extraído texto do ficheiro: ${documentName}`);
          continue;
        }

        logs.push(`Texto extraído com sucesso de ${documentName}.`);

        const chunks = chunkText(text);
        logs.push(
          `Documento ${documentName} dividido em ${chunks.length} chunks.`
        );

        for (const [index, chunk] of chunks.entries()) {
          logs.push(
            `Gerando embedding para o chunk ${index + 1}/${chunks.length}...`
          );
          const response = await openai.embeddings.create({
            model: EMBEDDING_MODEL,
            input: chunk,
          });

          const embedding = response.data[0].embedding;

          const { error: insertError } = await supabase
            .from("curriculum_chunks")
            .insert({
              document_name: documentName,
              content: chunk,
              embedding: embedding,
            });

          if (insertError) {
            logs.push(`Erro ao inserir chunk: ${insertError.message}`);
          } else {
            logs.push(
              `Chunk ${index + 1} de ${documentName} inserido com sucesso.`
            );
          }
        }
      } catch (e: unknown) {
        let errorMessage = "Um erro desconhecido ocorreu.";
        if (e instanceof Error) {
          errorMessage = e.message;
        }
        logs.push(`ERRO FATAL ao processar ${documentName}: ${errorMessage}`);
      }
    }

    logs.push("Processamento concluído!");
    return NextResponse.json({ success: true, logs });
  } catch (e: unknown) {
    let errorMessage = "Um erro desconhecido ocorreu.";
    if (e instanceof Error) {
      errorMessage = e.message;
    }
    logs.push(`ERRO FATAL: ${errorMessage}`);
    return NextResponse.json(
      { success: false, error: errorMessage, logs },
      { status: 500 }
    );
  }
}
