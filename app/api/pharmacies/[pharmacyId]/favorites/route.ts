import { NextResponse } from "next/server";

import { getAccessTokenFromRequest } from "@/lib/supabase/auth";
import { createSupabaseRequestClient } from "@/lib/supabase/request-client";

export async function POST(
  request: Request,
  context: { params: Promise<{ pharmacyId: string }> }
) {
  try {
    const accessToken = getAccessTokenFromRequest(request);
    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized. Sign in to add favorites." },
        { status: 401 }
      );
    }

    const { pharmacyId } = await context.params;
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
      .insert({
        user_id: authData.user.id,
        pharmacy_id: pharmacyId,
      })
      .select("id, pharmacy_id, created_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ favorited: true, favorite: data });
      }
      return NextResponse.json(
        { error: "Failed to add favorite.", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ favorited: true, favorite: data });
  } catch {
    return NextResponse.json(
      { error: "Failed to add favorite." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ pharmacyId: string }> }
) {
  try {
    const accessToken = getAccessTokenFromRequest(request);
    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized. Sign in to manage favorites." },
        { status: 401 }
      );
    }

    const { pharmacyId } = await context.params;
    const supabase = createSupabaseRequestClient(accessToken);
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Invalid or expired token." },
        { status: 401 }
      );
    }

    const { error } = await supabase
      .from("user_pharmacy_favorites")
      .delete()
      .eq("user_id", authData.user.id)
      .eq("pharmacy_id", pharmacyId);

    if (error) {
      return NextResponse.json(
        { error: "Failed to remove favorite.", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ favorited: false });
  } catch {
    return NextResponse.json(
      { error: "Failed to remove favorite." },
      { status: 500 }
    );
  }
}
