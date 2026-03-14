import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getAccessTokenFromRequest } from "@/lib/supabase/auth";
import { createSupabaseRequestClient } from "@/lib/supabase/request-client";

const submitReviewSchema = {
  rating: (v: unknown) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1 || n > 5) throw new Error("Rating must be 1-5");
    return n;
  },
  comment: (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 500) : undefined),
};

export async function POST(
  request: Request,
  context: { params: Promise<{ pharmacyId: string }> }
) {
  try {
    const accessToken = getAccessTokenFromRequest(request);
    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized. Sign in to rate." },
        { status: 401 }
      );
    }

    const { pharmacyId } = await context.params;
    const body = (await request.json()) as { rating?: unknown; comment?: unknown };

    const rating = submitReviewSchema.rating(body.rating);
    const comment = submitReviewSchema.comment(body.comment);

    const supabase = createSupabaseRequestClient(accessToken);
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Invalid or expired token." },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("pharmacy_reviews")
      .upsert(
        {
          user_id: authData.user.id,
          pharmacy_id: pharmacyId,
          rating,
          comment: comment || null,
        },
        { onConflict: "user_id,pharmacy_id" }
      )
      .select("id, rating, comment, created_at")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to save review.", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ review: data });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid request." },
      { status: 400 }
    );
  }
}
