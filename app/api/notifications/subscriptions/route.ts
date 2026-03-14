import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getAccessTokenFromRequest } from "@/lib/supabase/auth";
import { createSupabaseRequestClient } from "@/lib/supabase/request-client";
import { createStockAlertSubscriptionSchema } from "@/lib/validations/notifications";

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
      .from("stock_alert_subscriptions")
      .select(
        `
          id,
          user_id,
          medicine_id,
          latitude,
          longitude,
          radius_km,
          is_active,
          last_notified_at,
          created_at,
          updated_at,
          medicines (
            id,
            name,
            strength
          )
        `
      )
      .limit(limit)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to load stock alert subscriptions.", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ count: data?.length ?? 0, results: data ?? [] });
  } catch {
    return NextResponse.json(
      { error: "Unexpected error while loading stock alert subscriptions." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const accessToken = getAccessTokenFromRequest(request);

    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized. Bearer token is required." },
        { status: 401 }
      );
    }

    const payload = createStockAlertSubscriptionSchema.parse(await request.json());
    const supabase = createSupabaseRequestClient(accessToken);
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Invalid or expired token." },
        { status: 401 }
      );
    }

    const upsertData = {
      user_id: authData.user.id,
      medicine_id: payload.medicineId,
      latitude: payload.latitude,
      longitude: payload.longitude,
      radius_km: payload.radiusKm,
      is_active: true
    };

    const { data, error } = await supabase
      .from("stock_alert_subscriptions")
      .upsert(upsertData, {
        onConflict: "user_id,medicine_id,latitude,longitude"
      })
      .select(
        "id, user_id, medicine_id, latitude, longitude, radius_km, is_active, last_notified_at, created_at, updated_at"
      )
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to create stock alert subscription.", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ subscription: data }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid stock alert subscription payload.", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Unexpected error while creating stock alert subscription." },
      { status: 500 }
    );
  }
}
