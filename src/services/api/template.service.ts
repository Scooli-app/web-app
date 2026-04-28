/**
 * Template Service
 * Functions for template-related API calls
 */

import type {
  DocumentTemplate,
  CreateTemplateParams,
  DocumentType,
  TemplateSection,
} from "@/shared/types";
import apiClient from "./client";

interface TemplateSectionResponse {
  id: string;
  title: string;
  description: string;
  order: number;
}

interface TemplateResponse {
  id: string;
  name: string;
  description: string;
  documentType: DocumentType;
  sections: TemplateSectionResponse[];
  isDefault: boolean;
  isSystem: boolean;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateTemplateRequest {
  name: string;
  description: string;
  documentType: DocumentType;
  sections: {
    title: string;
    description: string;
    order: number;
  }[];
}

interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  sections?: {
    title: string;
    description: string;
    order: number;
  }[];
}

function mapResponseToTemplate(response: TemplateResponse): DocumentTemplate {
  return {
    id: response.id,
    name: response.name,
    description: response.description,
    documentType: response.documentType,
    sections: response.sections.map(
      (section): TemplateSection => ({
        id: section.id,
        title: section.title,
        description: section.description,
        order: section.order,
      })
    ),
    isDefault: response.isDefault,
    isSystem: response.isSystem,
    userId: response.userId,
    createdAt: response.createdAt,
    updatedAt: response.updatedAt,
  };
}

/**
 * Get all templates for a specific document type
 */
export async function getTemplates(
  documentType: DocumentType
): Promise<DocumentTemplate[]> {
  const response = await apiClient.get<TemplateResponse[]>("/templates", {
    params: { documentType },
  });

  if (response.status !== 200) {
    throw new Error(`Não foi possível carregar os modelos (HTTP ${response.status})`);
  }

  return response.data.map(mapResponseToTemplate);
}

/**
 * Get a single template by ID
 */


/**
 * Create a new template
 */
export async function createTemplate(
  params: CreateTemplateParams
): Promise<DocumentTemplate> {
  const request: CreateTemplateRequest = {
    name: params.name,
    description: params.description,
    documentType: params.documentType,
    sections: params.sections.map((section, index) => ({
      title: section.title,
      description: section.description,
      order: section.order ?? index,
    })),
  };

  const response = await apiClient.post<TemplateResponse>(
    "/templates",
    request
  );

  if (response.status !== 200 && response.status !== 201) {
    throw new Error(`Não foi possível criar o modelo (HTTP ${response.status})`);
  }

  return mapResponseToTemplate(response.data);
}

/**
 * Update an existing template
 */
export async function updateTemplate(
  id: string,
  params: Partial<CreateTemplateParams>
): Promise<DocumentTemplate> {
  const request: UpdateTemplateRequest = {};

  if (params.name !== undefined) {
    request.name = params.name;
  }

  if (params.description !== undefined) {
    request.description = params.description;
  }

  if (params.sections !== undefined) {
    request.sections = params.sections.map((section, index) => ({
      title: section.title,
      description: section.description,
      order: section.order ?? index,
    }));
  }

  const response = await apiClient.put<TemplateResponse>(
    `/templates/${id}`,
    request
  );

  if (response.status !== 200) {
    throw new Error(`Não foi possível atualizar o modelo (HTTP ${response.status})`);
  }

  return mapResponseToTemplate(response.data);
}

/**
 * Set a template as the default for its document type
 */
export async function setDefaultTemplate(
  id: string
): Promise<DocumentTemplate> {
  const response = await apiClient.put<TemplateResponse>(
    `/templates/${id}/default`
  );

  if (response.status !== 200) {
    throw new Error(`Não foi possível definir o modelo padrão (HTTP ${response.status})`);
  }

  return mapResponseToTemplate(response.data);
}

/**
 * Create a new template from an uploaded document using AI extraction.
 * Expects the file to have already been uploaded via getUploadUrl + PUT.
 */
export async function createTemplateFromDocument(params: {
  fileKey: string;
  documentType: DocumentType;
  name: string;
}): Promise<DocumentTemplate> {
  const response = await apiClient.post<TemplateResponse>(
    "/templates/from-document",
    params
  );

  if (response.status !== 200 && response.status !== 201) {
    throw new Error(
      `Não foi possível criar o modelo a partir do documento (HTTP ${response.status})`
    );
  }

  return mapResponseToTemplate(response.data);
}

/**
 * Delete a template
 */

