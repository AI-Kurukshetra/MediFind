import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getAccessTokenFromRequest } from "@/lib/supabase/auth";
import { createSupabaseRequestClient } from "@/lib/supabase/request-client";
import {
  createInventorySchema,
  pharmacyInventoryParamsSchema
} from "@/lib/validations/inventory";

export async function GET(
  request: Request,
  context: { params: Promise<{ pharmacyId: string }> }
) {
  try {
    const params = pharmacyInventoryParamsSchema.parse(await context.params);
    const { searchParams } = new URL(request.url);
    const includeUnavailable = searchParams.get("includeUnavailable") === "true";

    const accessToken = getAccessTokenFromRequest(request);
    const supabase = createSupabaseRequestClient(accessToken ?? undefined);

    let query = supabase
      .from("inventory")
      .select(
        `
          id,
          pharmacy_id,
          medicine_id,
          quantity,
          unit_price,
          is_available,
          last_restocked_at,
          updated_at,
          medicines!inner(
            id,
            name,
            generic_name,
            strength,
            dosage_form,
            manufacturer,
            requires_prescription
          )
        `
      )
      .eq("pharmacy_id", params.pharmacyId)
      .order("updated_at", { ascending: false });

    if (!includeUnavailable) {
      query = query.eq("is_available", true).gt("quantity", 0);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        {
          error: "Failed to fetch inventory.",
          details: error.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      pharmacyId: params.pharmacyId,
      includeUnavailable,
      count: data?.length ?? 0,
      results: data ?? []
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid inventory request parameters.",
          issues: error.issues
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Unexpected error while fetching inventory."
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ pharmacyId: string }> }
) {
  try {
    const params = pharmacyInventoryParamsSchema.parse(await context.params);
    const accessToken = getAccessTokenFromRequest(request);

    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized. Bearer token is required." },
        { status: 401 }
      );
    }

    const body = createInventorySchema.parse(await request.json());
    const supabase = createSupabaseRequestClient(accessToken);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return NextResponse.json(
        { error: "Invalid or expired token." },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("inventory")
      .insert({
        pharmacy_id: params.pharmacyId,
        medicine_id: body.medicineId,
        quantity: body.quantity,
        unit_price: body.unitPrice ?? null,
        is_available: body.isAvailable ?? body.quantity > 0,
        last_restocked_at: body.lastRestockedAt ?? null
      })
      .select(
        "id, pharmacy_id, medicine_id, quantity, unit_price, is_available, last_restocked_at, created_at, updated_at"
      )
      .single();

    if (error) {
      const status = error.code === "23505" ? 409 : 500;
      return NextResponse.json(
        {
          error:
            status === 409
              ? "Inventory for this medicine already exists in the pharmacy."
              : "Failed to create inventory record.",
          details: error.message
        },
        { status }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid inventory payload.",
          issues: error.issues
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Unexpected error while creating inventory record."
      },
      { status: 500 }
    );
  }
}