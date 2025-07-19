import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import path from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;
const CURRICULUM_FOLDER_PATH = process.env.CURRICULUM_FOLDER_PATH;
const EMBEDDING_MODEL = "text-embedding-3-small";

/**
 * Converte tabelas markdown para texto plano mais legível
 */
function convertTablesToText(content: string): string {
  // Regex para encontrar tabelas markdown
  const tableRegex = /\|(.+)\|\n\|[\s\-:]+\|\n((?:\|.+\|\n?)+)/g;

  return content.replace(
    tableRegex,
    (match: string, header: string, rows: string) => {
      // Extrair cabeçalhos
      const headers = header
        .split("|")
        .filter((cell: string) => cell.trim())
        .map((cell: string) => cell.trim());

      // Extrair linhas
      const rowLines = rows.split("\n").filter((line: string) => line.trim());
      const tableRows = rowLines.map((line: string) => {
        const cells = line
          .split("|")
          .filter((cell: string) => cell.trim())
          .map((cell: string) => cell.trim());
        return cells;
      });

      // Converter para texto estruturado
      let textTable = "\n";
      textTable += `TABELA: ${headers.join(" | ")}\n`;
      textTable += "---\n";

      tableRows.forEach((row: string[], index: number) => {
        if (row.length === headers.length) {
          const rowText = row
            .map((cell: string, i: number) => `${headers[i]}: ${cell}`)
            .join(" | ");
          textTable += `Linha ${index + 1}: ${rowText}\n`;
        }
      });

      textTable += "---\n\n";
      return textTable;
    }
  );
}

/**
 * Processa o conteúdo markdown para melhorar a qualidade dos chunks
 */
function preprocessMarkdown(content: string): string {
  // Converter tabelas primeiro
  let processed = convertTablesToText(content);

  // Melhorar formatação de listas
  processed = processed.replace(/^\s*[-*]\s+/gm, "\n• ");

  // Melhorar separação de seções
  processed = processed.replace(/^#{1,6}\s+/gm, "\n$&\n");

  // Remover linhas em branco excessivas
  processed = processed.replace(/\n{3,}/g, "\n\n");

  return processed;
}

/**
 * Lê ficheiros Markdown de uma pasta local
 */
function readMarkdownFiles(
  folderPath: string
): Array<{ name: string; content: string }> {
  const files: Array<{ name: string; content: string }> = [];

  if (!fs.existsSync(folderPath)) {
    throw new Error(`Pasta não encontrada: ${folderPath}`);
  }

  const items = fs.readdirSync(folderPath);

  for (const item of items) {
    const fullPath = path.join(folderPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isFile() && item.toLowerCase().endsWith(".md")) {
      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        // Processar o conteúdo para melhorar a qualidade
        const processedContent = preprocessMarkdown(content);
        files.push({
          name: item,
          content: processedContent,
        });
      } catch (error) {
        console.error(`Erro ao ler ficheiro ${item}:`, error);
      }
    }
  }

  return files;
}

/**
 * Processa ficheiros Markdown locais e gera embeddings para RAG
 */
export async function POST(req: Request) {
  // ** SEGURANÇA **
  // Protege a rota de API para que só possa ser acionada com uma chave secreta.
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CURRICULUM_PROCESSING_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (
    !supabaseUrl ||
    !supabaseServiceKey ||
    !openaiApiKey ||
    !CURRICULUM_FOLDER_PATH
  ) {
    return NextResponse.json(
      {
        error:
          "Missing environment variables. Required: SUPABASE_URL, SUPABASE_ANON_KEY, OPENAI_API_KEY, CURRICULUM_FOLDER_PATH",
      },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const openai = new OpenAI({ apiKey: openaiApiKey });

  const logs: string[] = [];

  try {
    logs.push(
      `Iniciando o processamento dos ficheiros Markdown da pasta: ${CURRICULUM_FOLDER_PATH}`
    );

    // Lê ficheiros Markdown da pasta local
    const markdownFiles = readMarkdownFiles(CURRICULUM_FOLDER_PATH);

    logs.push(
      `Encontrados ${markdownFiles.length} ficheiros Markdown para processar.`
    );

    if (markdownFiles.length === 0) {
      logs.push("Nenhum ficheiro Markdown encontrado na pasta especificada.");
      return NextResponse.json({ success: true, logs });
    }

    // Configura o text splitter do LangChain com separadores melhorados
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: [
        "\n\n## ", // Keep headers with content
        "\n\n### ",
        "\n\n---\n\n", // Table separators
        "\n\n• ", // Lists
        "\n\n",
        "\n",
        " ",
        "",
      ],
    });

    for (const file of markdownFiles) {
      const documentName = file.name;
      logs.push(`--- Verificando: ${documentName} ---`);

      // Verifica se o documento já foi processado
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

      try {
        const text = file.content;

        if (!text || text.trim().length === 0) {
          logs.push(`Ficheiro ${documentName} está vazio.`);
          continue;
        }

        logs.push(
          `Texto extraído com sucesso de ${documentName} (${text.length} caracteres).`
        );

        // Usa LangChain para dividir o texto em chunks
        const documents = await textSplitter.createDocuments([text]);
        const chunks = documents
          .map((doc: { pageContent: string }) => doc.pageContent)
          .filter((chunk) => chunk.trim().length > 50); // Remove tiny chunks

        logs.push(
          `Documento ${documentName} dividido em ${chunks.length} chunks usando LangChain.`
        );

        // Processa cada chunk
        for (const [index, chunk] of chunks.entries()) {
          logs.push(
            `Gerando embedding para o chunk ${index + 1}/${chunks.length}...`
          );

          try {
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
          } catch (embeddingError) {
            logs.push(
              `Erro ao gerar embedding para chunk ${
                index + 1
              }: ${embeddingError}`
            );
            // Continua com o próximo chunk em vez de falhar completamente
            continue;
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
