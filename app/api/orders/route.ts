import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getAccessTokenFromRequest } from "@/lib/supabase/auth";
import { createSupabaseRequestClient } from "@/lib/supabase/request-client";
import { createOrderSchema, listOrdersQuerySchema } from "@/lib/validations/orders";

export async function GET(request: Request) {
  try {
    const accessToken = getAccessTokenFromRequest(request);

    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized. Bearer token is required." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = listOrdersQuerySchema.parse({
      orderType: searchParams.get("orderType") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined
    });

    const supabase = createSupabaseRequestClient(accessToken);
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Invalid or expired token." },
        { status: 401 }
      );
    }

    let ordersQuery = supabase
      .from("orders")
      .select(
        `
          id,
          user_id,
          pharmacy_id,
          medicine_id,
          order_type,
          quantity,
          status,
          prescription_required,
          notes,
          created_at,
          updated_at,
          medicines (
            id,
            name
          ),
          pharmacies (
            id,
            name,
            latitude,
            longitude
          ),
          delivery_requests (
            id,
            status,
            delivery_address,
            delivery_latitude,
            delivery_longitude,
            requested_at,
            accepted_at,
            delivered_at
          )
        `
      )
      .limit(query.limit ?? 100)
      .order("created_at", { ascending: false });

    if (query.orderType) {
      ordersQuery = ordersQuery.eq("order_type", query.orderType);
    }

    if (query.status) {
      ordersQuery = ordersQuery.eq("status", query.status);
    }

    const { data, error } = await ordersQuery;

    if (error) {
      return NextResponse.json(
        { error: "Failed to load orders.", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ count: data?.length ?? 0, results: data ?? [] });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid order query parameters.", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Unexpected error while loading orders." },
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

    const payload = createOrderSchema.parse(await request.json());
    const supabase = createSupabaseRequestClient(accessToken);
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Invalid or expired token." },
        { status: 401 }
      );
    }

    const orderInsert = {
      user_id: authData.user.id,
      pharmacy_id: payload.pharmacyId,
      medicine_id: payload.medicineId,
      order_type: payload.orderType,
      quantity: payload.quantity,
      status: "pending",
      prescription_required: payload.prescriptionRequired ?? false,
      notes: payload.notes ?? null
    };

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert(orderInsert)
      .select(
        "id, user_id, pharmacy_id, medicine_id, order_type, quantity, status, prescription_required, notes, created_at, updated_at"
      )
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Failed to create order.", details: orderError?.message },
        { status: 500 }
      );
    }

    if (payload.orderType !== "delivery") {
      return NextResponse.json({ order }, { status: 201 });
    }

    const { data: deliveryRequest, error: deliveryError } = await supabase
      .from("delivery_requests")
      .insert({
        order_id: order.id,
        user_id: authData.user.id,
        pharmacy_id: payload.pharmacyId,
        delivery_address: payload.deliveryAddress,
        delivery_latitude: payload.deliveryLatitude ?? null,
        delivery_longitude: payload.deliveryLongitude ?? null,
        contact_phone: payload.contactPhone ?? null,
        status: "pending"
      })
      .select(
        "id, order_id, user_id, pharmacy_id, delivery_address, delivery_latitude, delivery_longitude, contact_phone, status, requested_at, accepted_at, delivered_at, created_at, updated_at"
      )
      .single();

    if (deliveryError || !deliveryRequest) {
      // Cleanup without delete policy: mark order cancelled if delivery detail creation fails.
      await supabase
        .from("orders")
        .update({
          status: "cancelled",
          notes: "Auto-cancelled: failed to create delivery request."
        })
        .eq("id", order.id);

      return NextResponse.json(
        {
          error: "Failed to create delivery request.",
          details: deliveryError?.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ order, deliveryRequest }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid order payload.", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Unexpected error while creating order." },
      { status: 500 }
    );
  }
}
