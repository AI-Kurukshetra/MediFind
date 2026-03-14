import { NextResponse } from "next/server";

import { getAccessTokenFromRequest } from "@/lib/supabase/auth";
import { createSupabaseRequestClient } from "@/lib/supabase/request-client";

export async function GET(request: Request) {
  try {
    const accessToken = getAccessTokenFromRequest(request);

    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized. Bearer token is required." },
        { status: 401 }
      );
    }

    const supabase = createSupabaseRequestClient(accessToken);
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Invalid or expired token." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const rawLimit = Number(searchParams.get("limit") ?? "50");
    const limit = Number.isFinite(rawLimit)
      ? Math.min(200, Math.max(1, Math.trunc(rawLimit)))
      : 50;

    const { data, error } = await supabase
      .from("notifications")
      .select("id, user_id, type, title, message, is_read, metadata, created_at, updated_at")
      .limit(limit)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to load notifications.", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ count: data?.length ?? 0, results: data ?? [] });
  } catch {
    return NextResponse.json(
      { error: "Unexpected error while loading notifications." },
      { status: 500 }
    );
  }
}
