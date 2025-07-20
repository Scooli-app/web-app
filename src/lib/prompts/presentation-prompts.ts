/**
 * Presentation Editor Prompts
 * Prompts for the interactive presentation editor
 */

import { BasePromptBuilder } from "./base-prompts";

const PRESENTATION_SPECIFIC_INSTRUCTIONS = `ESTRUTURA DA APRESENTAÇÃO:
- **Título**: tema, disciplina, público-alvo
- **Objetivos**: o que se pretende transmitir
- **Slides**: organizados por tópicos
  - Introdução e contexto
  - Desenvolvimento dos conceitos
  - Exemplos práticos
  - Conclusões e síntese
- **Elementos Visuais**: gráficos, imagens, diagramas sugeridos
- **Interatividade**: perguntas, atividades, discussões
- **Recursos**: materiais complementares

ESTRUTURA DOS SLIDES:
1. **Slide de Título**: tema, autor, data
2. **Sumário**: pontos principais
3. **Slides de Conteúdo**: 3-5 pontos por slide
4. **Slides de Exemplo**: casos práticos
5. **Slide de Conclusão**: síntese e próximos passos

INSTRUÇÕES ESPECÍFICAS:
- Inclui sempre elementos visuais e interativos
- Se a pergunta não for sobre apresentações, responde: "Só posso ajudar com apresentações."`;

export const PRESENTATION_PROMPTS = {
  SYSTEM_PROMPT: BasePromptBuilder.buildSystemPrompt(
    "apresentações educativas",
    "Só posso ajudar com apresentações.",
    PRESENTATION_SPECIFIC_INSTRUCTIONS
  ),

  CHAT_PROMPT: (currentContent: string, userMessage: string) =>
    BasePromptBuilder.buildChatPrompt(
      "apresentação",
      currentContent,
      userMessage
    ),
};

/**
 * Presentation prompt builder
 */
export class PresentationPromptBuilder {
  /**
   * Gets the system prompt for presentation assistant
   */
  static getSystemPrompt(): string {
    return PRESENTATION_PROMPTS.SYSTEM_PROMPT;
  }

  /**
   * Builds a chat prompt for presentation assistance
   */
  static buildChatPrompt(currentContent: string, userMessage: string): string {
    return PRESENTATION_PROMPTS.CHAT_PROMPT(currentContent, userMessage);
  }
}
