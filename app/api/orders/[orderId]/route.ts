import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getAccessTokenFromRequest } from "@/lib/supabase/auth";
import { createSupabaseRequestClient } from "@/lib/supabase/request-client";
import { orderParamsSchema, updateOrderStatusSchema } from "@/lib/validations/orders";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const accessToken = getAccessTokenFromRequest(request);

    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized. Bearer token is required." },
        { status: 401 }
      );
    }

    const params = orderParamsSchema.parse(await context.params);
    const payload = updateOrderStatusSchema.parse(await request.json());

    const supabase = createSupabaseRequestClient(accessToken);
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Invalid or expired token." },
        { status: 401 }
      );
    }

    const { data: orderRecord, error: orderLookupError } = await supabase
      .from("orders")
      .select("id, user_id, pharmacy_id, status, order_type")
      .eq("id", params.orderId)
      .single();

    if (orderLookupError || !orderRecord) {
      const status = orderLookupError?.code === "PGRST116" ? 404 : 500;
      return NextResponse.json(
        {
          error: status === 404 ? "Order not found." : "Failed to load order.",
          details: orderLookupError?.message
        },
        { status }
      );
    }

    const isPatientOwner = orderRecord.user_id === authData.user.id;
    const { data: pharmacyRecord } = await supabase
      .from("pharmacies")
      .select("id")
      .eq("id", orderRecord.pharmacy_id)
      .eq("owner_user_id", authData.user.id)
      .maybeSingle();
    const isPharmacyOwner = Boolean(pharmacyRecord);

    if (!isPatientOwner && !isPharmacyOwner) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (isPatientOwner && !isPharmacyOwner && payload.status !== "cancelled") {
      return NextResponse.json(
        { error: "Patients can only cancel their own orders." },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("orders")
      .update({ status: payload.status })
      .eq("id", params.orderId)
      .select(
        "id, user_id, pharmacy_id, medicine_id, order_type, quantity, status, prescription_required, notes, created_at, updated_at"
      )
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;

      return NextResponse.json(
        {
          error:
            status === 404
              ? "Order not found."
              : "Failed to update order status.",
          details: error.message
        },
        { status }
      );
    }

    // When pharmacy marks a delivery order as completed, sync delivery_request to delivered
    if (
      isPharmacyOwner &&
      payload.status === "completed" &&
      orderRecord.order_type === "delivery"
    ) {
      await supabase
        .from("delivery_requests")
        .update({
          status: "delivered",
          delivered_at: new Date().toISOString(),
        })
        .eq("order_id", params.orderId);
    }

    return NextResponse.json({ order: data });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid order status update payload.", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Unexpected error while updating order status." },
      { status: 500 }
    );
  }
}
