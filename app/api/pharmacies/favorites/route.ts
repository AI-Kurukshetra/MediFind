import { NextResponse } from "next/server";

import { getAccessTokenFromRequest } from "@/lib/supabase/auth";
import { createSupabaseRequestClient } from "@/lib/supabase/request-client";

export async function GET(request: Request) {
  try {
    const accessToken = getAccessTokenFromRequest(request);
    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized. Sign in to view favorites." },
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

    const { data, error } = await supabase
      .from("user_pharmacy_favorites")
      .select(
        `
        id,
        pharmacy_id,
        created_at,
        pharmacies (
          id,
          name,
          latitude,
          longitude,
          address_line1,
          city
        )
      `
      )
      .eq("user_id", authData.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to load favorites.", details: error.message },
        { status: 500 }
      );
    }

    const favorites = (data ?? []).map((row: { id: string; pharmacy_id: string; pharmacies: unknown }) => ({
      id: row.id,
      pharmacyId: row.pharmacy_id,
      pharmacy: row.pharmacies,
    }));

    return NextResponse.json({ favorites });
  } catch {
    return NextResponse.json(
      { error: "Failed to load favorites." },
      { status: 500 }
    );
  }
}
