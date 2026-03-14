import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getAccessTokenFromRequest } from "@/lib/supabase/auth";
import { createSupabaseRequestClient } from "@/lib/supabase/request-client";
import {
  deliveryRequestParamsSchema,
  updateDeliveryRequestStatusSchema
} from "@/lib/validations/orders";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ deliveryRequestId: string }> }
) {
  try {
    const accessToken = getAccessTokenFromRequest(request);

    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized. Bearer token is required." },
        { status: 401 }
      );
    }

    const params = deliveryRequestParamsSchema.parse(await context.params);
    const payload = updateDeliveryRequestStatusSchema.parse(await request.json());
    const supabase = createSupabaseRequestClient(accessToken);
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Invalid or expired token." },
        { status: 401 }
      );
    }

    const { data: deliveryRecord, error: deliveryLookupError } = await supabase
      .from("delivery_requests")
      .select("id, user_id, pharmacy_id, order_id, status")
      .eq("id", params.deliveryRequestId)
      .single();

    if (deliveryLookupError || !deliveryRecord) {
      const status = deliveryLookupError?.code === "PGRST116" ? 404 : 500;
      return NextResponse.json(
        {
          error:
            status === 404
              ? "Delivery request not found."
              : "Failed to load delivery request.",
          details: deliveryLookupError?.message
        },
        { status }
      );
    }

    const isPatientOwner = deliveryRecord.user_id === authData.user.id;
    const { data: pharmacyRecord } = await supabase
      .from("pharmacies")
      .select("id")
      .eq("id", deliveryRecord.pharmacy_id)
      .eq("owner_user_id", authData.user.id)
      .maybeSingle();
    const isPharmacyOwner = Boolean(pharmacyRecord);

    if (!isPatientOwner && !isPharmacyOwner) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (isPatientOwner && !isPharmacyOwner && payload.status !== "cancelled") {
      return NextResponse.json(
        { error: "Patients can only cancel their own delivery requests." },
        { status: 403 }
      );
    }

    const nowIso = new Date().toISOString();
    const statusUpdate: {
      status: string;
      accepted_at?: string;
      delivered_at?: string;
    } = {
      status: payload.status
    };

    if (payload.status === "accepted") {
      statusUpdate.accepted_at = nowIso;
    }

    if (payload.status === "delivered") {
      statusUpdate.delivered_at = nowIso;
    }

    const { data, error } = await supabase
      .from("delivery_requests")
      .update(statusUpdate)
      .eq("id", params.deliveryRequestId)
      .select(
        "id, order_id, user_id, pharmacy_id, delivery_address, delivery_latitude, delivery_longitude, contact_phone, status, requested_at, accepted_at, delivered_at, created_at, updated_at"
      )
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;

      return NextResponse.json(
        {
          error:
            status === 404
              ? "Delivery request not found."
              : "Failed to update delivery request status.",
          details: error.message
        },
        { status }
      );
    }

    // When pharmacy accepts a delivery, sync order status to confirmed so patient sees progress
    if (isPharmacyOwner && payload.status === "accepted" && deliveryRecord.order_id) {
      await supabase
        .from("orders")
        .update({ status: "confirmed" })
        .eq("id", deliveryRecord.order_id)
        .eq("status", "pending");
    }

    return NextResponse.json({ deliveryRequest: data });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid delivery request status update payload.",
          issues: error.issues
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Unexpected error while updating delivery request status." },
      { status: 500 }
    );
  }
}
