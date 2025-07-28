import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get("authorization");
    let token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      const cookieNames = ["sb-access-token", "supabase-auth-token"];

      for (const cookieName of cookieNames) {
        const cookieValue = request.cookies.get(cookieName)?.value;
        if (cookieValue) {
          token = cookieValue;
          break;
        }
      }

      if (!token) {
        return NextResponse.json(
          { user: null, session: null },
          { status: 200 }
        );
      }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json({ user: null, session: null }, { status: 200 });
    }

    const { data: userProfileData } = await supabase.rpc(
      "get_user_profile_with_permissions",
      { user_id: user.id }
    );

    const profile = userProfileData?.[0] || null;

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || profile?.full_name,
        role: profile?.role_name || "teacher",
        credits: profile?.credits_remaining || 0,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      profile,
      session: { user },
    });
  } catch (error) {
    console.error("Session API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
