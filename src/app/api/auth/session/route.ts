import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ user: null, session: null }, { status: 200 });
    }

    const { user } = session;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: userProfileData } = await serviceSupabase.rpc(
      "get_user_profile_with_permissions",
      { user_id: user.id }
    );

    const profile = userProfileData?.[0] || null;

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || profile?.full_name,
        role: profile?.role_name || "teacher",
        credits: profile?.credits_remaining || 0,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      profile,
      session,
    });
  } catch (error) {
    console.error("Session API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
