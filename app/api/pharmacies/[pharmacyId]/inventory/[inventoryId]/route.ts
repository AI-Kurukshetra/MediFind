import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getAccessTokenFromRequest } from "@/lib/supabase/auth";
import { createSupabaseRequestClient } from "@/lib/supabase/request-client";
import {
  inventoryRecordParamsSchema,
  updateInventorySchema
} from "@/lib/validations/inventory";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ pharmacyId: string; inventoryId: string }> }
) {
  try {
    const params = inventoryRecordParamsSchema.parse(await context.params);
    const accessToken = getAccessTokenFromRequest(request);

    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized. Bearer token is required." },
        { status: 401 }
      );
    }

    const body = updateInventorySchema.parse(await request.json());
    const supabase = createSupabaseRequestClient(accessToken);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return NextResponse.json(
        { error: "Invalid or expired token." },
        { status: 401 }
      );
    }

    const updatePayload: {
      quantity?: number;
      unit_price?: number | null;
      is_available?: boolean;
      last_restocked_at?: string | null;
    } = {};

    if (body.quantity !== undefined) {
      updatePayload.quantity = body.quantity;
    }

    if (body.unitPrice !== undefined) {
      updatePayload.unit_price = body.unitPrice;
    }

    if (body.isAvailable !== undefined) {
      updatePayload.is_available = body.isAvailable;
    }

    if (body.lastRestockedAt !== undefined) {
      updatePayload.last_restocked_at = body.lastRestockedAt;
    }

    const { data, error } = await supabase
      .from("inventory")
      .update(updatePayload)
      .eq("id", params.inventoryId)
      .eq("pharmacy_id", params.pharmacyId)
      .select(
        "id, pharmacy_id, medicine_id, quantity, unit_price, is_available, last_restocked_at, created_at, updated_at"
      )
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;

      return NextResponse.json(
        {
          error:
            status === 404
              ? "Inventory record not found for this pharmacy."
              : "Failed to update inventory record.",
          details: error.message
        },
        { status }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid inventory update payload.",
          issues: error.issues
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Unexpected error while updating inventory record."
      },
      { status: 500 }
    );
  }
}