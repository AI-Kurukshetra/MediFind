import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getAccessTokenFromRequest } from "@/lib/supabase/auth";
import { createSupabaseRequestClient } from "@/lib/supabase/request-client";
import { registerPharmacySchema } from "@/lib/validations/pharmacy";

export async function POST(request: Request) {
  try {
    const accessToken = getAccessTokenFromRequest(request);

    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized. Bearer token is required." },
        { status: 401 }
      );
    }

    const payload = registerPharmacySchema.parse(await request.json());
    const supabase = createSupabaseRequestClient(accessToken);
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Invalid or expired token." },
        { status: 401 }
      );
    }

    const { data: existingPharmacy } = await supabase
      .from("pharmacies")
      .select("id, name")
      .eq("owner_user_id", authData.user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existingPharmacy) {
      return NextResponse.json(
        {
          error: "Pharmacy already registered for this account.",
          pharmacy: existingPharmacy
        },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("pharmacies")
      .insert({
        owner_user_id: authData.user.id,
        name: payload.name,
        address_line1: payload.addressLine1,
        address_line2: payload.addressLine2 ?? null,
        city: payload.city,
        state: payload.state,
        postal_code: payload.postalCode,
        country: payload.country,
        latitude: payload.latitude,
        longitude: payload.longitude,
        contact_phone: payload.contactPhone ?? null,
        is_active: true
      })
      .select(
        "id, owner_user_id, name, address_line1, address_line2, city, state, postal_code, country, latitude, longitude, contact_phone, is_verified, is_active, created_at, updated_at"
      )
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Failed to register pharmacy.", details: error?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ pharmacy: data }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid pharmacy registration payload.", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Unexpected error during pharmacy registration." },
      { status: 500 }
    );
  }
}