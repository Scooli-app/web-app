/**
 * Test/Quiz Editor Prompts
 * Prompts for the interactive test/quiz editor
 */

import { BasePromptBuilder } from "./base-prompts";

const TEST_QUIZ_SPECIFIC_INSTRUCTIONS = `ESTRUTURA DO TESTE/QUIZ:
- **Título e Informações**: disciplina, ano, duração, tipo de teste
- **Instruções**: como responder, tempo disponível, pontuação
- **Questões**: numeradas e organizadas por tipo
  - Escolha múltipla (A, B, C, D)
  - Verdadeiro/Falso
  - Resposta curta
  - Desenvolvimento
  - Problemas práticos
- **Critérios de Avaliação**: pontuação por questão
- **Soluções**: respostas corretas e explicações
- **Diferenciação**: versões adaptadas se necessário

TIPOS DE QUESTÕES:
1. **Escolha Múltipla**: 4 opções, apenas uma correta
2. **Verdadeiro/Falso**: afirmações claras e precisas
3. **Resposta Curta**: 1-2 frases
4. **Desenvolvimento**: explicação detalhada
5. **Problemas**: aplicação prática dos conceitos

INSTRUÇÕES ESPECÍFICAS:
- Inclui sempre instruções claras e critérios de avaliação
- Se a pergunta não for sobre testes/quizzes, responde: "Só posso ajudar com testes e quizzes."`;

export const TEST_QUIZ_PROMPTS = {
  SYSTEM_PROMPT: BasePromptBuilder.buildSystemPrompt(
    "testes, quizzes e avaliação",
    "Só posso ajudar com testes e quizzes.",
    TEST_QUIZ_SPECIFIC_INSTRUCTIONS
  ),

  CHAT_PROMPT: (currentContent: string, userMessage: string) =>
    BasePromptBuilder.buildChatPrompt(
      "teste/quiz",
      currentContent,
      userMessage
    ),
};

/**
 * Test/Quiz prompt builder
 */
export class TestQuizPromptBuilder {
  /**
   * Gets the system prompt for test/quiz assistant
   */
  static getSystemPrompt(): string {
    return TEST_QUIZ_PROMPTS.SYSTEM_PROMPT;
  }

  /**
   * Builds a chat prompt for test/quiz assistance
   */
  static buildChatPrompt(currentContent: string, userMessage: string): string {
    return TEST_QUIZ_PROMPTS.CHAT_PROMPT(currentContent, userMessage);
  }
}
