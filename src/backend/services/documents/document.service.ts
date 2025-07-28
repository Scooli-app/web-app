import type { Document, PaginatedResponse } from "@/shared/types";
import { supabase } from "../../services/client";

export interface UpdateDocumentData extends Partial<Document> {
  id: string;
}

export interface DocumentFilters {
  query?: string;
  document_type?: Document["document_type"];
  subject?: string;
  grade_level?: string;
  is_public?: boolean;
  user_id?: string;
}

export class DocumentService {
  // Get documents with pagination and filters
  static async getDocuments(
    page: number = 1,
    limit: number = 10,
    filters?: DocumentFilters
  ): Promise<PaginatedResponse<Document>> {
    try {
      let query = supabase.from("documents").select("*", { count: "exact" });

      // Apply filters
      if (filters?.query) {
        query = query.or(
          `title.ilike.%${filters.query}%,content.ilike.%${filters.query}%`
        );
      }
      if (filters?.document_type) {
        query = query.eq("document_type", filters.document_type);
      }
      if (filters?.subject) {
        query = query.eq("subject", filters.subject);
      }
      if (filters?.grade_level) {
        query = query.eq("grade_level", filters.grade_level);
      }
      if (filters?.is_public !== undefined) {
        query = query.eq("is_public", filters.is_public);
      }
      if (filters?.user_id) {
        query = query.eq("user_id", filters.user_id);
      }

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to).order("created_at", { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      return {
        data: data as Document[],
        total: count || 0,
        page,
        limit,
        hasMore: (count || 0) > page * limit,
      };
    } catch (error) {
      console.error("Error fetching documents:", error);
      return {
        data: [],
        total: 0,
        page,
        limit,
        hasMore: false,
      };
    }
  }

  // Get a single document by ID
  static async getDocument(id: string): Promise<Document | null> {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        throw error;
      }

      return data as Document;
    } catch (error) {
      console.error("Error fetching document:", error);
      return null;
    }
  }

  // Create a new document
  static async createDocument(
    data: Partial<Document>,
    userId: string
  ): Promise<{ document?: Document; error?: string }> {
    try {
      // Check if the data already has the user_id field
      const documentData = {
        title: data.title || "",
        content: data.content || "",
        document_type: data.document_type || "lesson_plan",
        metadata: data.metadata || {},
        is_public: data.is_public || false,
        subject: data.subject || null,
        grade_level: data.grade_level || null,
        user_id: userId,
        downloads: 0,
      };

      const { data: document, error } = await supabase
        .from("documents")
        .insert(documentData)
        .select()
        .single();

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      return { document: document as Document };
    } catch (error) {
      console.error("Error creating document:", error);
      return {
        error:
          error instanceof Error ? error.message : "Failed to create document",
      };
    }
  }

  // Update a document
  static async updateDocument(
    data: UpdateDocumentData
  ): Promise<{ document?: Document; error?: string }> {
    try {
      const { id, ...updates } = data;
      const { data: document, error } = await supabase
        .from("documents")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return { document: document as Document };
    } catch (error) {
      return {
        error:
          error instanceof Error ? error.message : "Failed to update document",
      };
    }
  }

  // Delete a document
  static async deleteDocument(id: string): Promise<{ error?: string }> {
    try {
      const { error } = await supabase.from("documents").delete().eq("id", id);

      if (error) {
        throw error;
      }

      return {};
    } catch (error) {
      return {
        error:
          error instanceof Error ? error.message : "Failed to delete document",
      };
    }
  }

  // Increment download count
  static async incrementDownloads(id: string): Promise<{ error?: string }> {
    try {
      const { error } = await supabase.rpc("increment_downloads", {
        document_id: id,
      });
      if (error) {
        throw error;
      }
      return {};
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "Failed to increment downloads",
      };
    }
  }

  // Rate a document
  static async rateDocument(
    id: string,
    rating: number
  ): Promise<{ error?: string }> {
    try {
      const { error } = await supabase.rpc("rate_document", {
        p_document_id: id,
        p_rating: rating,
      });

      if (error) {
        throw error;
      }

      return {};
    } catch (error) {
      console.error("Error rating document:", error);
      return {
        error:
          error instanceof Error ? error.message : "Failed to rate document",
      };
    }
  }

  // Get user's documents
  static async getUserDocuments(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<Document>> {
    return this.getDocuments(page, limit, { user_id: userId });
  }

  // Get public documents (community library)
  static async getPublicDocuments(
    page: number = 1,
    limit: number = 10,
    filters?: Omit<DocumentFilters, "is_public">
  ): Promise<PaginatedResponse<Document>> {
    return this.getDocuments(page, limit, { ...filters, is_public: true });
  }
}
