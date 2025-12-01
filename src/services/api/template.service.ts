/**
 * Template Service
 * Functions for template-related API calls
 * Currently mocked until backend is ready
 */

import type {
  DocumentTemplate,
  CreateTemplateParams,
  DocumentType,
} from "@/shared/types";

const MOCK_TEMPLATES: DocumentTemplate[] = [
  {
    id: "1",
    name: "Plano de Aula Tradicional",
    description:
      "Estrutura clássica com objetivos, desenvolvimento e avaliação",
    documentType: "lessonPlan",
    isDefault: true,
    isSystem: true,
    sections: [
      {
        id: "1-1",
        title: "Objetivos de Aprendizagem",
        description:
          "Liste os objetivos específicos que os alunos devem atingir ao final da aula",
        order: 0,
      },
      {
        id: "1-2",
        title: "Recursos Necessários",
        description:
          "Materiais, equipamentos e recursos digitais necessários para a aula",
        order: 1,
      },
      {
        id: "1-3",
        title: "Introdução",
        description:
          "Atividade de aquecimento ou contextualização do tema (5-10 min)",
        order: 2,
      },
      {
        id: "1-4",
        title: "Desenvolvimento",
        description:
          "Conteúdo principal da aula com explicações e atividades práticas",
        order: 3,
      },
      {
        id: "1-5",
        title: "Consolidação",
        description: "Exercícios ou atividades para consolidar a aprendizagem",
        order: 4,
      },
      {
        id: "1-6",
        title: "Avaliação",
        description: "Como será avaliada a aprendizagem dos alunos",
        order: 5,
      },
    ],
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "2",
    name: "Aula Baseada em Projeto",
    description: "Estrutura focada em aprendizagem por projetos (PBL)",
    documentType: "lessonPlan",
    isDefault: false,
    isSystem: true,
    sections: [
      {
        id: "2-1",
        title: "Questão Orientadora",
        description:
          "Pergunta central que guia o projeto e estimula a curiosidade",
        order: 0,
      },
      {
        id: "2-2",
        title: "Contexto do Problema",
        description: "Situação real ou simulada que os alunos devem resolver",
        order: 1,
      },
      {
        id: "2-3",
        title: "Investigação",
        description: "Etapas de pesquisa e exploração do tema pelos alunos",
        order: 2,
      },
      {
        id: "2-4",
        title: "Criação do Produto",
        description: "O que os alunos vão criar como resultado do projeto",
        order: 3,
      },
      {
        id: "2-5",
        title: "Apresentação",
        description: "Como os alunos vão partilhar o seu trabalho",
        order: 4,
      },
      {
        id: "2-6",
        title: "Reflexão",
        description: "Momento de auto-avaliação e reflexão sobre o processo",
        order: 5,
      },
    ],
    createdAt: "2024-01-20T14:30:00Z",
    updatedAt: "2024-01-20T14:30:00Z",
  },
  {
    id: "3",
    name: "Aula Invertida (Flipped)",
    description: "Modelo de sala de aula invertida",
    documentType: "lessonPlan",
    isDefault: false,
    isSystem: true,
    sections: [
      {
        id: "3-1",
        title: "Material Prévio",
        description:
          "Vídeos, leituras ou recursos para os alunos estudarem antes da aula",
        order: 0,
      },
      {
        id: "3-2",
        title: "Verificação de Compreensão",
        description: "Atividade inicial para verificar o estudo prévio",
        order: 1,
      },
      {
        id: "3-3",
        title: "Esclarecimento de Dúvidas",
        description: "Momento para esclarecer questões do material estudado",
        order: 2,
      },
      {
        id: "3-4",
        title: "Aplicação Prática",
        description: "Exercícios ou projetos para aplicar o conhecimento",
        order: 3,
      },
      {
        id: "3-5",
        title: "Extensão",
        description: "Desafios adicionais para alunos que terminam mais cedo",
        order: 4,
      },
    ],
    createdAt: "2024-02-01T09:15:00Z",
    updatedAt: "2024-02-01T09:15:00Z",
  },
  {
    id: "4",
    name: "Quiz Padrão",
    description: "Estrutura de quiz com questões variadas",
    documentType: "quiz",
    isDefault: true,
    isSystem: true,
    sections: [
      {
        id: "4-1",
        title: "Instruções",
        description: "Regras e instruções para a realização do quiz",
        order: 0,
      },
      {
        id: "4-2",
        title: "Questões de Escolha Múltipla",
        description: "Perguntas com várias opções de resposta",
        order: 1,
      },
      {
        id: "4-3",
        title: "Questões de Verdadeiro/Falso",
        description: "Afirmações para classificar como verdadeiras ou falsas",
        order: 2,
      },
      {
        id: "4-4",
        title: "Questões de Resposta Curta",
        description: "Perguntas que requerem respostas breves",
        order: 3,
      },
    ],
    createdAt: "2024-01-10T11:00:00Z",
    updatedAt: "2024-01-10T11:00:00Z",
  },
  {
    id: "5",
    name: "Teste Formal",
    description: "Estrutura de teste com cotações",
    documentType: "test",
    isDefault: true,
    isSystem: true,
    sections: [
      {
        id: "5-1",
        title: "Cabeçalho",
        description: "Nome, data, turma e cotação total",
        order: 0,
      },
      {
        id: "5-2",
        title: "Grupo I - Escolha Múltipla",
        description: "Questões objetivas com cotação definida",
        order: 1,
      },
      {
        id: "5-3",
        title: "Grupo II - Desenvolvimento",
        description: "Questões que requerem resposta desenvolvida",
        order: 2,
      },
      {
        id: "5-4",
        title: "Grupo III - Problema/Caso",
        description: "Problema prático ou estudo de caso",
        order: 3,
      },
    ],
    createdAt: "2024-01-12T16:45:00Z",
    updatedAt: "2024-01-12T16:45:00Z",
  },
  {
    id: "6",
    name: "Apresentação Educativa",
    description: "Estrutura para apresentações de conteúdo",
    documentType: "presentation",
    isDefault: true,
    isSystem: true,
    sections: [
      {
        id: "6-1",
        title: "Slide de Título",
        description: "Título da apresentação e informações básicas",
        order: 0,
      },
      {
        id: "6-2",
        title: "Índice/Agenda",
        description: "Tópicos que serão abordados",
        order: 1,
      },
      {
        id: "6-3",
        title: "Introdução ao Tema",
        description: "Contextualização e motivação para o tema",
        order: 2,
      },
      {
        id: "6-4",
        title: "Conteúdo Principal",
        description: "Slides com o conteúdo desenvolvido",
        order: 3,
      },
      {
        id: "6-5",
        title: "Atividade Interativa",
        description: "Slide com pergunta ou atividade para os alunos",
        order: 4,
      },
      {
        id: "6-6",
        title: "Resumo/Conclusão",
        description: "Pontos principais e conclusões",
        order: 5,
      },
      {
        id: "6-7",
        title: "Referências",
        description: "Fontes e materiais de apoio",
        order: 6,
      },
    ],
    createdAt: "2024-01-18T13:20:00Z",
    updatedAt: "2024-01-18T13:20:00Z",
  },
];

let mockTemplatesStore = [...MOCK_TEMPLATES];

/**
 * Get all templates for a specific document type
 */
export async function getTemplates(
  documentType: DocumentType
): Promise<DocumentTemplate[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  return mockTemplatesStore.filter(
    (template) => template.documentType === documentType
  );
}

/**
 * Get a single template by ID
 */
export async function getTemplate(
  id: string
): Promise<DocumentTemplate | null> {
  await new Promise((resolve) => setTimeout(resolve, 200));

  return mockTemplatesStore.find((template) => template.id === id) || null;
}

/**
 * Create a new template
 */
export async function createTemplate(
  params: CreateTemplateParams
): Promise<DocumentTemplate> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const newTemplate: DocumentTemplate = {
    id: `custom-${Date.now()}`,
    name: params.name,
    description: params.description,
    documentType: params.documentType,
    isDefault: false,
    isSystem: false,
    sections: params.sections.map((section, index) => ({
      ...section,
      id: `${Date.now()}-${index}`,
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  mockTemplatesStore.push(newTemplate);

  return newTemplate;
}

/**
 * Update an existing template
 */
export async function updateTemplate(
  id: string,
  params: Partial<CreateTemplateParams>
): Promise<DocumentTemplate> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const templateIndex = mockTemplatesStore.findIndex((t) => t.id === id);
  if (templateIndex === -1) {
    throw new Error("Template not found");
  }

  const existingTemplate = mockTemplatesStore[templateIndex];

  const updatedTemplate: DocumentTemplate = {
    ...existingTemplate,
    name: params.name ?? existingTemplate.name,
    description: params.description ?? existingTemplate.description,
    sections: params.sections
      ? params.sections.map((section, index) => ({
          ...section,
          id: `${Date.now()}-${index}`,
        }))
      : existingTemplate.sections,
    updatedAt: new Date().toISOString(),
  };

  mockTemplatesStore[templateIndex] = updatedTemplate;

  return updatedTemplate;
}

/**
 * Delete a template
 */
export async function deleteTemplate(id: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  mockTemplatesStore = mockTemplatesStore.filter(
    (template) => template.id !== id
  );
}
