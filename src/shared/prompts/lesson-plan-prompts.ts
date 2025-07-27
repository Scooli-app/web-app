/**
 * Lesson Plan Editor Prompts
 * Prompts for the interactive lesson plan editor
 */

import { BasePromptBuilder } from "./base-prompts";

const LESSON_PLAN_SPECIFIC_INSTRUCTIONS = `ESTRUTURA DO PLANO DE AULA:
- **Título**: disciplina, ano, duração, materiais
- **Objetivos de Aprendizagem**: específicos e mensuráveis
- **Conteúdos**: conceitos principais a abordar
- **Metodologia**: estratégias de ensino (individual, grupo, turma)
- **Atividades**: sequência detalhada com duração
- **Recursos**: materiais e tecnologias necessários
- **Avaliação**: métodos de verificação da aprendizagem
- **Diferenciação**: adaptações para diferentes necessidades

INSTRUÇÕES ESPECÍFICAS:
- Inclui sempre objetivos, atividades e avaliação estruturados
- Se a pergunta não for sobre ensino, responde: "Só posso ajudar com planos de aula e ensino."`;

export const LESSON_PLAN_PROMPTS = {
  SYSTEM_PROMPT: BasePromptBuilder.buildSystemPrompt(
    "planos de aula e ensino",
    "Só posso ajudar com planos de aula e ensino.",
    LESSON_PLAN_SPECIFIC_INSTRUCTIONS
  ),

  CHAT_PROMPT: (currentContent: string, userMessage: string) =>
    BasePromptBuilder.buildChatPrompt(
      "plano de aula",
      currentContent,
      userMessage
    ),
};

/**
 * Lesson plan prompt builder
 */
export class LessonPlanPromptBuilder {
  /**
   * Gets the system prompt for lesson plan assistant
   */
  static getSystemPrompt(): string {
    return LESSON_PLAN_PROMPTS.SYSTEM_PROMPT;
  }

  /**
   * Builds a chat prompt for lesson plan assistance
   */
  static buildChatPrompt(currentContent: string, userMessage: string): string {
    return LESSON_PLAN_PROMPTS.CHAT_PROMPT(currentContent, userMessage);
  }
}
