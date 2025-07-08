import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import OpenAI from "openai";
import pdf from "pdf-parse";

dotenv.config({ path: ".env.local" });

// Configuração dos Clientes
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Usar a Service Key para privilégios de admin
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
  throw new Error("Missing Supabase or OpenAI environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const openai = new OpenAI({ apiKey: openaiApiKey });

const BUCKET_NAME = "curriculum-documents";
const EMBEDDING_MODEL = "text-embedding-ada-002";

/**
 * Divide o texto em chunks de um tamanho aproximado, tentando respeitar parágrafos.
 * Esta é uma estratégia de chunking simples. Pode ser melhorada no futuro.
 */
function chunkText(text: string, chunkSize = 1500): string[] {
  const chunks: string[] = [];
  let currentChunk = "";

  const paragraphs = text.split(/\n\s*\n/); // Divide por parágrafos (linhas em branco)

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length + 2 > chunkSize) {
      chunks.push(currentChunk.trim());
      currentChunk = "";
    }
    currentChunk += `${paragraph}\n\n`;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Função principal que orquestra todo o processo de RAG.
 */
async function processCurriculumPdfs() {
  console.log("Iniciando o processamento dos PDFs do currículo...");

  // 1. Listar todos os ficheiros no bucket
  const { data: files, error: listError } = await supabase.storage
    .from(BUCKET_NAME)
    .list();

  if (listError) {
    console.error("Erro ao listar ficheiros do bucket:", listError.message);
    return;
  }

  if (!files || files.length === 0) {
    console.log("Nenhum ficheiro encontrado no bucket. A sair.");
    return;
  }

  console.log(`Encontrados ${files.length} ficheiros para processar.`);

  for (const file of files) {
    const documentName = file.name;
    console.log(`\n--- Processando: ${documentName} ---`);

    // Evitar re-processar ficheiros que já estão na base de dados
    const { data: existingChunks, error: checkError } = await supabase
      .from("curriculum_chunks")
      .select("id")
      .eq("document_name", documentName)
      .limit(1);

    if (checkError) {
      console.error("Erro ao verificar chunks existentes:", checkError.message);
      continue; // Pula para o próximo ficheiro
    }

    if (existingChunks.length > 0) {
      console.log("Este documento já foi processado. A ignorar.");
      continue;
    }

    // 2. Fazer o download do ficheiro
    const { data: blob, error: downloadError } = await supabase.storage
      .from(BUCKET_NAME)
      .download(documentName);

    if (downloadError) {
      console.error(
        `Erro no download de ${documentName}:`,
        downloadError.message
      );
      continue;
    }

    try {
      // 3. Extrair o texto do PDF
      const buffer = Buffer.from(await blob.arrayBuffer());
      const pdfData = await pdf(buffer);
      const text = pdfData.text;
      console.log("Texto extraído com sucesso.");

      // 4. Dividir o texto em chunks
      const chunks = chunkText(text);
      console.log(`Documento dividido em ${chunks.length} chunks.`);

      // 5. Gerar embeddings e inserir na base de dados (em lotes)
      for (const chunk of chunks) {
        console.log("Gerando embedding para um chunk...");
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
          console.error("Erro ao inserir chunk:", insertError.message);
        } else {
          console.log("Chunk inserido com sucesso.");
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        console.error(`Erro ao processar o PDF ${documentName}:`, e.message);
      } else {
        console.error(`Erro ao processar o PDF ${documentName}:`, e);
      }
    }
  }

  console.log("\nProcessamento concluído!");
}

processCurriculumPdfs();
