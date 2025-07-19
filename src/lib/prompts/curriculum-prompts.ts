/**
 * Curriculum-Specific Prompts
 * Prompts for different types of curriculum analysis and content generation
 */

export const CURRICULUM_PROMPTS = {
  /**
   * Lesson plan generation prompt
   */
  LESSON_PLAN: (
    subject: string,
    grade: string,
    topic: string,
    context: string
  ) => `Com base no currículo português e no teu conhecimento pedagógico, cria um plano de aula detalhado para ${subject} no ${grade} sobre "${topic}".

CONTEXTO CURRICULAR:
${context}

INSTRUÇÕES:
- Usa o contexto curricular como base PRINCIPAL para os objetivos e conteúdos
- Podes complementar com metodologias e atividades baseadas no teu conhecimento pedagógico
- Se o contexto não tiver informação específica, podes usar o teu conhecimento geral
- Prioriza sempre a informação do currículo português quando disponível

Plano de Aula:
1. Objetivos de Aprendizagem:
2. Conteúdos:
3. Metodologia:
4. Recursos:
5. Avaliação:`,

  /**
   * Assessment creation prompt
   */
  ASSESSMENT: (
    subject: string,
    grade: string,
    topic: string,
    context: string
  ) => `Com base no currículo português e no teu conhecimento pedagógico, cria uma avaliação para ${subject} no ${grade} sobre "${topic}".

CONTEXTO CURRICULAR:
${context}

INSTRUÇÕES:
- Usa o contexto curricular para definir os objetivos avaliados
- Podes criar questões baseadas no teu conhecimento pedagógico
- Prioriza os objetivos específicos do currículo português
- Complementa com questões que testem competências gerais

Avaliação:
1. Objetivos avaliados:
2. Questões:
3. Critérios de correção:`,

  /**
   * Activity suggestions prompt
   */
  ACTIVITIES: (
    subject: string,
    grade: string,
    topic: string,
    context: string
  ) => `Com base no currículo português e no teu conhecimento pedagógico, sugere atividades pedagógicas para ${subject} no ${grade} sobre "${topic}".

CONTEXTO CURRICULAR:
${context}

INSTRUÇÕES:
- Usa o contexto curricular para entender os objetivos de aprendizagem
- Podes sugerir atividades baseadas no teu conhecimento pedagógico
- Prioriza atividades que se alinhem com o currículo português
- Complementa com metodologias ativas e inovadoras

Atividades sugeridas:
1. Atividade individual:
2. Atividade em grupo:
3. Atividade prática:`,

  /**
   * Content explanation prompt
   */
  EXPLANATION: (
    subject: string,
    grade: string,
    concept: string,
    context: string
  ) => `Explica o conceito "${concept}" para ${subject} no ${grade} de acordo com o currículo português e o teu conhecimento pedagógico.

CONTEXTO CURRICULAR:
${context}

INSTRUÇÕES:
- Usa o contexto curricular como base para a explicação
- Podes complementar com exemplos e metodologias do teu conhecimento
- Prioriza a informação específica do currículo português
- Adapta a explicação ao nível etário e cognitivo

Explicação pedagógica:`,

  /**
   * Cross-curricular connections prompt
   */
  CROSS_CURRICULAR: (
    subject: string,
    grade: string,
    context: string
  ) => `Identifica e explica as conexões interdisciplinares para ${subject} no ${grade} de acordo com o currículo português e o teu conhecimento pedagógico.

CONTEXTO CURRICULAR:
${context}

INSTRUÇÕES:
- Usa o contexto curricular para identificar as conexões específicas
- Podes sugerir conexões baseadas no teu conhecimento pedagógico
- Prioriza as conexões explicitamente mencionadas no currículo
- Complementa com sugestões de projetos interdisciplinares

Conexões interdisciplinares:`,
} as const;

/**
 * Curriculum prompt builder
 */
export class CurriculumPromptBuilder {
  /**
   * Builds a lesson plan prompt
   */
  static buildLessonPlan(
    subject: string,
    grade: string,
    topic: string,
    context: string
  ): string {
    return CURRICULUM_PROMPTS.LESSON_PLAN(subject, grade, topic, context);
  }

  /**
   * Builds an assessment prompt
   */
  static buildAssessment(
    subject: string,
    grade: string,
    topic: string,
    context: string
  ): string {
    return CURRICULUM_PROMPTS.ASSESSMENT(subject, grade, topic, context);
  }

  /**
   * Builds an activities prompt
   */
  static buildActivities(
    subject: string,
    grade: string,
    topic: string,
    context: string
  ): string {
    return CURRICULUM_PROMPTS.ACTIVITIES(subject, grade, topic, context);
  }

  /**
   * Builds an explanation prompt
   */
  static buildExplanation(
    subject: string,
    grade: string,
    concept: string,
    context: string
  ): string {
    return CURRICULUM_PROMPTS.EXPLANATION(subject, grade, concept, context);
  }

  /**
   * Builds a cross-curricular prompt
   */
  static buildCrossCurricular(
    subject: string,
    grade: string,
    context: string
  ): string {
    return CURRICULUM_PROMPTS.CROSS_CURRICULAR(subject, grade, context);
  }
}
