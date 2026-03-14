import { NextResponse } from "next/server";

import { getAccessTokenFromRequest } from "@/lib/supabase/auth";
import { createSupabaseRequestClient } from "@/lib/supabase/request-client";

export async function GET(
  request: Request,
  context: { params: Promise<{ pharmacyId: string }> }
) {
  try {
    const { pharmacyId } = await context.params;
    const accessToken = getAccessTokenFromRequest(request);

    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const supabase = createSupabaseRequestClient(accessToken);
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json({ error: "Invalid token." }, { status: 401 });
    }

    const { data: pharmacy } = await supabase
      .from("pharmacies")
      .select("id, owner_user_id")
      .eq("id", pharmacyId)
      .eq("owner_user_id", authData.user.id)
      .maybeSingle();

    if (!pharmacy) {
      return NextResponse.json({ error: "Pharmacy not found." }, { status: 404 });
    }

    const [inventoryRes, ordersRes, deliveryRes, reviewsRes] = await Promise.all([
      supabase
        .from("inventory")
        .select("id, quantity, is_available", { count: "exact", head: true })
        .eq("pharmacy_id", pharmacyId),
      supabase
        .from("orders")
        .select("id, status", { count: "exact", head: true })
        .eq("pharmacy_id", pharmacyId)
        .in("status", ["pending", "confirmed", "ready"]),
      supabase
        .from("delivery_requests")
        .select("id", { count: "exact", head: true })
        .eq("pharmacy_id", pharmacyId)
        .eq("status", "pending"),
      supabase
        .from("pharmacy_reviews")
        .select("id", { count: "exact", head: true })
        .eq("pharmacy_id", pharmacyId),
    ]);

    const totalMedicines = inventoryRes.count ?? 0;
    const activeOrders = ordersRes.count ?? 0;
    const pendingDeliveries = deliveryRes.count ?? 0;
    const reviewCount = reviewsRes.count ?? 0;

    const { count: lowStockCount } = await supabase
      .from("inventory")
      .select("id", { count: "exact", head: true })
      .eq("pharmacy_id", pharmacyId)
      .lte("quantity", 10);

    const stockAlerts = lowStockCount ?? 0;

    return NextResponse.json({
      totalMedicines,
      activeOrders,
      pendingDeliveries,
      stockAlerts,
      reviewCount,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load stats." }, { status: 500 });
  }
}
