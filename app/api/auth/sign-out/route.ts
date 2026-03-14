import { NextResponse } from "next/server";

import { getAccessTokenFromRequest } from "@/lib/supabase/auth";
import { createSupabaseRequestClient } from "@/lib/supabase/request-client";

export async function POST(request: Request) {
  const accessToken = getAccessTokenFromRequest(request);

  if (!accessToken) {
    return NextResponse.json(
      { error: "Unauthorized. Bearer token is required." },
      { status: 401 }
    );
  }

  const supabase = createSupabaseRequestClient(accessToken);
  const { error } = await supabase.auth.signOut();

  if (error) {
    return NextResponse.json(
      {
        error: "Failed to sign out.",
        details: error.message
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: "Signed out successfully." });
}