#!/usr/bin/env node

/**
 * Script para testar o processamento de currículo
 * Executar: npx tsx scripts/test-curriculum-processing.ts
 */

// Load environment variables from .env.local
import { config } from "dotenv";
config({ path: ".env.local" });

const CURRICULUM_PROCESSING_SECRET = process.env.CURRICULUM_PROCESSING_SECRET;

if (!CURRICULUM_PROCESSING_SECRET) {
  console.error(
    "❌ CURRICULUM_PROCESSING_SECRET não está definido no .env.local"
  );
  process.exit(1);
}

async function testCurriculumProcessing() {
  console.log("🚀 Iniciando teste do processamento de currículo...");

  try {
    const response = await fetch(
      "http://localhost:3000/api/process-curriculum",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CURRICULUM_PROCESSING_SECRET}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (response.ok) {
      console.log("✅ Processamento concluído com sucesso!");
      console.log("📊 Logs:");
      data.logs.forEach((log: string) => {
        console.log(`  ${log}`);
      });
    } else {
      console.error("❌ Erro no processamento:");
      console.error(data);
    }
  } catch (error) {
    console.error("❌ Erro ao fazer requisição:", error);
  }
}

testCurriculumProcessing();
