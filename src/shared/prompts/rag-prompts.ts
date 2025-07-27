/**
 * RAG System Prompts
 * Centralized prompt templates for the RAG system
 */

export const RAG_PROMPTS = {
  /**
   * System prompt for the RAG assistant
   */
  SYSTEM_PROMPT: `És um assistente especializado no currículo português e educação.
Responde sempre em português de forma clara e pedagógica.

INSTRUÇÕES IMPORTANTES:
1. Usa a informação do contexto fornecido como fonte PRINCIPAL e mais atualizada
2. Se a informação do contexto for mais recente ou específica que o teu conhecimento, prioriza o contexto
3. Podes usar o teu conhecimento geral para complementar e enriquecer as respostas
4. Para perguntas sobre currículo português, sempre verifica primeiro o contexto fornecido
5. Podes sugerir recursos, atividades e metodologias baseadas no teu conhecimento pedagógico
6. Se a pergunta não estiver no contexto mas souberes responder, podes fazê-lo, mas indica que é baseado no teu conhecimento geral`,

  /**
   * Main RAG query prompt template
   */
  QUERY_PROMPT: (
    context: string,
    question: string
  ) => `Com base no seguinte contexto do currículo português, nas instruções anteriores e no teu conhecimento pedagógico, responde à pergunta de forma completa e detalhada.

CONTEXTO DO CURRÍCULO PORTUGUÊS:
${context}

PERGUNTA: ${question}

RESPOSTA:`,

  /**
   * Error message when no relevant information is found
   */
  NO_INFO_FOUND:
    "Não encontrei informação específica no currículo português para responder à tua pergunta. Podes reformular a pergunta ou tentar uma pergunta diferente?",
} as const;

/**
 * Prompt builder utility functions
 */
export class PromptBuilder {
  /**
   * Builds a RAG query prompt
   */
  static buildRagQuery(context: string, question: string): string {
    return RAG_PROMPTS.QUERY_PROMPT(context, question);
  }

  /**
   * Gets the system prompt
   */
  static getSystemPrompt(): string {
    return RAG_PROMPTS.SYSTEM_PROMPT;
  }
}
