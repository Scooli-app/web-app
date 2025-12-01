/**
 * Template types and interfaces
 */

import type { DocumentType } from "./document";

export interface TemplateSection {
  id: string;
  title: string;
  description: string;
  order: number;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  documentType: DocumentType;
  sections: TemplateSection[];
  isDefault: boolean;
  isSystem: boolean;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateParams {
  name: string;
  description: string;
  documentType: DocumentType;
  sections: Omit<TemplateSection, "id">[];
}

export interface UpdateTemplateParams {
  id: string;
  name?: string;
  description?: string;
  sections?: Omit<TemplateSection, "id">[];
}
