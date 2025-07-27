import { validateAPIRequest } from "@/shared/auth/apiAuth";
import { API_CONFIGS } from "@/shared/auth/utils";
import type { APIProtectionConfig } from "@/shared/types/auth";
import type {
  CreateDocumentRequest,
  DeleteDocumentRequest,
} from "@/shared/types/documents";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

/**
 * GET /api/documents - Get paginated documents for the current user with filtering
 */
export async function GET(request: NextRequest) {
  // Validate authentication and permissions
  const validation = await validateAPIRequest(
    request,
    API_CONFIGS.USER_DOCUMENTS as unknown as APIProtectionConfig
  );

  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error?.message },
      { status: validation.error?.status || 500 }
    );
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase environment variables");
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const documentType = searchParams.get("type");
    const userId = searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Build query - exclude soft-deleted documents
    let query = supabase
      .from("documents")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .is("deleted_at", null) // Exclude soft-deleted documents
      .order("updated_at", { ascending: false });

    // Add document type filter if provided
    if (documentType && documentType !== "all") {
      query = query.eq("document_type", documentType);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: documents, error, count } = await query;

    if (error) {
      console.error("Error fetching documents:", error);
      return NextResponse.json(
        { error: "Failed to fetch documents" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      documents: documents || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/documents - Create a new document
 */
export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase environment variables");
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: CreateDocumentRequest = await req.json();

    if (!body.title || !body.document_type) {
      return NextResponse.json(
        { error: "Title and document_type are required" },
        { status: 400 }
      );
    }

    // Extract user_id from the request if available
    const authHeader = req.headers.get("authorization");
    let userId = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser(token);

      if (!userError && user) {
        userId = user.id;
      }
    }

    // If no user ID was found, check if it was provided in the body
    if (!userId && body.user_id) {
      userId = body.user_id;
    }

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 401 }
      );
    }

    // Create document with service role (bypasses RLS)
    const { data: document, error } = await supabase
      .from("documents")
      .insert({
        title: body.title,
        content: body.content || "",
        document_type: body.document_type,
        metadata: body.metadata || {},
        user_id: userId,
        is_public: body.is_public || false,
        subject: body.subject || null,
        grade_level: body.grade_level || null,
        downloads: 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating document:", error);
      return NextResponse.json(
        { error: "Failed to create document" },
        { status: 500 }
      );
    }

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Error creating document:", error);
    return NextResponse.json(
      { error: "Failed to create document" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/documents - Soft delete documents
 */
export async function DELETE(request: NextRequest) {
  // Validate authentication and permissions
  const validation = await validateAPIRequest(
    request,
    API_CONFIGS.DELETE_DOCUMENTS as unknown as APIProtectionConfig
  );

  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error?.message },
      { status: validation.error?.status || 500 }
    );
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    const body: DeleteDocumentRequest = await request.json();

    if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json(
        { error: "Document IDs are required" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const userId = validation.profile?.id;

    if (!userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 400 });
    }

    // Soft delete documents (set deleted_at and deleted_by)
    const { data: deletedDocuments, error } = await supabase
      .from("documents")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
      })
      .in("id", body.ids)
      .eq("user_id", userId) // Ensure user can only delete their own documents
      .is("deleted_at", null) // Only delete documents that aren't already deleted
      .select();

    if (error) {
      console.error("Error soft deleting documents:", error);
      return NextResponse.json(
        { error: "Failed to delete documents" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `${
        deletedDocuments?.length || 0
      } document(s) deleted successfully`,
      deletedCount: deletedDocuments?.length || 0,
    });
  } catch (error) {
    console.error("Error deleting documents:", error);
    return NextResponse.json(
      { error: "Failed to delete documents" },
      { status: 500 }
    );
  }
}
