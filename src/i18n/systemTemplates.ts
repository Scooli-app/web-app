import type { DocumentTemplate } from "@/shared/types";
import type { Locale } from "./locales";

/**
 * English copy for the built-in (system) document templates.
 *
 * Templates are stored in the database in Portuguese only, so without this an
 * English interface shows Portuguese template names, descriptions and section
 * titles. Keyed by the stored Portuguese text (whitespace-normalised, since a
 * few rows carry double spaces). Anything not listed — teachers' own templates
 * included — is shown as stored.
 */
const EN: Record<string, string> = {
  // Template names
  "Aula Baseada em Projeto (PBL)": "Project-Based Lesson (PBL)",
  "Aula Invertida (Flipped)": "Flipped Classroom Lesson",
  "Plano de Aula Tradicional": "Traditional Lesson Plan",
  "Apresentação Educativa": "Educational Presentation",
  "Apresentação com Debate": "Presentation with Debate",
  "Apresentação de Projeto": "Project Presentation",
  "Apresentação Visual Mínima": "Minimal Visual Presentation",
  "Quiz Padrão": "Standard Quiz",
  "Teste Formal": "Formal Test",
  "Ficha com Registo e Reflexão": "Worksheet with Checkpoints and Reflection",
  "Ficha Essencial": "Essential Worksheet",
  "Ficha por Etapas": "Step-by-Step Worksheet",
  "Ficha por Grupos": "Worksheet in Parts",

  // Template descriptions
  "Aprendizagem baseada em projetos com foco em problemas reais e criação de produtos":
    "Project-based learning focused on real problems and creating a product",
  "Metodologia de sala de aula invertida com estudo prévio e aplicação prática em aula":
    "Flipped classroom: students study beforehand and apply it in class",
  "Estrutura tradicional de plano de aula com foco em objetivos, desenvolvimento e avaliação":
    "Traditional lesson plan structure focused on objectives, development and assessment",
  "Estrutura de apresentação para aulas e exposições didáticas":
    "Presentation structure for lessons and teaching talks",
  "Estrutura para apresentações com debate ou discussão em grupo, com argumentos e síntese final":
    "Structure for presentations with a debate or group discussion, with arguments and a final summary",
  "Estrutura para apresentar o desenvolvimento e resultados de um projeto escolar":
    "Structure for presenting the development and results of a school project",
  "Estrutura enxuta com poucos slides, focada em imagens e mensagens-chave, ideal para exposições curtas":
    "A lean structure with few slides, focused on images and key messages, ideal for short talks",
  "Estrutura padrão para quizzes com diferentes tipos de questões":
    "Standard quiz structure with different question types",
  "Estrutura formal de teste de avaliação com grupos de questões":
    "Formal assessment test structure with groups of questions",
  "Estrutura com blocos de trabalho e momentos de registo, síntese ou reflexão ao longo da ficha.":
    "Blocks of work with moments to record, summarise or reflect throughout the worksheet.",
  "Estrutura equilibrada com ativação, desenvolvimento e fecho, adaptável a qualquer finalidade da ficha.":
    "A balanced structure with warm-up, development and wrap-up, adaptable to any worksheet goal.",
  "Organiza a ficha em fases curtas e progressivas, útil para gerir ritmo, autonomia ou recolha de evidências.":
    "Organises the worksheet into short, progressive stages — useful for managing pace, autonomy or gathering evidence.",
  "Estrutura em partes independentes, útil para separar momentos, focos ou conjuntos de tarefas numa mesma ficha.":
    "Independent parts — useful for separating moments, focuses or sets of tasks in one worksheet.",

  // Section titles
  "Aplicação Prática": "Practical Application",
  "Apoio à Correção": "Marking Support",
  "Apoio ao Professor": "Teacher Support",
  "Apresentação": "Presentation",
  "Argumentos a Favor": "Arguments For",
  "Argumentos Contra": "Arguments Against",
  "Ativação Inicial": "Warm-up",
  "Atividade Interativa": "Interactive Activity",
  "Avaliação": "Assessment",
  "Bloco 1": "Part 1",
  "Bloco 2": "Part 2",
  "Cabeçalho": "Header",
  "Cabeçalho ou Enquadramento": "Header and Context",
  "Consolidação": "Consolidation",
  "Conteúdo Principal": "Main Content",
  "Contexto do Problema": "Problem Context",
  "Contexto Inicial": "Starting Context",
  "Criação do Produto": "Creating the Product",
  "Desenvolvimento": "Development",
  "Esclarecimento de Dúvidas": "Questions and Clarifications",
  "Etapa 1": "Stage 1",
  "Etapa 2": "Stage 2",
  "Etapa 3": "Stage 3",
  "Exemplo Visual": "Visual Example",
  "Extensão": "Extension",
  "Fecho": "Wrap-up",
  "Fecho Técnico": "Technical Wrap-up",
  "Grupo A": "Group A",
  "Grupo B": "Group B",
  "Grupo I - Escolha Múltipla": "Part I - Multiple Choice",
  "Grupo II - Desenvolvimento": "Part II - Extended Response",
  "Grupo III - Problema/Caso": "Part III - Problem/Case Study",
  "Índice/Agenda": "Agenda",
  "Instruções": "Instructions",
  "Instruções Gerais": "General Instructions",
  "Introdução": "Introduction",
  "Introdução ao Tema": "Introduction to the Topic",
  "Investigação": "Investigation",
  "Lições Aprendidas": "Lessons Learned",
  "Material Prévio": "Pre-class Material",
  "Metodologia": "Methodology",
  "Momento de Discussão": "Discussion Time",
  "Objetivo da Ficha": "Worksheet Goal",
  "Objetivo do Projeto": "Project Objective",
  "Objetivos de Aprendizagem": "Learning Objectives",
  "Ponto de Situação": "Checkpoint",
  "Questão Orientadora": "Guiding Question",
  "Questões de Escolha Múltipla": "Multiple-Choice Questions",
  "Questões de Resposta Curta": "Short-Answer Questions",
  "Questões de Verdadeiro/Falso": "True/False Questions",
  "Recursos Necessários": "Required Resources",
  "Referências": "References",
  "Reflexão": "Reflection",
  "Registo Final": "Final Record",
  "Resultados": "Results",
  "Resumo/Conclusão": "Summary/Conclusion",
  "Slide de Título": "Title Slide",
  "Tarefas Principais": "Main Tasks",
  "Verificação de Compreensão": "Check for Understanding",

  // Section descriptions
  "Afirmações para validar": "Statements to check",
  "Atividades e estratégias de ensino": "Teaching activities and strategies",
  "Atividades para confirmar o estudo prévio": "Activities to check the pre-class study",
  "Avaliação do processo e aprendizagens": "Assessment of the process and learning",
  "Como realizar o trabalho, materiais necessários e critérios de resposta":
    "How to do the work, materials needed and answer criteria",
  "Competências e conhecimentos a desenvolver": "Skills and knowledge to develop",
  "Conclusão curta, autoavaliação, verificação final ou indicação de próximo passo":
    "Short conclusion, self-assessment, final check or next step",
  "Conclusão, transferência, verificação final ou indicação de próximo passo":
    "Conclusion, transfer, final check or next step",
  "Conteúdos para estudo autónomo antes da aula": "Content for independent study before class",
  "Contextualização e motivação": "Context and motivation",
  "Desafios adicionais e aprofundamento": "Extra challenges and deeper exploration",
  "Desenvolvimento da solução ou produto": "Developing the solution or product",
  "Desenvolvimento dos conceitos e ideias": "Developing the concepts and ideas",
  "Discussão e clarificação de conceitos": "Discussion and clarification of concepts",
  "Debate em grupo com perguntas orientadoras": "Group debate with guiding questions",
  "Enquadramento do tema com uma situação, texto curto, dado, observação ou problema de partida":
    "Introduces the topic with a situation, short text, data, observation or starting problem",
  "Enquadramento real e relevante": "Real, relevant context",
  "Exercícios e projetos em grupo": "Group exercises and projects",
  "Finalidade principal da ficha e foco de aprendizagem, ajustados ao objetivo da ficha":
    "The worksheet's main purpose and learning focus",
  "Fontes e materiais de apoio": "Sources and supporting materials",
  "Identificação da ficha e informação inicial relevante para o trabalho":
    "Worksheet details and starting information for the task",
  "Imagem ou ilustração que reforça o conceito central": "An image or illustration that reinforces the central concept",
  "Incluir APENAS se o professor pedir explicitamente. Quando presente: critérios de correção, soluções ou notas de acompanhamento. Reflexão final pode ser incluída sem pedido explícito quando fizer sentido para o tipo de ficha.":
    "Included ONLY if the teacher explicitly asks. When present: marking criteria, solutions or follow-up notes. A final reflection may be included without being asked when it suits the worksheet.",
  "Incluir APENAS se o professor pedir explicitamente. Quando presente: soluções, critérios de correção ou pistas de acompanhamento, claramente separados das tarefas.":
    "Included ONLY if the teacher explicitly asks. When present: solutions, marking criteria or follow-up hints, clearly separated from the tasks.",
  "Incluir APENAS se o professor pedir explicitamente. Quando presente: soluções, critérios de correção ou pistas de acompanhamento no final do documento, claramente separados das perguntas.":
    "Included ONLY if the teacher explicitly asks. When present: solutions, marking criteria or follow-up hints at the end, clearly separated from the questions.",
  "Informações do teste (nome, data, duração, cotações)": "Test details (name, date, duration, marks)",
  "Instrumentos e critérios de avaliação": "Assessment tools and criteria",
  "Materiais e recursos pedagógicos": "Teaching materials and resources",
  "Momento de participação e prática": "Participation and practice",
  "Momento de registo intermédio, reflexão, revisão ou síntese breve":
    "A mid-way checkpoint: record, reflect, review or briefly summarise",
  "Motivação e contextualização do tema": "Motivation and context for the topic",
  "Núcleo com várias perguntas, exercícios ou itens concretos, numerados e alinhados com o objetivo da ficha. O número de itens deve resultar da combinação do ano de escolaridade com a duração: anos iniciais (1.º-4.º) precisam sempre de menos itens e mais simples, anos superiores (10.º-12.º) admitem mais itens e maior profundidade. Variar formatos como completar, ligar, ordenar, assinalar, legendar, responder ou justificar brevemente.":
    "The core: numbered questions, exercises or items aligned with the worksheet's goal. The number of items depends on school year and duration — early years (1-4) need fewer, simpler items; upper years (10-12) allow more and deeper ones. Vary formats: complete, match, order, tick, label, answer or briefly justify.",
  "Orientações comuns a toda a ficha, incluindo tempo e forma de resposta quando aplicável":
    "Guidance for the whole worksheet, including time and how to answer where relevant",
  "Orientações e regras do quiz": "Quiz guidance and rules",
  "Orientações para realizar a ficha, rever respostas e gerir o tempo":
    "Guidance for doing the worksheet, reviewing answers and managing time",
  "Partilha e exposição dos resultados": "Sharing and presenting the results",
  "Pergunta ou problema que orienta o projeto": "The question or problem that drives the project",
  "Perguntas com opções de resposta": "Questions with answer options",
  "Perguntas curtas e diretas. Se houver pedido explicito do professor, pode incluir ate 1-2 abertas simples em contextos NEE/1.o-4.o ano.":
    "Short, direct questions. If the teacher explicitly asks, may include 1-2 simple open questions for SEN / Years 1-4.",
  "Pesquisa e exploração do tema": "Research and exploration of the topic",
  "Primeiro bloco de trabalho com tarefas mais guiadas ou de recolha de evidências":
    "First block of work with more guided or evidence-gathering tasks",
  "Primeiro conjunto de itens, tarefas ou questões organizado por foco ou nível de dificuldade":
    "First set of items, tasks or questions, organised by focus or difficulty",
  "Primeiro conjunto de tarefas ou questões com maior apoio e enquadramento":
    "First set of tasks or questions, with more support and context",
  "Processo e métodos utilizados no desenvolvimento do projeto":
    "Process and methods used in developing the project",
  "Principais aprendizagens e desafios superados": "Key learnings and challenges overcome",
  "Propósito da ficha, critérios de sucesso e foco principal do trabalho":
    "The worksheet's purpose, success criteria and main focus",
  "Propósito e metas do projeto": "Project purpose and goals",
  "Questões de seleção de resposta": "Selected-response questions",
  "Razões e evidências que contrariam a posição": "Reasons and evidence against the position",
  "Razões e evidências que suportam a posição": "Reasons and evidence supporting the position",
  "Resultados obtidos e evidências do trabalho realizado": "Results obtained and evidence of the work done",
  "Secção condicional: converter para resposta curta direta quando nao houver pedido explicito do professor.":
    "Conditional section: becomes short direct answers unless the teacher explicitly asks otherwise.",
  "Secção condicional: usar apenas com pedido explicito de questoes abertas. Em NEE/1.o-4.o ano, limitar a 1-2 abertas curtas e diretas.":
    "Conditional section: only used when open questions are explicitly requested. For SEN / Years 1-4, limited to 1-2 short, direct open questions.",
  "Segundo bloco com aplicação, comparação, análise ou aprofundamento":
    "Second block with application, comparison, analysis or deeper work",
  "Segundo conjunto de itens, tarefas ou questões com novo foco, formato ou grau de autonomia":
    "Second set of items, tasks or questions with a new focus, format or level of autonomy",
  "Segundo conjunto de tarefas com nova aplicação, aprofundamento ou maior autonomia":
    "Second set of tasks with new application, more depth or more autonomy",
  "Síntese, desafio final, reflexão ou verificação breve da aprendizagem, sem substituir o núcleo principal da ficha":
    "Summary, final challenge, reflection or a quick learning check",
  "Síntese dos pontos principais": "Summary of the key points",
  "Síntese e aplicação dos conhecimentos": "Summarising and applying what was learned",
  "Tarefa curta para recordar, observar, explorar ou diagnosticar o ponto de partida, com 1 a 3 perguntas ou estímulos diretos que ajudem os alunos a entrar no tema":
    "A short task to recall, observe, explore or check the starting point, with 1-3 direct questions or prompts to bring pupils into the topic",
  "Terceiro bloco opcional para consolidação, transferência ou extensão":
    "Optional third block for consolidation, transfer or extension",
  "Título, subtítulo e informações iniciais": "Title, subtitle and opening information",
  "Tópicos a abordar na apresentação": "Topics to cover in the presentation",
};

function toEnglish(text: string): string {
  if (!text) return text;
  return EN[text.trim().replace(/\s+/g, " ")] ?? text;
}

/** Shows a system template in the interface language; other templates are returned untouched. */
export function localizeSystemTemplate(
  template: DocumentTemplate,
  locale: Locale | null,
): DocumentTemplate {
  if (locale !== "en" || !template.isSystem) return template;
  return {
    ...template,
    name: toEnglish(template.name),
    description: toEnglish(template.description),
    sections: template.sections.map((section) => ({
      ...section,
      title: toEnglish(section.title),
      description: toEnglish(section.description),
    })),
  };
}
