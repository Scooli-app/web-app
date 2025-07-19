import type {
  CreateDocumentRequest,
  Document,
  UpdateDocumentRequest,
} from "@/lib/types/documents";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

export class DocumentService {
  private supabase:
    | ReturnType<typeof createClientComponentClient>
    | ReturnType<typeof createClient>;

  constructor(useServerClient = false) {
    if (useServerClient) {
      // Server-side client for API routes
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("Missing Supabase environment variables");
      }

      this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    } else {
      // Client-side client for components
      this.supabase = createClientComponentClient();
    }
  }

  /**
   * Get the current authenticated user
   */
  async getCurrentUser() {
    const {
      data: { user },
      error,
    } = await this.supabase.auth.getUser();

    if (error || !user) {
      throw new Error("Not authenticated");
    }

    return user;
  }

  /**
   * Create a new document
   */
  async createDocument(data: CreateDocumentRequest): Promise<Document> {
    const { data: document, error } = await this.supabase
      .from("documents")
      .insert({
        title: data.title,
        content: data.content || "",
        document_type: data.document_type,
        metadata: data.metadata || {},
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create document: ${error.message}`);
    }

    if (!document) {
      throw new Error("No document returned from create operation");
    }

    return document as unknown as Document;
  }

  /**
   * Get a document by ID
   */
  async getDocument(id: string): Promise<Document | null> {
    const { data, error } = await this.supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Document not found
      }
      throw new Error(`Failed to get document: ${error.message}`);
    }

    return data as unknown as Document;
  }

  /**
   * Update a document
   */
  async updateDocument(
    id: string,
    updates: UpdateDocumentRequest
  ): Promise<Document> {
    const { data, error } = await this.supabase
      .from("documents")
      .update(updates as Record<string, unknown>)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update document: ${error.message}`);
    }

    return data as unknown as Document;
  }

  /**
   * Get all documents for the current user
   */
  async getUserDocuments(): Promise<Document[]> {
    const { data, error } = await this.supabase
      .from("documents")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to get user documents: ${error.message}`);
    }

    return (data || []) as unknown as Document[];
  }

  /**
   * Delete a document
   */
  async deleteDocument(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("documents")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(`Failed to delete document: ${error.message}`);
    }
  }
}

/**
 * Debounced save utility for document content
 */
export class DebouncedSaver {
  private timeoutId: NodeJS.Timeout | null = null;
  private saveFunction: () => Promise<void>;

  constructor(saveFunction: () => Promise<void>, _delay: number = 3000) {
    this.saveFunction = saveFunction;
  }

  /**
   * Trigger a debounced save
   */
  trigger(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(async () => {
      try {
        await this.saveFunction();
      } catch (error) {
        console.error("Failed to save document:", error);
      }
    }, 3000);
  }

  /**
   * Cancel pending save
   */
  cancel(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * Force immediate save
   */
  async saveNow(): Promise<void> {
    this.cancel();
    await this.saveFunction();
  }
}
