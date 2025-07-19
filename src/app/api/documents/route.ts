import { validateAPIRequest } from "@/lib/auth/apiAuth";
import { API_CONFIGS } from "@/lib/auth/utils";
import type { CreateDocumentRequest } from "@/lib/types/documents";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

/**
 * GET /api/documents - Get paginated documents for the current user with filtering
 */
export async function GET(request: NextRequest) {
  // Validate authentication and permissions
  const validation = await validateAPIRequest(
    request,
    API_CONFIGS.USER_DOCUMENTS
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

    // Build query
    let query = supabase
      .from("documents")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: CreateDocumentRequest = await req.json();

    if (!body.title || !body.document_type) {
      return NextResponse.json(
        { error: "Title and document_type are required" },
        { status: 400 }
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
        // Note: user_id will be set by a trigger or default value
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
