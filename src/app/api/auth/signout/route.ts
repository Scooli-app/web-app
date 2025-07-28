import { NextResponse, type NextRequest } from "next/server";

export async function POST(_request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true });

    response.cookies.delete("sb-access-token");
    response.cookies.delete("sb-refresh-token");
    response.cookies.delete("supabase-auth-token");

    return response;
  } catch (error) {
    console.error("Sign-out API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
