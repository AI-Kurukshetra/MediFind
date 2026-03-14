import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getAccessTokenFromRequest } from "@/lib/supabase/auth";
import { createSupabaseRequestClient } from "@/lib/supabase/request-client";
import { createPrescriptionRecordSchema } from "@/lib/validations/prescriptions";

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
      .from("prescriptions")
      .select(
        `
          id,
          user_id,
          order_id,
          file_path,
          verified_by,
          verified_at,
          status,
          notes,
          created_at,
          updated_at,
          orders (
            id,
            order_type,
            status,
            pharmacy_id,
            medicine_id
          )
        `
      )
      .limit(limit)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to load prescriptions.", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ count: data?.length ?? 0, results: data ?? [] });
  } catch {
    return NextResponse.json(
      { error: "Unexpected error while loading prescriptions." },
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

    const payload = createPrescriptionRecordSchema.parse(await request.json());
    const supabase = createSupabaseRequestClient(accessToken);
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Invalid or expired token." },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("prescriptions")
      .insert({
        user_id: authData.user.id,
        order_id: payload.orderId ?? null,
        file_path: payload.filePath,
        status: "uploaded",
        notes: payload.notes ?? null
      })
      .select(
        "id, user_id, order_id, file_path, verified_by, verified_at, status, notes, created_at, updated_at"
      )
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to create prescription record.", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ prescription: data }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid prescription payload.", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Unexpected error while creating prescription record." },
      { status: 500 }
    );
  }
}
