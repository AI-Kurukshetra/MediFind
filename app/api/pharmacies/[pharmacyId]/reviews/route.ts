import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getAccessTokenFromRequest } from "@/lib/supabase/auth";
import { createSupabaseRequestClient } from "@/lib/supabase/request-client";

export async function GET(
  request: Request,
  context: { params: Promise<{ pharmacyId: string }> }
) {
  try {
    const { pharmacyId } = await context.params;
    const supabase = createSupabaseRequestClient();

    const { data, error } = await supabase
      .from("pharmacy_reviews")
      .select("id, user_id, rating, comment, created_at")
      .eq("pharmacy_id", pharmacyId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json(
        { error: "Failed to load reviews.", details: error.message },
        { status: 500 }
      );
    }

    const { count } = await supabase
      .from("pharmacy_reviews")
      .select("id", { count: "exact", head: true })
      .eq("pharmacy_id", pharmacyId);

    const avgRes = await supabase
      .from("pharmacy_reviews")
      .select("rating")
      .eq("pharmacy_id", pharmacyId);

    const ratings = (avgRes.data ?? []) as { rating: number }[];
    const avgRating =
      ratings.length > 0
        ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length
        : null;

    return NextResponse.json({
      reviews: data ?? [],
      count: count ?? 0,
      averageRating: avgRating != null ? Math.round(avgRating * 10) / 10 : null,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load reviews." },
      { status: 500 }
    );
  }
}
