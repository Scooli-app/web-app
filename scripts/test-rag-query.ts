#!/usr/bin/env node

/**
 * Script para testar o RAG query endpoint
 * Executar: npx tsx scripts/test-rag-query.ts
 */

async function testRagQuery() {
  console.log("🧪 Testando RAG Query...");

  const testQuestions = [
    "Quais são os objetivos de aprendizagem para Matemática no 1º ciclo?",
    "Como se ensina a leitura no 1º ano?",
    "Quais são as competências essenciais para o 2º ciclo?",
  ];

  for (const question of testQuestions) {
    console.log(`\n📝 Pergunta: ${question}`);

    try {
      const response = await fetch("http://localhost:3000/api/rag-query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("✅ Resposta recebida:");
        console.log(`   Resposta: ${data.answer}`);
        console.log(`   Fontes: ${data.sources?.length || 0} documentos`);

        if (data.sources && data.sources.length > 0) {
          data.sources.forEach(
            (source: { document: string }, index: number) => {
              console.log(`   Fonte ${index + 1}: ${source.document}`);
            }
          );
        }
      } else {
        console.error("❌ Erro na resposta:");
        console.error(data);
      }
    } catch (error) {
      console.error("❌ Erro ao fazer requisição:", error);
    }
  }
}

testRagQuery();
