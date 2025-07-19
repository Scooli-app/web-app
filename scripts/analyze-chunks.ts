#!/usr/bin/env node

/**
 * Script para analisar a qualidade dos chunks processados
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function analyzeChunks() {
  console.log("🔍 Analisando qualidade dos chunks...\n");

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Variáveis de ambiente não encontradas");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. Contar total de chunks
    const { count: totalChunks } = await supabase
      .from("curriculum_chunks")
      .select("*", { count: "exact", head: true });

    console.log(`📊 Total de chunks: ${totalChunks}`);

    // 2. Contar por documento
    const { data: documents } = await supabase
      .from("curriculum_chunks")
      .select("document_name")
      .order("document_name");

    const docCounts = documents?.reduce((acc: Record<string, number>, doc) => {
      acc[doc.document_name] = (acc[doc.document_name] || 0) + 1;
      return acc;
    }, {});

    console.log("\n📁 Chunks por documento:");
    Object.entries(docCounts || {}).forEach(([doc, count]) => {
      console.log(`   ${doc}: ${count} chunks`);
    });

    // 3. Mostrar amostras de chunks
    console.log("\n📝 Amostras de chunks (primeiros 3 de cada documento):");

    const uniqueDocs = [
      ...new Set(documents?.map((d) => d.document_name) || []),
    ];

    for (const docName of uniqueDocs) {
      console.log(`\n--- ${docName} ---`);

      const { data: samples } = await supabase
        .from("curriculum_chunks")
        .select("content")
        .eq("document_name", docName)
        .limit(3);

      samples?.forEach((sample, index) => {
        console.log(`\nChunk ${index + 1}:`);
        console.log(`Tamanho: ${sample.content.length} caracteres`);
        console.log(`Preview: ${sample.content.substring(0, 200)}...`);
        console.log("---");
      });
    }

    // 4. Verificar chunks muito pequenos ou muito grandes
    console.log("\n⚠️ Análise de qualidade:");

    const { data: allChunks } = await supabase
      .from("curriculum_chunks")
      .select("content, document_name");

    if (allChunks) {
      const sizes = allChunks.map((chunk) => chunk.content.length);
      const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
      const minSize = Math.min(...sizes);
      const maxSize = Math.max(...sizes);

      console.log(`   Tamanho médio: ${Math.round(avgSize)} caracteres`);
      console.log(`   Menor chunk: ${minSize} caracteres`);
      console.log(`   Maior chunk: ${maxSize} caracteres`);

      const smallChunks = allChunks.filter(
        (chunk) => chunk.content.length < 100
      );
      const largeChunks = allChunks.filter(
        (chunk) => chunk.content.length > 2000
      );

      if (smallChunks.length > 0) {
        console.log(
          `   ⚠️ ${smallChunks.length} chunks muito pequenos (< 100 chars)`
        );
      }
      if (largeChunks.length > 0) {
        console.log(
          `   ⚠️ ${largeChunks.length} chunks muito grandes (> 2000 chars)`
        );
      }
    }

    // 5. Testar busca semântica
    console.log("\n🧪 Teste de busca semântica:");

    const testQueries = [
      "adição e subtração",
      "leitura e escrita",
      "geometria",
      "gramática",
    ];

    for (const query of testQueries) {
      console.log(`\nPergunta: "${query}"`);

      // Simular busca (sem gerar embedding real)
      const { data: matches } = await supabase
        .from("curriculum_chunks")
        .select("content, document_name")
        .or(`content.ilike.%${query}%`)
        .limit(2);

      if (matches && matches.length > 0) {
        console.log(`   Encontrados: ${matches.length} chunks`);
        matches.forEach((match, i) => {
          console.log(
            `   ${i + 1}. ${match.document_name}: ${match.content.substring(
              0,
              100
            )}...`
          );
        });
      } else {
        console.log("   Nenhum resultado encontrado");
      }
    }
  } catch (error) {
    console.error("❌ Erro ao analisar chunks:", error);
  }
}

analyzeChunks();
