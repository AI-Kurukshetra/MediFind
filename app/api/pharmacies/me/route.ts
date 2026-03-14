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

    const { data, error } = await supabase
      .from("pharmacies")
      .select(
        "id, owner_user_id, name, address_line1, address_line2, city, state, postal_code, country, latitude, longitude, contact_phone, is_verified, is_active, created_at, updated_at"
      )
      .eq("owner_user_id", authData.user.id)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "Failed to load pharmacies.", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      count: data?.length ?? 0,
      pharmacies: data ?? [],
      primaryPharmacy: data?.[0] ?? null
    });
  } catch {
    return NextResponse.json(
      { error: "Unexpected error while loading pharmacies." },
      { status: 500 }
    );
  }
}