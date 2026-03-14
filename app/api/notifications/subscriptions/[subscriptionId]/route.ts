import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getAccessTokenFromRequest } from "@/lib/supabase/auth";
import { createSupabaseRequestClient } from "@/lib/supabase/request-client";
import { subscriptionParamsSchema } from "@/lib/validations/notifications";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ subscriptionId: string }> }
) {
  try {
    const accessToken = getAccessTokenFromRequest(request);

    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized. Bearer token is required." },
        { status: 401 }
      );
    }

    const params = subscriptionParamsSchema.parse(await context.params);
    const supabase = createSupabaseRequestClient(accessToken);
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Invalid or expired token." },
        { status: 401 }
      );
    }

    const { error } = await supabase
      .from("stock_alert_subscriptions")
      .delete()
      .eq("id", params.subscriptionId);

    if (error) {
      return NextResponse.json(
        { error: "Failed to delete stock alert subscription.", details: error.message },
        { status: 500 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid stock alert subscription parameters.", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Unexpected error while deleting stock alert subscription." },
      { status: 500 }
    );
  }
}
